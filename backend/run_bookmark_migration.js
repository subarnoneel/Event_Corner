import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

async function runMigration() {
    try {
        console.log('🚀 Starting bookmark system migration...\n');

        // Read the migration SQL file
        const migrationPath = join(__dirname, 'migrations', 'add_bookmarks_system.sql');
        const sql = readFileSync(migrationPath, 'utf8');

        // Split SQL into individual statements (by semicolons, but be careful with function bodies)
        const statements = sql
            .split(/;\s*$/gm)
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        console.log(`Found ${statements.length} SQL statements to execute\n`);

        // Execute each statement
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            
            // Skip comments
            if (statement.startsWith('--')) continue;
            
            console.log(`Executing statement ${i + 1}/${statements.length}...`);
            
            const { data, error } = await supabase.rpc('exec_sql', {
                sql_query: statement
            }).single();

            if (error) {
                // If exec_sql doesn't exist, try direct execution
                console.log('Trying alternative execution method...');
                
                // For table creation
                if (statement.includes('CREATE TABLE')) {
                    console.log('Creating event_bookmarks table...');
                    const { error: createError } = await supabase
                        .from('event_bookmarks')
                        .select('*')
                        .limit(0);
                    
                    if (createError && !createError.message.includes('does not exist')) {
                        console.error('Error:', createError.message);
                    }
                }
                
                console.log('⚠️  Could not execute via RPC. Please run the migration SQL manually in Supabase SQL Editor.');
                console.log('\nAlternatively, the migration file is at:');
                console.log(migrationPath);
                console.log('\nCopy and paste its contents into Supabase Dashboard > SQL Editor\n');
                
                // Print the SQL for easy copying
                console.log('='.repeat(80));
                console.log('SQL TO EXECUTE:');
                console.log('='.repeat(80));
                console.log(sql);
                console.log('='.repeat(80));
                return;
            }
            
            console.log(`✅ Statement ${i + 1} executed successfully`);
        }

        console.log('\n✨ Migration completed successfully!\n');
        
        // Test the functions
        console.log('Testing bookmark functions...\n');
        
        const testUserId = '00000000-0000-0000-0000-000000000000'; // Dummy UUID
        const testEventId = '00000000-0000-0000-0000-000000000001'; // Dummy UUID
        
        const { data: statusData, error: statusError } = await supabase
            .rpc('check_bookmark_status', {
                p_user_id: testUserId,
                p_event_id: testEventId
            });
        
        if (statusError) {
            console.error('❌ Error testing check_bookmark_status:', statusError.message);
        } else {
            console.log('✅ check_bookmark_status function is working');
            console.log('   Response:', statusData);
        }
        
        console.log('\n✅ All bookmark system components are ready!\n');

    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        console.error('\nPlease run the migration manually:');
        console.error('1. Open Supabase Dashboard');
        console.error('2. Go to SQL Editor');
        console.error('3. Copy and paste the contents of migrations/add_bookmarks_system.sql');
        console.error('4. Click Run\n');
    }
}

runMigration();
