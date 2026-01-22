
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Force load from root .env
const rootEnvPath = path.resolve(__dirname, '..', '.env');
console.log('Loading .env from:', rootEnvPath);
dotenv.config({ path: rootEnvPath });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

console.log(`Using URL: '${supabaseUrl}'`);
console.log(`Using Key: '${supabaseKey ? supabaseKey.substring(0, 10) + '...' : 'Missing'}'`);

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing credentials');
    process.exit(1);
}

async function listTables() {
    try {
        const url = `${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`;
        const response = await fetch(url);

        if (!response.ok) {
            console.error('Failed to fetch schema:', response.status, response.statusText);
            const text = await response.text();
            console.error('Response:', text);
            return;
        }

        const json = await response.json();
        // PostgREST returns Swagger 2.0. definitions contains the tables.
        const definitions = json.definitions || {};
        const tables = Object.keys(definitions);

        console.log('\n--- Database Tables ---');
        tables.forEach(t => console.log(`- ${t}`));
        console.log('-----------------------');

    } catch (err) {
        console.error('Error fetching tables:', err);
    }
}

listTables();
