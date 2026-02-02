/**
 * Local webhook testing script
 *
 * Run this to test webhook logic locally before deploying:
 * node test-webhook.js
 */

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the private key
const privateKeyPath = path.join(__dirname, '..', 'license-private-key.pem');

if (!fs.existsSync(privateKeyPath)) {
  console.error('❌ Error: license-private-key.pem not found!');
  console.error('Run "npm run generate-keys" in the main project directory first.');
  process.exit(1);
}

const privateKey = fs.readFileSync(privateKeyPath, 'utf-8');

// Mock webhook payload (mimics Lemon Squeezy order_created event)
const mockWebhookPayload = {
  meta: {
    event_name: 'order_created',
    custom_data: {}
  },
  data: {
    type: 'orders',
    id: '12345',
    attributes: {
      identifier: 'LS-TEST-' + Date.now(),
      order_number: 123456,
      user_email: 'test@example.com',
      status: 'paid',
      total: 4900, // $49.00
      currency: 'USD',
      created_at: new Date().toISOString()
    }
  }
};

console.log('🧪 Testing webhook handler locally...\n');
console.log('Mock Webhook Payload:');
console.log(JSON.stringify(mockWebhookPayload, null, 2));
console.log('\n' + '═'.repeat(70) + '\n');

try {
  // Simulate webhook processing
  const event = mockWebhookPayload;
  const customerEmail = event.data?.attributes?.user_email;
  const orderId = event.data?.attributes?.identifier;
  const orderNumber = event.data?.attributes?.order_number;

  console.log(`📧 Customer: ${customerEmail}`);
  console.log(`🔢 Order ID: ${orderId}`);
  console.log(`📋 Order Number: ${orderNumber}`);
  console.log('\n🔐 Generating license key...\n');

  // Generate license data (same as webhook)
  const licenseData = {
    email: customerEmail,
    orderId: orderId,
    product: 'carvd-studio',
    licenseType: 'standard'
    // No exp field = lifetime license
  };

  // Sign the JWT
  const licenseKey = jwt.sign(licenseData, privateKey, {
    algorithm: 'RS256'
  });

  console.log('✅ License key generated successfully!\n');
  console.log('═'.repeat(70));
  console.log('LICENSE KEY:');
  console.log('═'.repeat(70));
  console.log(licenseKey);
  console.log('═'.repeat(70));
  console.log('\n');

  // Verify the license key works
  console.log('🔍 Verifying license key...\n');

  // Load public key from main project
  const publicKeyPath = path.join(__dirname, '..', 'src', 'main', 'keys.ts');
  const keysFile = fs.readFileSync(publicKeyPath, 'utf-8');
  const publicKeyMatch = keysFile.match(/`(-----BEGIN PUBLIC KEY-----[\s\S]+?-----END PUBLIC KEY-----)`/);

  if (!publicKeyMatch) {
    throw new Error('Could not extract public key from keys.ts');
  }

  const publicKey = publicKeyMatch[1];

  const decoded = jwt.verify(licenseKey, publicKey, {
    algorithms: ['RS256']
  });

  console.log('✅ License key verified successfully!\n');
  console.log('Decoded License Data:');
  console.log(JSON.stringify(decoded, null, 2));
  console.log('\n');

  console.log('✅ Test passed! Webhook logic is working correctly.\n');
  console.log('📝 Next steps:');
  console.log('   1. Deploy to Vercel: cd webhook-service && vercel --prod');
  console.log('   2. Configure environment variables in Vercel dashboard');
  console.log('   3. Set up webhook in Lemon Squeezy with your Vercel URL');
  console.log('   4. Test with a real order\n');

} catch (error) {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
}
