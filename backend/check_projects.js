
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootEnvPath = path.resolve(__dirname, '..', '.env');
dotenv.config({ path: rootEnvPath });

const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
    console.error('No SUPABASE_ACCESS_TOKEN found');
    process.exit(1);
}

async function listProjects() {
    try {
        const response = await fetch('https://api.supabase.com/v1/projects', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            console.error('Failed to list projects:', response.status, response.statusText);
            const text = await response.text();
            console.error(text);
            return;
        }

        const projects = await response.json();
        console.log('Projects found:', projects.length);
        projects.forEach(p => {
            console.log(`- ID: ${p.id}`);
            console.log(`  Name: ${p.name}`);
            console.log(`  Status: ${p.status}`);
            console.log(`  Ref: ${p.ref}`); // "ref" is typically the subdomain
            // Construct expected URL
            const expectedUrl = `https://${p.ref}.supabase.co`;
            console.log(`  Expected URL: ${expectedUrl}`);
        });
    } catch (err) {
        console.error('Error fetching projects:', err);
    }
}

listProjects();
