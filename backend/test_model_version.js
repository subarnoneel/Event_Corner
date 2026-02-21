
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GOOGLE_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

async function checkModelVersion() {
    console.log('🕵️ Checking Model Metadata...');
    try {
        const result = await model.generateContent("What specific model version are you? (e.g. 1.5 Flash, 1.0 Pro)");
        const response = await result.response;

        console.log('📝 Response Text:', response.text());
        console.log('ℹ️  Response Metadata:', JSON.stringify(response.usageMetadata, null, 2));

        // Sometimes the model version is in the headers if we access raw response, 
        // but the SDK hides headers. We can infer from capabilities or just trust the alias.

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkModelVersion();
