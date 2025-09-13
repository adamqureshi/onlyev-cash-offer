// /api/leads.js — Vercel Serverless Function (no extra packages needed)
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const d = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

    const subject = `OnlyEV Lead: ${d.year || ''} ${d.make || ''} ${d.model || ''} — ${d.vin || ''}`
      .replace(/\s+/g,' ').trim();

    const html = `
      <div style="font-family:system-ui,Segoe UI,Roboto,Arial;color:#111">
        <h2>New Cash Offer Lead</h2>
        <h3>Vehicle</h3>
        <ul>
          <li><b>VIN:</b> ${d.vin || ''}</li>
          <li><b>Year/Make/Model:</b> ${d.year || ''} ${d.make || ''} ${d.model || ''}</li>
          <li><b>Trim:</b> ${d.trim || ''}</li>
          <li><b>Miles:</b> ${d.miles || ''}</li>
          <li><b>Body:</b> ${d.bodyClass || ''}</li>
          <li><b>Drive:</b> ${d.driveType || ''}</li>
        </ul>
        <h3>Seller</h3>
        <ul>
          <li><b>Name:</b> ${d.first || ''} ${d.last || ''}</li>
          <li><b>Phone:</b> ${d.phone || ''}</li>
          <li><b>Email:</b> ${d.email || ''}</li>
          <li><b>ZIP:</b> ${d.zip || ''}</li>
          <li><b>Persona:</b> ${d.persona || ''} ${d.dealerName ? '('+d.dealerName+')' : ''}</li>
        </ul>
        <h3>Title / Loan</h3>
        <ul>
          <li><b>Status:</b> ${d.lien || ''}</li>
          <li><b>Lender:</b> ${d.bank || ''}</li>
          <li><b>Knows payoff:</b> ${d.knowPayoff || ''}</li>
          <li><b>Payoff:</b> ${d.payoff || ''}</li>
        </ul>
        ${Array.isArray(d.photos) && d.photos.length ? `
          <h3>Photos</h3>
          <ol>${d.photos.map(u => `<li><a href="${u}">${u}</a></li>`).join('')}</ol>
        ` : ''}
        <hr/>
        <small>Source: ${d.source || ''}<br/>Referrer: ${d.referrer || ''}<br/>Timestamp: ${d.ts || ''}</small>
      </div>
    `;

    const to = process.env.EMAIL_TO || 'contact@onlyev.com';
    const from = process.env.EMAIL_FROM || 'OnlyEV <noreply@onresend.com>';

    // Send email via Resend REST API (no SDK required)
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });

    if (!r.ok) {
      const err = await r.text();
      res.status(500).json({ ok: false, error: err });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || 'Unknown error' });
  }
};
