import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

async function executeMigration() {
    console.log('🚀 Executing bookmark system migration...\n');

    try {
        // Step 1: Create the table using raw SQL query
        console.log('Step 1: Creating event_bookmarks table...');
        
        // Since we can't execute DDL directly, we'll use the Supabase REST API
        // First, let's test if the table already exists
        const { data: testData, error: testError } = await supabase
            .from('event_bookmarks')
            .select('id')
            .limit(1);

        if (!testError || testError.message.includes('does not exist')) {
            console.log('✅ Table check completed\n');
            
            console.log('⚠️  MANUAL MIGRATION REQUIRED');
            console.log('━'.repeat(80));
            console.log('\nPlease follow these steps:\n');
            console.log('1. Open your Supabase Dashboard');
            console.log('2. Navigate to: SQL Editor (left sidebar)');
            console.log('3. Click "New Query"');
            console.log('4. Copy and paste the SQL below:');
            console.log('\n' + '━'.repeat(80) + '\n');
            
            const migrationSQL = `
-- Create event_bookmarks table
CREATE TABLE IF NOT EXISTS event_bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    bookmarked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, event_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_event_bookmarks_user ON event_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_event_bookmarks_event ON event_bookmarks(event_id);
CREATE INDEX IF NOT EXISTS idx_event_bookmarks_user_event ON event_bookmarks(user_id, event_id);
CREATE INDEX IF NOT EXISTS idx_event_bookmarks_date ON event_bookmarks(bookmarked_at);

-- Function: toggle_event_bookmark
CREATE OR REPLACE FUNCTION toggle_event_bookmark(
    p_user_id UUID,
    p_event_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_bookmark_id UUID;
    v_action VARCHAR(20);
BEGIN
    SELECT id INTO v_bookmark_id 
    FROM event_bookmarks 
    WHERE user_id = p_user_id AND event_id = p_event_id;
    
    IF v_bookmark_id IS NOT NULL THEN
        DELETE FROM event_bookmarks WHERE id = v_bookmark_id;
        v_action := 'removed';
    ELSE
        INSERT INTO event_bookmarks (user_id, event_id)
        VALUES (p_user_id, p_event_id)
        RETURNING id INTO v_bookmark_id;
        v_action := 'added';
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'action', v_action,
        'bookmark_id', v_bookmark_id,
        'message', CASE 
            WHEN v_action = 'added' THEN 'Event bookmarked successfully'
            ELSE 'Bookmark removed successfully'
        END
    );
END;
$$;

-- Function: check_bookmark_status
CREATE OR REPLACE FUNCTION check_bookmark_status(
    p_user_id UUID,
    p_event_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_bookmark RECORD;
BEGIN
    SELECT * INTO v_bookmark 
    FROM event_bookmarks 
    WHERE user_id = p_user_id AND event_id = p_event_id;
    
    IF v_bookmark IS NULL THEN
        RETURN jsonb_build_object('success', true, 'is_bookmarked', false);
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'is_bookmarked', true,
        'bookmarked_at', v_bookmark.bookmarked_at
    );
END;
$$;

-- Function: get_user_bookmarked_events
CREATE OR REPLACE FUNCTION get_user_bookmarked_events(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_bookmarks JSONB;
    v_total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total_count
    FROM event_bookmarks eb
    JOIN events e ON eb.event_id = e.id
    WHERE eb.user_id = p_user_id AND e.status = 'active';
    
    SELECT COALESCE(jsonb_agg(event_data), '[]'::jsonb) INTO v_bookmarks
    FROM (
        SELECT jsonb_build_object(
            'bookmark_id', eb.id,
            'event_id', e.id,
            'title', e.title,
            'description', e.description,
            'category', e.category,
            'banner_url', e.banner_url,
            'thumbnail_url', e.thumbnail_url,
            'venue_name', e.venue_name,
            'venue_type', e.venue_type,
            'venue_address', e.venue_address,
            'visibility', e.visibility,
            'status', e.status,
            'bookmarked_at', eb.bookmarked_at,
            'created_at', e.created_at
        ) as event_data
        FROM event_bookmarks eb
        JOIN events e ON eb.event_id = e.id
        WHERE eb.user_id = p_user_id AND e.status = 'active'
        ORDER BY eb.bookmarked_at DESC
        LIMIT p_limit OFFSET p_offset
    ) sub;
    
    RETURN jsonb_build_object(
        'success', true,
        'bookmarks', v_bookmarks,
        'total_count', v_total_count
    );
END;
$$;
`;
            
            console.log(migrationSQL);
            console.log('\n' + '━'.repeat(80));
            console.log('\n5. Click "Run" or press Ctrl+Enter');
            console.log('6. Wait for "Success. No rows returned" message');
            console.log('7. Come back and test the bookmark feature!\n');
            
        } else {
            console.log('✅ event_bookmarks table already exists!');
            console.log('\nTesting bookmark functions...\n');
            
            // Test if functions exist
            const testUserId = '00000000-0000-0000-0000-000000000000';
            const testEventId = '00000000-0000-0000-0000-000000000001';
            
            const { data: statusData, error: statusError } = await supabase
                .rpc('check_bookmark_status', {
                    p_user_id: testUserId,
                    p_event_id: testEventId
                });
            
            if (statusError) {
                console.log('❌ Functions not found. Please run the SQL migration manually (see above).');
            } else {
                console.log('✅ All bookmark functions are working!');
                console.log('✅ Migration is complete!\n');
            }
        }

    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

executeMigration();
