
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootEnvPath = path.resolve(__dirname, '..', '.env');
dotenv.config({ path: rootEnvPath });

const key = process.env.SUPABASE_KEY;
if (!key) {
    console.error('No SUPABASE_KEY found');
    process.exit(1);
}

const parts = key.split('.');
if (parts.length !== 3) {
    console.error('Invalid JWT format');
    process.exit(1);
}

const payload = parts[1];
const decodedString = Buffer.from(payload, 'base64').toString('utf-8');
const decodedJson = JSON.parse(decodedString);
console.log('Decoded Payload:', JSON.stringify(decodedJson, null, 2));
