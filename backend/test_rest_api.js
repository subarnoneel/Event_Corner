
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GOOGLE_API_KEY;
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;

async function testRest() {
    console.log('🚀 Sending REST request...');
    try {
        const response = await axios.post(url, {
            contents: [{
                parts: [{ text: "Hello" }]
            }]
        });
        console.log('✅ Success:', response.data);
    } catch (error) {
        console.error('❌ Error:', error.response ? error.response.data : error.message);
        console.error('Status:', error.response ? error.response.status : 'N/A');
    }
}

testRest();
