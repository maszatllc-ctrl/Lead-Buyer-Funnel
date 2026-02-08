# Quick Life Rates — Lead Buyer Funnel

Landing page + multi-step qualification form for life insurance lead generation.

## Project Structure

```
├── public/
│   ├── index.html              # Landing page
│   ├── qualify.html            # Multi-step qualification form
│   ├── qualify-success.html    # Success page + Calendly embed
│   └── privacy-policy.html    # Privacy policy
├── api/
│   ├── fb-lead.js             # FB Conversions API (server-side Lead event)
│   └── pixel-config.js        # Injects FB Pixel ID from env vars
├── vercel.json
├── package.json
└── .env.example
```

## Setup

### 1. Deploy to Vercel

Connect this repo to [Vercel](https://vercel.com) and it auto-deploys.

### 2. Set Environment Variables

In Vercel → Project Settings → Environment Variables, add:

| Variable | Description |
|---|---|
| `FB_PIXEL_ID` | Your Facebook Pixel ID |
| `FB_ACCESS_TOKEN` | Facebook Conversions API access token |

### 3. Add Calendly Embed

In `public/qualify-success.html`, replace the placeholder div with your Calendly inline embed code.

### 4. Point Your Domain

In Vercel → Project Settings → Domains, add your custom domain.

## How It Works

**Landing Page** → Agent clicks "See If You Qualify" →  
**Qualification Form** (5 steps: lead type, volume, states, urgency, contact) →  
**Success Page** with Calendly embed

### Facebook Tracking

- **FB Pixel** loads on all pages via `/api/pixel-config` (reads `FB_PIXEL_ID` from env)
- **Client-side**: `fbq('track', 'Lead')` fires on form submit
- **Server-side (CAPI)**: POST to `/api/fb-lead` sends Lead event with hashed PII, fbclid, fbc/fbp cookies
- **fbclid** is captured from URL params and persisted in sessionStorage across the funnel

### Deduplication

Both client-side Pixel and server-side CAPI fire the Lead event. Facebook deduplicates using the `fbc` and `fbp` parameters automatically.
