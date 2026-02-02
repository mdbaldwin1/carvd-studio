# Quick Start Guide - Lemon Squeezy Webhook

**5-minute setup for automated license key delivery**

## What You Need

- ✅ Vercel account (free tier is fine)
- ✅ Lemon Squeezy account (you already have this)
- ✅ Your `license-private-key.pem` file (in parent directory)

## Step-by-Step Setup

### 1. Install Dependencies & Test Locally (2 min)

```bash
cd webhook-service
npm install
node test-webhook.js
```

If the test passes, you'll see a generated license key that can be verified. This confirms everything works!

### 2. Deploy to Vercel (1 min)

```bash
npm install -g vercel    # If you don't have it
vercel login            # Login to your account
vercel --prod           # Deploy!
```

Save the production URL you get (e.g., `https://carvd-studio-webhook.vercel.app`)

### 3. Add Environment Variables in Vercel (2 min)

Go to: [vercel.com/dashboard](https://vercel.com/dashboard) > Your Project > Settings > Environment Variables

Add two variables:

**LICENSE_PRIVATE_KEY**
```
Paste the ENTIRE contents of ../license-private-key.pem here
(including the -----BEGIN PRIVATE KEY----- and -----END PRIVATE KEY----- lines)
```

**LEMON_SQUEEZY_WEBHOOK_SECRET**
```
Leave blank for now - you'll get this from Lemon Squeezy in the next step
```

Click **Redeploy** after adding variables.

### 4. Configure Lemon Squeezy Webhook (1 min)

Go to: Lemon Squeezy Dashboard > Settings > Webhooks > Create webhook

- **URL**: `https://your-vercel-url.vercel.app/api/webhook`
- **Events**: Check only `order_created`
- **Secret**: Copy the auto-generated signing secret

Go back to Vercel > Environment Variables > Edit `LEMON_SQUEEZY_WEBHOOK_SECRET` and paste the secret.

Click **Redeploy** again.

### 5. Update Your Product Settings (1 min)

Lemon Squeezy Dashboard > Products > Your Product:

- **Generate license keys**: Toggle **OFF** (we're using our custom system)

### 6. Update Email Template (Optional)

Settings > Email Templates > Order Confirmation

Add this where you want the license key to appear:

```
═══════════════════════════════════════
YOUR LICENSE KEY
═══════════════════════════════════════
{{order.license_key}}
═══════════════════════════════════════

To activate Carvd Studio:
1. Download and install from [your download link]
2. Launch the app
3. Copy and paste your license key above
4. Click "Activate License"

Need help? Email support@yourdomain.com
```

## Done!

Test it by creating a test order. The license key should:
1. Be generated automatically when the order completes
2. Appear in the order confirmation email
3. Work in your app when pasted into the activation screen

## Troubleshooting

**Webhook not working?**
- Check Vercel logs: Dashboard > Project > Logs
- Check webhook signature matches in both Vercel and Lemon Squeezy
- Make sure URL ends with `/api/webhook`

**License key not in email?**
- Check email template has `{{order.license_key}}`
- Check Lemon Squeezy webhook logs (Settings > Webhooks > Recent deliveries)

**Still stuck?**
- Run `node test-webhook.js` to test locally
- Check environment variables are set correctly in Vercel
- Make sure you redeployed after adding/changing variables
