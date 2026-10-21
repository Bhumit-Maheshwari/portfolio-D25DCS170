
const http = require('http');

function request(options, data = null) {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => (body += chunk));
            res.on('end', () => {
                const totalTime = Date.now() - start;
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    body: body ? JSON.parse(body) : null,
                    totalTime,
                    serverTime: res.headers['x-response-time'],
                    cacheHeader: res.headers['x-cache'],
                });
            });
        });
        req.on('error', reject);
        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function runBenchmark() {
    console.log('=== Practical 9: Caching & Query Optimization Benchmark ===\n');

    // 1. Register or Login test user
    const username = `benchmarkUser_${Date.now()}`;
    const userPayload = {
        username: username,
        email: `${username}@example.com`,
        password: 'password123',
    };

    console.log('Registering test user...');
    let authRes = await request(
        {
            hostname: 'localhost',
            port: 5000,
            path: '/auth/register',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        },
        userPayload
    );

    const token = authRes.body.token;
    console.log(`Authenticated with JWT token. User ID: ${authRes.body.user.id}\n`);

    // Create 5 sample tasks to give MongoDB realistic document load
    console.log('Seeding 5 tasks in MongoDB...');
    for (let i = 1; i <= 5; i++) {
        await request(
            {
                hostname: 'localhost',
                port: 5000,
                path: '/tasks',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            },
            {
                title: `Task #${i} for cache testing`,
                description: `Sample task ${i} payload to benchmark MongoDB query vs node-cache`,
                priority: i % 2 === 0 ? 'high' : 'medium',
            }
        );
    }
    console.log('Seeded 5 tasks.\n');

    // Test 1: First GET /tasks -> Cache MISS (hits MongoDB)
    console.log('------------------------------------------------------------');
    console.log('1. First Read: Expect CACHE MISS (MongoDB Query)');
    const miss1 = await request({
        hostname: 'localhost',
        port: 5000,
        path: '/tasks',
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`Status: ${miss1.status} | X-Cache: ${miss1.cacheHeader} | Server Time: ${miss1.serverTime} | Client Roundtrip: ${miss1.totalTime}ms`);

    // Test 2: Consecutive GET /tasks -> Cache HITS (served from node-cache)
    console.log('\n------------------------------------------------------------');
    console.log('2. Three Sample Readings for CACHE HIT:');
    const hitReadings = [];
    for (let i = 1; i <= 3; i++) {
        const hit = await request({
            hostname: 'localhost',
            port: 5000,
            path: '/tasks',
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` },
        });
        hitReadings.push(hit);
        console.log(`Reading #${i} (HIT)  -> X-Cache: ${hit.cacheHeader} | Server Time: ${hit.serverTime} | Client Roundtrip: ${hit.totalTime}ms | Items: ${hit.body.length}`);
    }

    // Test 3: Cache Invalidation via POST
    console.log('\n------------------------------------------------------------');
    console.log('3. Trigger Write Operation (POST /tasks) -> Invalidate Cache');
    const writeRes = await request(
        {
            hostname: 'localhost',
            port: 5000,
            path: '/tasks',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
        },
        {
            title: 'New Write Task',
            description: 'This write must invalidate the cache key immediately',
            priority: 'low',
        }
    );
    console.log(`POST Status: ${writeRes.status} | X-Cache-Invalidated: ${writeRes.headers['x-cache-invalidated']}`);

    // Test 4: Three Sample Readings for Uncached (Cache MISS after invalidations)
    console.log('\n------------------------------------------------------------');
    console.log('4. Three Sample Readings for CACHE MISS / UNCACHED (Database Queries):');
    const missReadings = [];

    // Reading 1: immediate read after invalidation -> MISS
    const missReading1 = await request({
        hostname: 'localhost',
        port: 5000,
        path: '/tasks',
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
    });
    missReadings.push(missReading1);
    console.log(`Reading #1 (MISS) -> X-Cache: ${missReading1.cacheHeader} | Server Time: ${missReading1.serverTime} | Client Roundtrip: ${missReading1.totalTime}ms`);

    // Invalidate again by creating another task
    await request(
        {
            hostname: 'localhost',
            port: 5000,
            path: '/tasks',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
        },
        { title: 'Invalidation Task 2', description: 'Force miss', priority: 'medium' }
    );
    const missReading2 = await request({
        hostname: 'localhost',
        port: 5000,
        path: '/tasks',
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
    });
    missReadings.push(missReading2);
    console.log(`Reading #2 (MISS) -> X-Cache: ${missReading2.cacheHeader} | Server Time: ${missReading2.serverTime} | Client Roundtrip: ${missReading2.totalTime}ms`);

    // Invalidate again by creating another task
    await request(
        {
            hostname: 'localhost',
            port: 5000,
            path: '/tasks',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
        },
        { title: 'Invalidation Task 3', description: 'Force miss', priority: 'high' }
    );
    const missReading3 = await request({
        hostname: 'localhost',
        port: 5000,
        path: '/tasks',
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
    });
    missReadings.push(missReading3);
    console.log(`Reading #3 (MISS) -> X-Cache: ${missReading3.cacheHeader} | Server Time: ${missReading3.serverTime} | Client Roundtrip: ${missReading3.totalTime}ms`);

    // Test 5: Cache stats endpoint
    console.log('\n------------------------------------------------------------');
    console.log('5. Cache Stats Endpoint (/tasks/cache/stats):');
    const statsRes = await request({
        hostname: 'localhost',
        port: 5000,
        path: '/tasks/cache/stats',
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
    });
    console.log(JSON.stringify(statsRes.body, null, 2));

    console.log('\nBenchmark completed successfully!');
}

runBenchmark().catch(console.error);
