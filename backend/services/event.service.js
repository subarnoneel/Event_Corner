import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

/**
 * Check for events that have passed their deadline and mark them as completed.
 * An event is considered completed if ALL its timeslots have ended.
 */
export const checkEventDeadlines = async () => {
    console.log('⏳ Checking for expired events...');
    try {
        // 1. Fetch all active events with their timeslots
        // We only care about events that are currently 'active'
        const { data: activeEvents, error: fetchError } = await supabase
            .from('events')
            .select(`
                id,
                title,
                event_timeslots (
                    end_time
                )
            `)
            .eq('status', 'active');

        if (fetchError) {
            console.error('Error fetching active events:', fetchError);
            return;
        }

        if (!activeEvents || activeEvents.length === 0) {
            console.log('No active events found to check.');
            return;
        }

        console.log(`Checking ${activeEvents.length} active events...`);

        const now = new Date();
        const expiredEventIds = [];

        // 2. Identify expired events
        for (const event of activeEvents) {
            const timeslots = event.event_timeslots || [];

            // If an event has no timeslots, should we expire it? 
            // Maybe safer to leave it or check 'created_at'. 
            // For now, let's assume valid events have timeslots.
            if (timeslots.length === 0) continue;

            // Check if ANY timeslot is still in the future
            const hasFutureTimeslot = timeslots.some(slot => {
                const endTime = new Date(slot.end_time);
                return endTime > now;
            });

            // If NO future timeslots, it's expired
            if (!hasFutureTimeslot) {
                console.log(`Event expired: "${event.title}" (ID: ${event.id})`);
                expiredEventIds.push(event.id);
            }
        }

        // 3. Update status to 'completed'
        if (expiredEventIds.length > 0) {
            const { error: updateError } = await supabase
                .from('events')
                .update({ status: 'completed' })
                .in('id', expiredEventIds);

            if (updateError) {
                console.error('Failed to archive events:', updateError);
            } else {
                console.log(`✅ Archived ${expiredEventIds.length} expired events.`);
            }
        } else {
            console.log('No events to archive.');
        }

    } catch (err) {
        console.error('Deadline check failed:', err);
    }
};
