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
                    executionMode: res.headers['x-execution-mode'],
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

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runEventBenchmark() {
    console.log('=== Practical 10: Asynchronous Event-Driven Architecture Benchmark ===\n');

    // 1. Register / Login test user
    const username = `eventUser_${Date.now()}`;
    const userPayload = {
        username: username,
        email: `${username}@example.com`,
        password: 'password123',
    };

    console.log('Step 1: Authenticating user to obtain JWT token...');
    const authRes = await request(
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
    console.log(`Authenticated as "${authRes.body.user.username}" (ID: ${authRes.body.user.id})\n`);

    // 2. Test Asynchronous Task Creation (Default EventEmitter non-blocking)
    console.log('------------------------------------------------------------');
    console.log('Step 2: ASYNCHRONOUS Task Creation (Default Event-Driven Mode)');
    console.log('Creating 3 tasks with EventEmitter background notification listener:\n');

    const asyncSamples = [];
    for (let i = 1; i <= 3; i++) {
        const taskData = {
            title: `Async Task #${i}: Implement Microservice Event`,
            description: `Testing asynchronous event emission for task ${i}`,
            priority: i === 1 ? 'high' : i === 2 ? 'medium' : 'low',
        };

        const res = await request(
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
            taskData
        );

        asyncSamples.push(res);
        console.log(`[Task ${i}] HTTP Status: ${res.status} | Mode: ${res.executionMode}`);
        console.log(`         API Server Time: ${res.serverTime} | Roundtrip: ${res.totalTime}ms`);
        await sleep(50); // slight pause to let background event log
    }

    // 3. Test Synchronous Task Creation (for timing comparison)
    console.log('\n------------------------------------------------------------');
    console.log('Step 3: SYNCHRONOUS Task Creation (Demonstration Comparison Mode: ?mode=sync)');
    console.log('Creating a task where notification blocks before API responds:\n');

    const syncRes = await request(
        {
            hostname: 'localhost',
            port: 5000,
            path: '/tasks?mode=sync',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
        },
        {
            title: 'Sync Task: Blocking Execution Demonstration',
            description: 'This task simulates synchronous blocking notification',
            priority: 'medium',
        }
    );

    console.log(`[Sync Task] HTTP Status: ${syncRes.status} | Mode: ${syncRes.executionMode}`);
    console.log(`            API Server Time: ${syncRes.serverTime} | Roundtrip: ${syncRes.totalTime}ms\n`);

    // 4. Query Background Notification Logs
    console.log('------------------------------------------------------------');
    console.log('Step 4: Fetch Recorded Background Notification Logs (GET /tasks/notifications)');
    const notifRes = await request({
        hostname: 'localhost',
        port: 5000,
        path: '/tasks/notifications',
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
    });

    console.log(`Total Background Notifications Recorded: ${notifRes.body.count}\n`);
    notifRes.body.notifications.slice(0, 3).forEach((n, idx) => {
        console.log(`Notification #${idx + 1}:`);
        console.log(`   Task Title:          "${n.title}"`);
        console.log(`   Assigned User:       ${n.assignedUser}`);
        console.log(`   API Responded At:    ${n.apiResponseTimestamp}`);
        console.log(`   Handler Executed At: ${n.handlerExecutionTimestamp}`);
        console.log(`   Execution Delay:     +${n.executionDelayMs}ms (handled asynchronously in background)`);
        console.log('');
    });

    console.log('============================================================');
    console.log('Timing Summary Comparison:');
    console.log(`- Asynchronous API Response Time (avg): ~${(asyncSamples.reduce((a, b) => a + parseFloat(b.serverTime), 0) / asyncSamples.length).toFixed(2)}ms (immediate 201)`);
    console.log(`- Synchronous API Response Time:        ~${syncRes.serverTime} (blocked until handler finished)`);
    console.log('EventEmitter decoupled the notification successfully without blocking API throughput!');
    console.log('============================================================\n');
}

runEventBenchmark().catch(console.error);
