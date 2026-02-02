# Carvd Studio - License Key Webhook Service

Automated license key generation service for Lemon Squeezy purchases.

## Overview

This Vercel serverless function automatically generates signed JWT license keys when customers purchase Carvd Studio through Lemon Squeezy. The license key is returned to Lemon Squeezy and included in the order confirmation email sent to the customer.

## Features

- ✅ Automatic license key generation on purchase
- ✅ Secure webhook signature verification
- ✅ Lifetime licenses (no expiration)
- ✅ No database required (fully stateless)
- ✅ Free hosting on Vercel
- ✅ Zero maintenance

## Setup Instructions

### Prerequisites

1. **Vercel Account** - Sign up at [vercel.com](https://vercel.com) (free)
2. **Lemon Squeezy Account** - Already set up (in review)
3. **License Private Key** - Located in `../license-private-key.pem`

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Prepare Environment Variables

1. Copy your private key content:
```bash
cat ../license-private-key.pem
```

2. Note these values for later:
   - `LICENSE_PRIVATE_KEY`: The entire contents of your private key (including BEGIN/END lines)
   - `LEMON_SQUEEZY_WEBHOOK_SECRET`: You'll get this from Lemon Squeezy in Step 4

### Step 3: Deploy to Vercel

1. Navigate to the webhook service directory:
```bash
cd webhook-service
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy to production:
```bash
vercel --prod
```

4. Vercel will ask you to set up the project. Answer:
   - **Set up and deploy?** Yes
   - **Which scope?** Your personal account
   - **Link to existing project?** No
   - **Project name?** `carvd-studio-webhook` (or your choice)
   - **Directory?** `./` (current directory)
   - **Override settings?** No

5. After deployment, Vercel will output your production URL:
   ```
   Production: https://carvd-studio-webhook.vercel.app
   ```

   **Save this URL!** You'll need it for Lemon Squeezy configuration.

### Step 4: Configure Environment Variables in Vercel

1. Go to your Vercel dashboard: [vercel.com/dashboard](https://vercel.com/dashboard)

2. Select your project (`carvd-studio-webhook`)

3. Go to **Settings** > **Environment Variables**

4. Add these two variables:

   **Variable 1: LICENSE_PRIVATE_KEY**
   - Key: `LICENSE_PRIVATE_KEY`
   - Value: Paste the ENTIRE contents of `license-private-key.pem` (including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` lines)
   - Environment: Production
   - Click **Save**

   **Variable 2: LEMON_SQUEEZY_WEBHOOK_SECRET**
   - Key: `LEMON_SQUEEZY_WEBHOOK_SECRET`
   - Value: Leave blank for now (you'll get this from Lemon Squeezy in Step 5)
   - Environment: Production
   - Click **Save**

5. After adding variables, go to **Deployments** tab and click **Redeploy** on the latest deployment

### Step 5: Configure Lemon Squeezy Webhook

1. Go to [Lemon Squeezy Dashboard](https://app.lemonsqueezy.com)

2. Navigate to **Settings** > **Webhooks**

3. Click **+ Create webhook**

4. Configure the webhook:
   - **Callback URL**: `https://your-vercel-url.vercel.app/api/webhook` (use your URL from Step 3)
   - **Events**: Check only `order_created`
   - **Signing secret**: Will be auto-generated - **copy this value**

5. Click **Save**

6. Go back to Vercel dashboard > Your project > Settings > Environment Variables

7. Edit the `LEMON_SQUEEZY_WEBHOOK_SECRET` variable and paste the signing secret from step 4

8. Redeploy again to apply the new environment variable

### Step 6: Configure Lemon Squeezy Product

1. In Lemon Squeezy dashboard, go to **Products**

2. Select your "Carvd Studio" product (or create it)

3. In product settings:
   - **Generate license keys**: Toggle **OFF** (we're using our custom system)
   - **License length**: N/A (not used)
   - **Delivery**: Email only

4. Update the order confirmation email template to include the license key:
   - Go to **Settings** > **Email Templates** > **Order Confirmation**
   - Add this text where you want the license key to appear:
     ```
     Your License Key:
     {{order.license_key}}

     To activate Carvd Studio:
     1. Download and install the app
     2. Launch the app - you'll see the activation screen
     3. Copy and paste your license key above
     4. Click "Activate License"
     ```

### Step 7: Test the Integration

1. Create a test order in Lemon Squeezy (use test mode if available)

2. Check Vercel logs to see if webhook was received:
   - Go to Vercel dashboard > Your project > **Logs** tab
   - You should see: `✅ License key generated successfully for test@example.com`

3. Check the order confirmation email - it should contain the generated license key

4. Test the license key in your app:
   ```bash
   cd ..  # Back to main carvd-studio directory
   npm run dev
   # Paste the license key from the email
   ```

## Troubleshooting

### Webhook returns 401 "Invalid signature"
- Check that `LEMON_SQUEEZY_WEBHOOK_SECRET` in Vercel matches the signing secret in Lemon Squeezy
- Redeploy after changing environment variables

### Webhook returns 500 "Server configuration error"
- Check that `LICENSE_PRIVATE_KEY` is set correctly in Vercel
- Make sure you copied the ENTIRE key including BEGIN/END lines
- Try re-pasting the key (no extra spaces or line breaks)

### License key doesn't appear in email
- Check Lemon Squeezy email template includes `{{order.license_key}}`
- Check webhook response in Lemon Squeezy webhook logs (should return `license_key` field)

### How to view webhook logs
- Vercel: Dashboard > Project > Logs tab (shows console.log output)
- Lemon Squeezy: Settings > Webhooks > Click on your webhook > Recent deliveries

## Security Notes

- ✅ Webhook signature verification prevents unauthorized requests
- ✅ Private key is stored securely in Vercel environment variables (encrypted at rest)
- ✅ License keys cannot be forged without the private key
- ✅ All communication uses HTTPS
- ⚠️ **Never commit `.env` or `license-private-key.pem` to Git**

## Cost

- **Vercel Free Tier**: 100GB bandwidth/month, unlimited serverless function invocations
- This webhook uses ~1KB per request, so you can handle ~100,000 orders/month for free
- If you exceed limits, Vercel hobby plan is $20/month (unlikely to be needed)

## Maintenance

- **Zero maintenance required** - the webhook is stateless and self-contained
- No database to manage
- No server to update
- Automatic scaling handled by Vercel
- Monitor via Vercel logs if needed

## Questions?

If you run into issues:
1. Check Vercel function logs (Dashboard > Project > Logs)
2. Check Lemon Squeezy webhook delivery logs
3. Verify environment variables are set correctly
4. Make sure webhook URL ends with `/api/webhook`
