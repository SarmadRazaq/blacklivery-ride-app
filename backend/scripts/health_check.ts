import axios from 'axios';

const API_URL = 'http://localhost:5000/api/v1';

async function checkHealth() {
    try {
        console.log('Checking Backend Health...');
        const res = await axios.get('http://localhost:5000/health');
        console.log('✅ Health Check Passed:', res.data);
    } catch (error: any) {
        console.error('❌ Health Check Failed:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

checkHealth();
