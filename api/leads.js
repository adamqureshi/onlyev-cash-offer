// /api/leads.js — Vercel Serverless Function (Node runtime)
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Body may arrive as string or object
    const d = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

    // --- ENV VARS ---
    const { RESEND_API_KEY, EMAIL_TO, EMAIL_FROM } = process.env;
    if (!RESEND_API_KEY) throw new Error('Missing env: RESEND_API_KEY');
    if (!EMAIL_TO) throw new Error('Missing env: EMAIL_TO');
    const from = EMAIL_FROM && EMAIL_FROM.trim()
      ? EMAIL_FROM.trim()
      // Safe default sender (no domain verification needed)
      : 'OnlyEV <no-reply@onresend.com>';

    // --- Compose message ---
    const clean = (s) => (s || '').toString().replace(/\s+/g, ' ').trim();
    const subject = clean(
      `OnlyEV Lead: ${d.year || ''} ${d.make || ''} ${d.model || ''} — ${d.vin || ''}`
    );

    const html = `
      <div style="font-family:system-ui,Segoe UI,Roboto,Arial;color:#111">
        <h2>New Cash Offer Lead</h2>
        <p><b>VIN:</b> ${clean(d.vin)}</p>
        <p><b>Year/Make/Model:</b> ${clean(d.year)} ${clean(d.make)} ${clean(d.model)} ${d.trim ? `(${clean(d.trim)})` : ''}</p>
        <p><b>Miles:</b> ${clean(d.miles)} &nbsp; <b>ZIP:</b> ${clean(d.zip)}</p>
        <p><b>Body:</b> ${clean(d.bodyClass)} &nbsp; <b>Drive:</b> ${clean(d.driveType)}</p>
        <hr>
        <p><b>Name:</b> ${clean(d.first)} ${clean(d.last)}</p>
        <p><b>Email:</b> ${clean(d.email)} &nbsp; <b>Phone:</b> ${clean(d.phone)}</p>
        ${d.persona ? `<p><b>Persona:</b> ${clean(d.persona)}</p>` : ''}
        ${d.dealerName ? `<p><b>Dealer:</b> ${clean(d.dealerName)}</p>` : ''}
        <p><b>Title/Loan:</b> ${clean(d.lien)} ${
          d.bank ? `— <b>Bank:</b> ${clean(d.bank)}` : ''
        } ${d.knowPayoff === 'yes' && d.payoff ? `— <b>Payoff:</b> $${clean(d.payoff)}` : ''}</p>
        <hr>
        <p><b>Time:</b> ${new Date().toISOString()}</p>
        <p><b>Source:</b> ${clean(d.source)} &nbsp; <b>Referrer:</b> ${clean(d.referrer)}</p>
      </div>
    `;

    // --- Send via Resend REST API ---
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [EMAIL_TO],
        subject,
        html,
        reply_to: d.email || undefined,
      }),
    });

    const text = await r.text(); // capture response for logging

    if (!r.ok) {
      console.error('Resend error:', r.status, text);
      return res
        .status(500)
        .json({ ok: false, error: 'Resend failed', status: r.status, detail: text });
    }

    console.log('Lead sent via Resend:', subject);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Lead handler error:', err);
    return res.status(500).json({ ok: false, error: err.message || 'Unhandled error' });
  }
};
