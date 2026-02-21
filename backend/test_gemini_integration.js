
import { extractEventFromHtml } from './services/gemini.service.js';

// Mock HTML for testing
const mockHtml = `
<!DOCTYPE html>
<html>
<head><title>Test Event</title></head>
<body>
    <h1>Annual Coding Hackathon</h1>
    <p>Join us on October 25th, 2025 for a 24-hour hackathon.</p>
    <p>Venue: Online (Discord)</p>
    <p>Prizes: $5000</p>
</body>
</html>
`;

async function testGemini() {
    console.log('🧪 Testing Gemini Service...');
    try {
        const result = await extractEventFromHtml(mockHtml, 'http://test.com');
        console.log('✅ Extraction Success!');
        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('❌ Extraction Failed:', error.message);
    }
}

testGemini();
