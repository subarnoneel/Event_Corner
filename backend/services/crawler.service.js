import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const AI_SERVER_URL = 'http://localhost:5001';

import { extractEventFromHtml } from './gemini.service.js';

/**
 * Perform bulk crawl for a specific user
 * @param {string} userId - The ID of the user to crawl for
 * @param {number} limit - Max events to crawl per source
 * @returns {Promise<Object>} - Result summary
 */
export const performBulkCrawl = async (userId, limit = 2) => {
    try {
        if (!userId) {
            throw new Error('User ID is required');
        }

        // 1. Fetch sources
        const { data: sources, error: sourceError } = await supabase
            .from('crawler_sources')
            .select('url')
            .eq('created_by', userId);

        if (sourceError || !sources || sources.length === 0) {
            return { success: true, message: 'No sources found to crawl.', count: 0, results: [] };
        }

        let totalSaved = 0;
        const results = [];
        const extractionMethod = process.env.EXTRACTION_METHOD || 'LOCAL'; // 'LOCAL' or 'GOOGLE_API'

        // 2. Iterate and Crawl
        for (const source of sources) {
            const url = source.url;
            console.log(`📦 Bulk processing: ${url} (Method: ${extractionMethod})`);

            try {
                let events = [];

                if (extractionMethod === 'GOOGLE_API') {
                    // Method A: Google Gemini API
                    console.log(`✨ Using Gemini API for: ${url}`);

                    // Step 1: Fetch raw HTML from Python server (it handles anti-bot better)
                    const htmlResponse = await axios.post(`${AI_SERVER_URL}/fetch-html`, { url });
                    const htmlContent = htmlResponse.data?.html;

                    if (htmlContent) {
                        // Step 2: Extract using Gemini
                        const eventData = await extractEventFromHtml(htmlContent, url);
                        if (eventData) {
                            events = [eventData]; // Gemini extracts one main event per prompt usually
                        }
                    } else {
                        console.warn(`HTML fetch failed for ${url}`);
                    }
                } else {
                    // Method B: Local Python Model (Default)
                    const crawlResponse = await axios.post(`${AI_SERVER_URL}/crawl`, { url });
                    events = crawlResponse.data?.data?.events || [];
                }

                // 3. Apply Limit
                if (events.length > limit) {
                    events = events.slice(0, limit);
                }

                // 4. Save events
                let savedForSource = 0;
                for (const event of events) {
                    // Basic check if title exists to avoid junk
                    if (!event.title) continue;

                    // Description generation
                    let description = event.description || event.title;
                    try {
                        const aiPrompt = `Write a short description for event "${event.title}".`;
                        const chatResponse = await axios.post(`${AI_SERVER_URL}/chat`, { message: aiPrompt });
                        if (chatResponse.data?.response) description = chatResponse.data.response;
                    } catch (e) {
                        // Ignore AI error
                    }

                    // Insert Event
                    const { data: newEvent, error: insertError } = await supabase
                        .from('events')
                        .insert({
                            title: event.title,
                            description: description,
                            category: 'competition',
                            venue_type: 'online',
                            venue_name: event.platform || 'Online',
                            status: 'draft',
                            created_by: userId,
                            website_url: event.url || url,
                            additional_info: { crawled_from: url, platform: event.platform }
                        })
                        .select()
                        .single();

                    if (!insertError && newEvent) {
                        // Insert Timeslot
                        try {
                            // Fix date parsing if needed
                            // For simplicity, reusing logic from original route
                            const startDate = new Date(event.start_time);
                            // Validate date
                            if (isNaN(startDate.getTime())) {
                                // Fallback to tomorrow noon
                                const fallbackDate = new Date();
                                fallbackDate.setDate(fallbackDate.getDate() + 1);
                                fallbackDate.setHours(12, 0, 0, 0);
                                startDate.setTime(fallbackDate.getTime());
                            }

                            const endDate = new Date(startDate.getTime() + (2 * 60 * 60 * 1000)); // +2h

                            await supabase.from('event_timeslots').insert({
                                event_id: newEvent.id,
                                title: event.title,
                                start_time: startDate.toISOString(),
                                end_time: endDate.toISOString()
                            });
                            savedForSource++;
                            totalSaved++;
                        } catch (tsErr) {
                            console.error('Timeslot error:', tsErr);
                        }
                    }
                }
                results.push({ url, found: events.length, saved: savedForSource });

            } catch (err) {
                console.error(`Failed to crawl ${url}:`, err.message);
                results.push({ url, error: err.message });
            }
        }

        return {
            success: true,
            message: `Bulk crawl complete. Processed ${sources.length} sources, saved ${totalSaved} events.`,
            count: totalSaved,
            results
        };

    } catch (err) {
        console.error('Bulk crawl service error:', err);
        throw err;
    }
};

/**
 * Perform system-wide bulk crawl for ALL users who have sources
 */
export const performSystemWideBulkCrawl = async () => {
    console.log('🚀 Starting System-Wide Bulk Crawl...');
    try {
        // Get all unique users who have sources
        // Note: supabase .select('created_by') with distinct might work, 
        // but let's just fetch all sources and group by user in JS for simplicity or use specific query if large

        const { data: sources, error } = await supabase
            .from('crawler_sources')
            .select('created_by');

        if (error) throw error;

        if (!sources || sources.length === 0) {
            console.log('No sources found in system.');
            return;
        }

        // Get unique user IDs
        const uniqueUserIds = [...new Set(sources.map(s => s.created_by))];
        console.log(`Found ${uniqueUserIds.length} users with crawler sources.`);

        for (const userId of uniqueUserIds) {
            console.log(`Processing for user ${userId}...`);
            try {
                await performBulkCrawl(userId, 5); // Default limit 5 for auto-crawl
            } catch (crawlErr) {
                console.error(`Error crawling for user ${userId}:`, crawlErr.message);
            }
        }

        console.log('✅ System-Wide Bulk Crawl Completed.');

    } catch (err) {
        console.error('System-wide crawl failed:', err);
    }
};
