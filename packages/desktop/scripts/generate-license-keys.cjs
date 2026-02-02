/**
 * License Key Generation Script
 *
 * This script generates an RSA-2048 keypair for signing license keys.
 * Run with: node scripts/generate-license-keys.js
 *
 * IMPORTANT: Keep the private key secure! Do not commit it to version control.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

console.log('🔐 Generating RSA-2048 keypair for license signing...\n');

// Generate keypair
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem'
  }
});

console.log('✅ Keypair generated successfully!\n');

// Display public key
console.log('📋 PUBLIC KEY (copy this into src/main/keys.ts):');
console.log('═'.repeat(70));
console.log(publicKey);

// Display private key
console.log('🔒 PRIVATE KEY (keep this secure!):');
console.log('═'.repeat(70));
console.log(privateKey);

// Save private key to file
const privateKeyPath = path.join(process.cwd(), 'license-private-key.pem');
fs.writeFileSync(privateKeyPath, privateKey);
console.log(`\n💾 Private key saved to: ${privateKeyPath}`);
console.log('⚠️  Add this file to .gitignore immediately!\n');

// Update .gitignore
const gitignorePath = path.join(process.cwd(), '.gitignore');
const gitignoreEntry = '\n# License private key (never commit!)\nlicense-private-key.pem\n';

try {
  if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
    if (!gitignoreContent.includes('license-private-key.pem')) {
      fs.appendFileSync(gitignorePath, gitignoreEntry);
      console.log('✅ Added license-private-key.pem to .gitignore\n');
    } else {
      console.log('✅ license-private-key.pem already in .gitignore\n');
    }
  } else {
    fs.writeFileSync(gitignorePath, gitignoreEntry);
    console.log('✅ Created .gitignore with license-private-key.pem\n');
  }
} catch (error) {
  console.warn('⚠️  Could not update .gitignore:', error.message);
}

console.log('📝 Next steps:');
console.log('1. Copy the PUBLIC KEY above and update LICENSE_PUBLIC_KEY in src/main/keys.ts');
console.log('2. Keep the private key file secure (use it to generate license keys)');
console.log('3. Use the private key in your license generation webhook service');
console.log('\n🎉 Done!');
