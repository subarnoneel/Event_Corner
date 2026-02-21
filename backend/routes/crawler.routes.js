import express from 'express';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const AI_SERVER_URL = 'http://localhost:5001';

/**
 * POST /api/crawler/crawl-and-draft
 * Crawl a URL, generate descriptions, and save events as drafts
 * Body: { url: string, user_id: string }
 */
router.post('/crawl-and-draft', async (req, res) => {
    try {
        const { url, user_id } = req.body;

        if (!url || !user_id) {
            return res.status(400).json({
                success: false,
                error: 'URL and user_id are required'
            });
        }

        // 1. Crawl the website via AI Server
        console.log(`🕷️ Crawling ${url}...`);
        try {
            const crawlResponse = await axios.post(`${AI_SERVER_URL}/crawl`, { url });
            const events = crawlResponse.data?.data?.events || [];

            if (events.length === 0) {
                return res.json({ success: true, message: 'No events found.', count: 0 });
            }

            console.log(`✅ Found ${events.length} events. Processing...`);
            let savedCount = 0;
            const savedEvents = [];

            // 2. Process each event
            for (const event of events) {
                // Check if already exists? (Optional, skip for MVP)

                // 3. Generate better description using AI
                let description = event.description || event.title;
                try {
                    const aiPrompt = `Write a short, engaging description (approx 2-3 sentences) for a coding contest titled "${event.title}" on ${event.platform}. Duration: ${event.duration}. It starts at ${event.start_time}. Emphasize it's a great opportunity for students.`;

                    const chatResponse = await axios.post(`${AI_SERVER_URL}/chat`, {
                        message: aiPrompt
                    });

                    if (chatResponse.data?.response) {
                        description = chatResponse.data.response;
                    }
                } catch (aiErr) {
                    console.error("AI Description generation failed, using default:", aiErr.message);
                }



                // Wait, using raw insert on 'events' won't add timeslot. 
                // Better to use the RPC 'create_event_with_timeslots' via Supabase if possible, 
                // OR manually insert event then timeslot.

                // Let's use raw insert for 'events' first (schema has no start_time column in events table? let me recheck)
                // Schema check (Step 153):
                // events table columns: id, title, description, category... created_at, updated_at...
                // It DOES NOT have start_time.
                // event_timeslots table HAS start_time.

                // So we must insert into events, get ID, then insert into event_timeslots.

                // Insert Event
                const { data: newEvent, error: insertError } = await supabase
                    .from('events')
                    .insert({
                        title: event.title,
                        description: description,
                        category: 'competition',
                        venue_type: 'online',
                        venue_name: event.platform,
                        status: 'draft',
                        visibility: 'public',
                        created_by: user_id,
                        website_url: event.url,
                        additional_info: { crawled_from: url, platform: event.platform }
                    })
                    .select()
                    .single();

                if (insertError) {
                    console.error(`Failed to save event ${event.title}:`, insertError);
                    continue;
                }

                // Insert Timeslot
                if (newEvent) {
                    try {
                        // Calculate end time
                        // start_time is string "2025-02-26 14:30:00"
                        const startDate = new Date(event.start_time);

                        // Validate date
                        if (isNaN(startDate.getTime())) {
                            console.error(`Invalid start_time for event ${event.title}: ${event.start_time}`);
                            // Optional: Delete the event if time is invalid so we don't have broken drafts?
                            // Or set a default future date?
                            // Let's set it to tomorrow noon to be safe and let user edit it.
                            const fallbackDate = new Date();
                            fallbackDate.setDate(fallbackDate.getDate() + 1);
                            fallbackDate.setHours(12, 0, 0, 0);
                            console.log(`Using fallback date: ${fallbackDate.toISOString()}`);

                            // Update startDate to fallback
                            startDate.setTime(fallbackDate.getTime());
                        }

                        // Duration "2h 30m" -> parse or default 2h
                        let durationMs = 2 * 60 * 60 * 1000; // Default 2h
                        // Simple parser for crawler duration format if needed, but for now default is safe
                        const endDate = new Date(startDate.getTime() + durationMs);

                        const { error: timeslotError } = await supabase
                            .from('event_timeslots')
                            .insert({
                                event_id: newEvent.id,
                                title: 'Main Contest',
                                start_time: startDate.toISOString(),
                                end_time: endDate.toISOString()
                            });

                        if (!timeslotError) {
                            savedCount++;
                            // Add to list for frontend display
                            savedEvents.push(newEvent);
                        } else {
                            console.error('Timeslot insert error:', timeslotError);
                        }
                    } catch (dateErr) {
                        console.error(`Date processing error for event ${event.title}:`, dateErr);
                        // Don't crash the loop
                    }
                }
            }

            return res.json({
                success: true,
                message: `Successfully drafted ${savedCount} events.`,
                count: savedCount,
                events: savedEvents
            });

        } catch (crawlErr) {
            console.error("Crawl failed:", crawlErr.response?.data || crawlErr.message);
            return res.status(500).json({
                success: false,
                error: 'Failed to crawl website. Ensure AI server is running.'
            });
        }

    } catch (err) {
        console.error('Crawler route error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

/**
 * POST /api/crawler/bulk-crawl
 * Crawl all saved sources for a user
 * Body: { user_id: string, limit: number }
 */
router.post('/bulk-crawl', async (req, res) => {
    try {
        const { user_id, limit = 2 } = req.body;

        if (!user_id) {
            return res.status(400).json({ success: false, error: 'User ID is required' });
        }

        // 1. Fetch sources
        const { data: sources, error: sourceError } = await supabase
            .from('crawler_sources')
            .select('url')
            .eq('created_by', user_id);

        if (sourceError || !sources || sources.length === 0) {
            return res.json({ success: true, message: 'No sources found to crawl.', count: 0 });
        }

        let totalSaved = 0;
        const results = [];

        // 2. Iterate and Crawl
        for (const source of sources) {
            const url = source.url;
            console.log(`📦 Bulk processing: ${url}`);

            try {
                // Call AI Server directly
                const crawlResponse = await axios.post(`${AI_SERVER_URL}/crawl`, { url });
                let events = crawlResponse.data?.data?.events || [];

                // 3. Apply Limit
                if (events.length > limit) {
                    events = events.slice(0, limit);
                }

                // 4. Save events (Simplified version of crawl-and-draft logic)
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
                            created_by: user_id,
                            website_url: event.url || url,
                            additional_info: { crawled_from: url, platform: event.platform }
                        })
                        .select()
                        .single();

                    if (!insertError && newEvent) {
                        // Insert Timeslot
                        try {
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

        res.json({
            success: true,
            message: `Bulk crawl complete. Processed ${sources.length} sources, saved ${totalSaved} events.`,
            results
        });

    } catch (err) {
        console.error('Bulk crawl error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

router.get('/drafts/:user_id', async (req, res) => {
    try {
        const { user_id } = req.params;

        if (!user_id) {
            return res.status(400).json({ success: false, error: 'User ID is required' });
        }

        const { data, error } = await supabase
            .from('events')
            .select('*')
            .eq('created_by', user_id)
            .eq('status', 'draft')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching drafts:', error);
            return res.status(500).json({ success: false, error: error.message });
        }

        return res.json({ success: true, events: data });
    } catch (err) {
        console.error('Drafts fetch error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

/**
 * ============================================================================
 * CRAWLER SOURCES MANAGEMENT
 * ============================================================================
 */

/**
 * GET /api/crawler/sources/:user_id
 * Get all saved crawler sources for a user
 */
router.get('/sources/:user_id', async (req, res) => {
    try {
        const { user_id } = req.params;
        const { data, error } = await supabase
            .from('crawler_sources')
            .select('*')
            .eq('created_by', user_id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ success: true, sources: data });
    } catch (err) {
        console.error('Error fetching sources:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * POST /api/crawler/sources
 * Add a new crawler source
 */
router.post('/sources', async (req, res) => {
    try {
        const { url, name, user_id } = req.body;
        if (!url || !user_id) {
            return res.status(400).json({ success: false, error: 'URL and User ID are required' });
        }

        const { data, error } = await supabase
            .from('crawler_sources')
            .insert({ url, name, created_by: user_id })
            .select()
            .single();

        if (error) throw error;
        res.json({ success: true, source: data });
    } catch (err) {
        console.error('Error adding source:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * DELETE /api/crawler/sources/:id
 * Delete a crawler source
 */
router.delete('/sources/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('crawler_sources')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting source:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
