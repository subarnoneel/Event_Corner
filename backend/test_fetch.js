
import axios from 'axios';

async function testFetch() {
    try {
        const response = await axios.post('http://localhost:5001/fetch-html', {
            url: 'https://allevents.in/dhaka'
        });
        console.log('✅ Fetch Success! Length:', response.data.html.length);
    } catch (error) {
        console.error('❌ Fetch Error:', error.response ? error.response.data : error.message);
    }
}

testFetch();
