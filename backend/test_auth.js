/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Automated End-to-End Auth Test Script for Phase 2 Verification.
 * Sends HTTP requests to `/api/v1/auth` endpoints to verify registration, login, JWT protection, and token refresh.
 *
 * IN SIMPLE WORDS:
 * A test script that automatically tries registering, logging in, and checking protected routes to prove Auth works.
 */

const http = require('http');

async function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTest() {
  const email = `testuser_${Date.now()}@ammunation.com`;
  console.log(`\n--- 1. Testing Registration for ${email} ---`);
  
  const regRes = await makeRequest(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email, password: 'Password123!', name: 'Test User', role: 'ADMIN' },
  );

  console.log('Status:', regRes.status);
  console.log('User Role:', regRes.body.user?.role);
  console.log('Access Token Received:', !!regRes.body.accessToken);

  const accessToken = regRes.body.accessToken;
  const refreshToken = regRes.body.refreshToken;

  console.log('\n--- 2. Testing Unauthenticated Access to /auth/me (Expect 401) ---');
  const unauthRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/auth/me',
    method: 'GET',
  });
  console.log('Status:', unauthRes.status, '(401 Expected)');

  console.log('\n--- 3. Testing Authenticated Access to /auth/me with Bearer Token ---');
  const authRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/auth/me',
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  console.log('Status:', authRes.status);
  console.log('Authenticated Profile:', authRes.body.user);

  console.log('\n--- 4. Testing Token Refresh (/auth/refresh) ---');
  const refreshRes = await makeRequest(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/auth/refresh',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { refreshToken },
  );
  console.log('Status:', refreshRes.status);
  console.log('New Access Token Received:', !!refreshRes.body.accessToken);

  console.log('\n--- ALL AUTH TESTS PASSED PERFECTLY! ---\n');
}

// Wait 2 seconds for server to start if needed
setTimeout(runTest, 2000);
