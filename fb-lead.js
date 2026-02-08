const crypto = require('crypto');

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const PIXEL_ID = process.env.FB_PIXEL_ID;
  const ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;
  const WEBHOOK_URL = process.env.WEBHOOK_URL;

  if (!PIXEL_ID || !ACCESS_TOKEN) {
    console.error('Missing FB_PIXEL_ID or FB_ACCESS_TOKEN env vars');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const {
      name,
      email,
      phone,
      lead_type,
      volume,
      states,
      urgency,
      fbclid,
      fbc,
      fbp,
      source_url,
      user_agent
    } = req.body;

    // Hash PII for FB CAPI (SHA-256, lowercase, trimmed)
    const hash = (val) => {
      if (!val) return undefined;
      return crypto
        .createHash('sha256')
        .update(val.toString().trim().toLowerCase())
        .digest('hex');
    };

    // Parse name into first/last
    const nameParts = (name || '').trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Strip phone to digits only
    const cleanPhone = (phone || '').replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('1') ? cleanPhone : '1' + cleanPhone;

    // Build fbc from fbclid if not already set
    const fbcValue = fbc || (fbclid ? `fb.1.${Date.now()}.${fbclid}` : undefined);

    // Build event payload
    const eventData = {
      data: [
        {
          event_name: 'Lead',
          event_time: Math.floor(Date.now() / 1000),
          action_source: 'website',
          event_source_url: source_url || undefined,
          user_data: {
            em: hash(email) ? [hash(email)] : undefined,
            ph: hash(formattedPhone) ? [hash(formattedPhone)] : undefined,
            fn: hash(firstName) ? [hash(firstName)] : undefined,
            ln: hash(lastName) ? [hash(lastName)] : undefined,
            fbc: fbcValue || undefined,
            fbp: fbp || undefined,
            client_user_agent: user_agent || undefined,
            client_ip_address: req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || undefined
          },
          custom_data: {
            lead_type: lead_type || undefined,
            volume: volume || undefined,
            states: states || undefined,
            urgency: urgency || undefined
          }
        }
      ]
    };

    // Send to FB Conversions API
    const fbResponse = await fetch(
      `https://graph.facebook.com/v21.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      }
    );

    const fbResult = await fbResponse.json();

    if (!fbResponse.ok) {
      console.error('FB CAPI error:', JSON.stringify(fbResult));
      return res.status(500).json({ error: 'FB API error', details: fbResult });
    }

    console.log('FB CAPI Lead event sent:', JSON.stringify(fbResult));

    // Send lead data to webhook (if configured)
    if (WEBHOOK_URL) {
      try {
        const webhookPayload = {
          event: 'new_lead',
          timestamp: new Date().toISOString(),
          lead: {
            name: name || '',
            email: email || '',
            phone: phone || '',
            lead_type: lead_type || '',
            volume: volume || '',
            states: states || '',
            urgency: urgency || '',
            source_url: source_url || '',
            fbclid: fbclid || '',
            ip: req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || ''
          }
        };

        await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookPayload)
        });

        console.log('Webhook sent to:', WEBHOOK_URL);
      } catch (webhookErr) {
        console.error('Webhook error:', webhookErr);
        // Don't fail the response if webhook fails
      }
    }

    return res.status(200).json({ success: true, fb_response: fbResult });

  } catch (error) {
    console.error('CAPI handler error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
