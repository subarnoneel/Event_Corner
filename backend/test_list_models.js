
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GOOGLE_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
    console.log('📋 Listing Available Models...');
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        // Note: The SDK doesn't have a direct 'listModels' method exposed easily in all versions, 
        // but let's try a direct REST call if SDK is obscure, or just try to instantiate.
        // Actually, the best way to "list" is raw REST.

        console.log('...Switching to REST for listing...');
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.models) {
            console.log('✅ Available Models:');
            const geminiModels = data.models.filter(m => m.name.includes('gemini'));
            console.log('✅ Gemini Models Found:', geminiModels.length);
            geminiModels.forEach(m => console.log(` - ${m.name}`));
        } else {
            console.log('❌ No models found or Error:', JSON.stringify(data, null, 2));
        }
    } catch (error) {
        console.error('❌ Error listing models:', error.message);
    }
}

listModels();
