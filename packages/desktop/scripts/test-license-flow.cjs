#!/usr/bin/env node

/**
 * Test License Flow Locally
 *
 * This script allows you to test the license validation flow
 * without needing a real Lemon Squeezy purchase.
 *
 * Run: node scripts/test-license-flow.cjs
 */

const http = require('http');
const url = require('url');

console.log('🧪 Local License Testing Server\n');
console.log('This creates a mock Lemon Squeezy API server for testing.\n');

// Mock license data
const MOCK_LICENSES = {
  'TEST-LICENSE-KEY-123': {
    valid: true,
    activated: false,
    license_key: {
      id: 1,
      status: 'active',
      key: 'TEST-LICENSE-KEY-123',
      activation_limit: 3,
      activation_usage: 0,
      created_at: new Date().toISOString(),
      expires_at: null
    },
    meta: {
      store_id: 1,
      order_id: 12345,
      order_item_id: 1,
      product_id: 1,
      product_name: 'Carvd Studio',
      variant_id: 1, // Lemon Squeezy always returns a variant_id, even without variants
      variant_name: 'Carvd Studio', // Same as product name when no variants
      customer_id: 1,
      customer_name: 'Test Customer',
      customer_email: 'test@example.com'
    }
  }
};

// Create mock server
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Collect request body
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', () => {
    let requestData = {};
    try {
      requestData = body ? JSON.parse(body) : {};
    } catch (e) {
      console.error('Error parsing request:', e);
    }

    console.log(`\n📨 ${req.method} ${path}`);
    console.log('Request:', requestData);

    // Handle license validation
    if (path === '/v1/licenses/validate' && req.method === 'POST') {
      const { license_key, instance_id } = requestData;

      const license = MOCK_LICENSES[license_key];

      if (!license) {
        console.log('❌ Invalid license key');
        res.writeHead(404);
        res.end(JSON.stringify({
          error: 'License key not found'
        }));
        return;
      }

      console.log('✅ License validated');

      const response = {
        valid: true,
        license_key: license.license_key,
        meta: license.meta,
        instance: license.activated ? {
          id: instance_id,
          name: 'Test Instance',
          created_at: new Date().toISOString()
        } : null
      };

      res.writeHead(200);
      res.end(JSON.stringify(response));
      return;
    }

    // Handle license activation
    if (path === '/v1/licenses/activate' && req.method === 'POST') {
      const { license_key, instance_name } = requestData;

      const license = MOCK_LICENSES[license_key];

      if (!license) {
        console.log('❌ Invalid license key');
        res.writeHead(404);
        res.end(JSON.stringify({
          error: 'License key not found'
        }));
        return;
      }

      if (license.license_key.activation_usage >= license.license_key.activation_limit) {
        console.log('❌ Activation limit reached');
        res.writeHead(422);
        res.end(JSON.stringify({
          error: 'Activation limit reached'
        }));
        return;
      }

      // Activate the license
      license.activated = true;
      license.license_key.activation_usage++;

      console.log('✅ License activated');

      const response = {
        activated: true,
        license_key: {
          id: license.license_key.id,
          status: license.license_key.status,
          key: license.license_key.key,
          activation_limit: license.license_key.activation_limit,
          activation_usage: license.license_key.activation_usage
        },
        instance: {
          id: 'test-instance-id',
          name: instance_name
        }
      };

      res.writeHead(200);
      res.end(JSON.stringify(response));
      return;
    }

    // Handle license deactivation
    if (path === '/v1/licenses/deactivate' && req.method === 'POST') {
      const { license_key } = requestData;

      const license = MOCK_LICENSES[license_key];

      if (!license) {
        console.log('❌ Invalid license key');
        res.writeHead(404);
        res.end(JSON.stringify({
          error: 'License key not found'
        }));
        return;
      }

      // Deactivate the license
      license.activated = false;
      license.license_key.activation_usage = Math.max(0, license.license_key.activation_usage - 1);

      console.log('✅ License deactivated');

      const response = {
        deactivated: true,
        license_key: {
          activation_usage: license.license_key.activation_usage
        }
      };

      res.writeHead(200);
      res.end(JSON.stringify(response));
      return;
    }

    // 404 for unknown paths
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  });
});

const PORT = 3001;

server.listen(PORT, () => {
  console.log(`✅ Mock Lemon Squeezy API running on http://localhost:${PORT}\n`);
  console.log('📋 Test Instructions:\n');
  console.log('1. Update packages/desktop/src/main/lemonsqueezy-api.ts:');
  console.log('   Change LEMONSQUEEZY_API_URL to: http://localhost:3001/v1');
  console.log('   (Include /v1 to match the real Lemon Squeezy API base URL)\n');
  console.log('2. Run your app in dev mode:');
  console.log('   npm run dev --workspace=@carvd/desktop\n');
  console.log('3. Use this test license key:');
  console.log('   TEST-LICENSE-KEY-123\n');
  console.log('4. Test activation/deactivation in the app\n');
  console.log('5. Watch this terminal for API requests\n');
  console.log('Press Ctrl+C to stop the server\n');
});
