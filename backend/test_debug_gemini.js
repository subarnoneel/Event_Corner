
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GOOGLE_API_KEY;

console.log('🔑 API Key Loaded:', apiKey ? `Yes (starts with ${apiKey.substring(0, 5)}...)` : 'NO');
console.log('🔑 API Key Length:', apiKey ? apiKey.length : 0);

if (!apiKey) process.exit(1);

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

async function test() {
    console.log('🚀 Sending request to Gemini...');
    try {
        const result = await model.generateContent("Hello, are you working?");
        const response = await result.response;
        console.log('✅ Response:', response.text());
    } catch (error) {
        console.error('❌ Error Details:');
        console.error('Status:', error.status);
        console.error('StatusText:', error.statusText);
        console.error('Message:', error.message);
        if (error.response) {
            console.error('Response Body:', JSON.stringify(error.response, null, 2));
        }
    }
}

test();
