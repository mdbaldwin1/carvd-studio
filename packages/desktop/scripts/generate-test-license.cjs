/**
 * Generate Test License Key
 *
 * This script creates a test JWT license key for development.
 * Run with: node scripts/generate-test-license.cjs
 *
 * IMPORTANT: This is for testing only. Real license keys are generated
 * automatically by Lemon Squeezy when customers make a purchase.
 */

const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Load the private key
const privateKeyPath = path.join(process.cwd(), 'license-private-key.pem');

if (!fs.existsSync(privateKeyPath)) {
  console.error('❌ Error: license-private-key.pem not found!');
  console.error('Run "npm run generate-keys" first to create your keypair.');
  process.exit(1);
}

const privateKey = fs.readFileSync(privateKeyPath, 'utf-8');

// Test license data (omit exp for lifetime license)
const licenseData = {
  email: 'test@example.com',
  orderId: 'TEST-' + Date.now(),
  product: 'carvd-studio',
  licenseType: 'standard'
  // No exp field = lifetime license
};

console.log('🔐 Generating test license key...\n');
console.log('License Data:');
console.log(JSON.stringify(licenseData, null, 2));
console.log('\n');

try {
  // Sign the JWT with the private key
  const licenseKey = jwt.sign(licenseData, privateKey, {
    algorithm: 'RS256'
  });

  console.log('✅ Test license key generated successfully!\n');
  console.log('═'.repeat(70));
  console.log('LICENSE KEY (copy this):');
  console.log('═'.repeat(70));
  console.log(licenseKey);
  console.log('═'.repeat(70));
  console.log('\n');

  console.log('📋 To use this license:');
  console.log('1. Start the app: npm run dev');
  console.log('2. The License Activation Modal will appear');
  console.log('3. Paste the license key above');
  console.log('4. Click "Activate License"');
  console.log('\n');

  console.log('ℹ️  The license will be stored in electron-store and persist across restarts.');
  console.log('   To test activation again, deactivate from Settings > License section.');

} catch (error) {
  console.error('❌ Error generating license:', error.message);
  process.exit(1);
}
