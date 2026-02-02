/**
 * Lemon Squeezy Webhook Handler for License Key Generation
 *
 * This Vercel serverless function receives webhook events from Lemon Squeezy
 * when a purchase is completed, generates a signed JWT license key, and
 * returns it to Lemon Squeezy for delivery to the customer via email.
 *
 * Deploy to Vercel: vercel --prod
 */

import crypto from 'crypto';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the webhook signature from headers
    const signature = req.headers['x-signature'];
    const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;

    // Verify webhook signature for security
    if (!signature || !secret) {
      console.error('Missing signature or webhook secret');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify the signature matches
    const hmac = crypto.createHmac('sha256', secret);
    const digest = hmac.update(JSON.stringify(req.body)).digest('hex');

    if (signature !== digest) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Parse the webhook event
    const event = req.body;
    const eventName = event.meta?.event_name;

    // Only process order_created events (successful purchases)
    if (eventName !== 'order_created') {
      console.log(`Ignoring event: ${eventName}`);
      return res.status(200).json({ message: 'Event ignored' });
    }

    // Extract customer information
    const customerEmail = event.data?.attributes?.user_email;
    const orderId = event.data?.attributes?.identifier; // Lemon Squeezy order ID
    const orderNumber = event.data?.attributes?.order_number;

    if (!customerEmail || !orderId) {
      console.error('Missing customer email or order ID in webhook payload');
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }

    console.log(`Generating license for order ${orderId} (${orderNumber}) - ${customerEmail}`);

    // Load the private key from environment variable
    const privateKey = process.env.LICENSE_PRIVATE_KEY;

    if (!privateKey) {
      console.error('LICENSE_PRIVATE_KEY not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Generate the license data (lifetime license - no exp field)
    const licenseData = {
      email: customerEmail,
      orderId: orderId,
      product: 'carvd-studio',
      licenseType: 'standard'
      // No exp field = lifetime license
    };

    // Sign the JWT with the private key
    const licenseKey = jwt.sign(licenseData, privateKey, {
      algorithm: 'RS256'
    });

    console.log(`✅ License key generated successfully for ${customerEmail}`);

    // Return the license key to Lemon Squeezy
    // Lemon Squeezy will include this in the order confirmation email
    return res.status(200).json({
      success: true,
      license_key: licenseKey,
      message: 'License key generated successfully'
    });

  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
