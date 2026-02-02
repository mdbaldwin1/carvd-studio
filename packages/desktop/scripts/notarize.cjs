/**
 * Notarization script for macOS
 *
 * This script is called by electron-builder after signing the app.
 * It submits the app to Apple for notarization and waits for approval.
 *
 * Required environment variables:
 * - APPLE_ID: Your Apple ID email (e.g., developer@example.com)
 * - APPLE_ID_PASSWORD: App-specific password from appleid.apple.com
 * - APPLE_TEAM_ID: Your Apple Developer Team ID
 *
 * How to get an app-specific password:
 * 1. Go to https://appleid.apple.com/account/manage
 * 2. Sign in with your Apple ID
 * 3. In the Security section, click "Generate Password" under App-Specific Passwords
 * 4. Enter a label (e.g., "Carvd Studio Notarization")
 * 5. Copy the generated password and store it securely
 * 6. Use it for the APPLE_ID_PASSWORD environment variable
 */

const { notarize } = require('@electron/notarize');
const path = require('path');

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;

  // Only notarize for macOS
  if (electronPlatformName !== 'darwin') {
    console.log('Skipping notarization (not macOS)');
    return;
  }

  // Check for required environment variables
  const appleId = process.env.APPLE_ID;
  const appleIdPassword = process.env.APPLE_ID_PASSWORD;
  const teamId = process.env.APPLE_TEAM_ID;

  if (!appleId || !appleIdPassword || !teamId) {
    console.warn('⚠️  Skipping notarization: Missing environment variables');
    console.warn('   Required: APPLE_ID, APPLE_ID_PASSWORD, APPLE_TEAM_ID');
    console.warn('   Set these in your CI/CD environment or local .env file');
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(appOutDir, `${appName}.app`);

  console.log(`Notarizing ${appName} at ${appPath}...`);
  console.log(`Using Apple ID: ${appleId}`);
  console.log(`Team ID: ${teamId}`);

  try {
    await notarize({
      appPath,
      appleId,
      appleIdPassword,
      teamId,
      tool: 'notarytool' // Use notarytool (new Apple notarization system)
    });

    console.log('✅ Notarization complete!');
  } catch (error) {
    console.error('❌ Notarization failed:', error);
    throw error;
  }
};
