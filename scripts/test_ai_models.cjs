const axios = require('axios');
const fs = require('fs');

const BACKEND_URL = 'http://127.0.0.1:3000/api';
const TEST_EMAIL = `test_${Date.now()}@example.com`;
const TEST_PASS = 'TestPass123!';

async function runTests() {
    console.log('🚀 Starting AI Model Diagnostic...');

    let token = '';
    try {
        console.log('👤 Registering/Logging in test user...');
        await axios.post(`${BACKEND_URL}/auth/register`, {
            email: TEST_EMAIL,
            password: TEST_PASS,
            username: `tester${Math.floor(Math.random() * 1000)}`
        });

        const loginRes = await axios.post(`${BACKEND_URL}/auth/login`, {
            email: TEST_EMAIL,
            password: TEST_PASS
        });
        token = loginRes.data.token;
        console.log('✅ Auth successful.');
    } catch (err) {
        console.error('❌ Auth failed:', err.response?.data || err.message);
        process.exit(1);
    }

    const authHeaders = { Authorization: `Bearer ${token}` };

    try {
        console.log('📦 Fetching active models from backend...');
        const modelsRes = await axios.get(`${BACKEND_URL}/ai/models`, { headers: authHeaders });
        const models = modelsRes.data;
        console.log(`✅ Loaded ${models.length} models to test.\n`);

        const results = [];

        // Test in parallel with limit to stay safe with rate limits
        const limit = 3;
        for (let i = 0; i < models.length; i += limit) {
            const chunk = models.slice(i, i + limit);
            const promises = chunk.map(async (model) => {
                const startTime = Date.now();
                const modelId = model.id || model;
                try {
                    const chatRes = await axios.post(`${BACKEND_URL}/ai/chat`, {
                        message: "Say 'OK'",
                        model: modelId,
                        history: []
                    }, { headers: authHeaders, timeout: 30000 });

                    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
                    console.log(`✔️  ${modelId.padEnd(60)} | SUCCESS | ${duration}s`);
                    return { id: modelId, status: 'WORKING', time: duration };
                } catch (err) {
                    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
                    const errMsg = err.response?.data?.error || err.message;
                    console.error(`❌ ${modelId.padEnd(60)} | FAILED  | ${duration}s | ${errMsg.substring(0, 50)}`);
                    return { id: modelId, status: 'FAILED', error: errMsg };
                }
            });

            results.push(...(await Promise.all(promises)));
        }

        const working = results.filter(r => r.status === 'WORKING').length;
        const failed = results.filter(r => r.status === 'FAILED').length;

        console.log('\n' + '='.repeat(80));
        console.log(`📊 FINAL REPORT:`);
        console.log(`✅ Working: ${working}`);
        console.log(`❌ Failed:  ${failed}`);
        console.log(`Total:     ${results.length}`);
        console.log('='.repeat(80));

    } catch (err) {
        console.error('❌ Diagnostic error:', err.message);
    }
}

runTests();
