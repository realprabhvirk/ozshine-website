const ALLOWED_ORIGINS = new Set([
  'https://ozshinecarwash.com.au',
  'https://www.ozshinecarwash.com.au'
]);

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const SUCCESS_MESSAGE = 'Thank you. Your mobile detailing enquiry has been sent.';
const ERROR_MESSAGE = 'Unable to send your booking enquiry right now. Please try again.';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function buildCorsHeaders(origin) {
  if (!origin || !ALLOWED_ORIGINS.has(origin)) {
    return {};
  }

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin'
  };
}

function jsonResponse(body, status = 200, corsHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders
    }
  });
}

function sanitiseText(input, maxLength = 2000) {
  return String(input || '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function escapeHtml(input) {
  return String(input || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderOptional(value) {
  return value || 'Not provided';
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const corsHeaders = buildCorsHeaders(origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    if (!ALLOWED_ORIGINS.has(origin || '')) {
      return jsonResponse({ success: false, message: ERROR_MESSAGE }, 403, corsHeaders);
    }

    if (request.method !== 'POST') {
      return jsonResponse({ success: false, message: ERROR_MESSAGE }, 405, corsHeaders);
    }

    if (!env.RESEND_API_KEY) {
      return jsonResponse({ success: false, message: ERROR_MESSAGE }, 500, corsHeaders);
    }

    let payload;

    try {
      payload = await request.json();
    } catch {
      return jsonResponse({ success: false, message: ERROR_MESSAGE }, 400, corsHeaders);
    }

    const booking = {
      name: sanitiseText(payload.name, 120),
      phoneCountryCode: sanitiseText(payload.phoneCountryCode, 12),
      phone: sanitiseText(payload.phone, 60),
      fullPhone: sanitiseText(payload.fullPhone, 80),
      location: sanitiseText(payload.location, 160),
      email: sanitiseText(payload.email, 160),
      vehicleType: sanitiseText(payload.vehicleType, 120),
      rego: sanitiseText(payload.rego, 60),
      notes: sanitiseText(payload.notes, 2000)
    };

    if (!booking.name || !booking.phoneCountryCode || !booking.phone || !booking.fullPhone || !booking.location) {
      return jsonResponse({ success: false, message: ERROR_MESSAGE }, 400, corsHeaders);
    }

    if (booking.email && !EMAIL_REGEX.test(booking.email)) {
      return jsonResponse({ success: false, message: ERROR_MESSAGE }, 400, corsHeaders);
    }

    const safeName = escapeHtml(booking.name);
    const safePhoneCountryCode = escapeHtml(booking.phoneCountryCode);
    const safePhone = escapeHtml(booking.phone);
    const safeFullPhone = escapeHtml(booking.fullPhone);
    const safeLocation = escapeHtml(booking.location);
    const safeEmail = escapeHtml(renderOptional(booking.email));
    const safeVehicleType = escapeHtml(renderOptional(booking.vehicleType));
    const safeRego = escapeHtml(renderOptional(booking.rego));
    const safeNotes = escapeHtml(renderOptional(booking.notes));

    const subject = `New Mobile Detailing Booking - ${booking.name}`;

    const html = `
      <div style="font-family:Arial,sans-serif;background:#f6f4f1;padding:32px;color:#171717;">
        <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #ece7e2;border-radius:16px;overflow:hidden;">
          <div style="padding:24px 28px;background:#c61b1f;color:#ffffff;">
            <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">OzShine Mobile Detailing</p>
            <h1 style="margin:0;font-size:28px;line-height:1.1;">New mobile detailing booking</h1>
          </div>
          <div style="padding:28px;">
            <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#4b4a47;">A new booking enquiry has been submitted through the OzShine mobile detailing page.</p>
            <table role="presentation" style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid #eee7e1;font-weight:700;">Name</td>
                <td style="padding:12px 0;border-bottom:1px solid #eee7e1;">${safeName}</td>
              </tr>
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid #eee7e1;font-weight:700;">Phone Country Code</td>
                <td style="padding:12px 0;border-bottom:1px solid #eee7e1;">${safePhoneCountryCode}</td>
              </tr>
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid #eee7e1;font-weight:700;">Phone Number</td>
                <td style="padding:12px 0;border-bottom:1px solid #eee7e1;">${safePhone}</td>
              </tr>
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid #eee7e1;font-weight:700;">Full Phone</td>
                <td style="padding:12px 0;border-bottom:1px solid #eee7e1;">${safeFullPhone}</td>
              </tr>
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid #eee7e1;font-weight:700;">Location</td>
                <td style="padding:12px 0;border-bottom:1px solid #eee7e1;">${safeLocation}</td>
              </tr>
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid #eee7e1;font-weight:700;">Email</td>
                <td style="padding:12px 0;border-bottom:1px solid #eee7e1;">${safeEmail}</td>
              </tr>
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid #eee7e1;font-weight:700;">Vehicle Type</td>
                <td style="padding:12px 0;border-bottom:1px solid #eee7e1;">${safeVehicleType}</td>
              </tr>
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid #eee7e1;font-weight:700;">Rego</td>
                <td style="padding:12px 0;border-bottom:1px solid #eee7e1;">${safeRego}</td>
              </tr>
              <tr>
                <td style="padding:12px 0 0;font-weight:700;vertical-align:top;">Notes</td>
                <td style="padding:12px 0 0;white-space:pre-wrap;">${safeNotes}</td>
              </tr>
            </table>
          </div>
        </div>
      </div>
    `;

    const text = [
      'OzShine Mobile Detailing',
      '',
      'A new booking enquiry has been submitted through the OzShine mobile detailing page.',
      '',
      `Name: ${booking.name}`,
      `Phone Country Code: ${booking.phoneCountryCode}`,
      `Phone Number: ${booking.phone}`,
      `Full Phone: ${booking.fullPhone}`,
      `Location: ${booking.location}`,
      `Email: ${renderOptional(booking.email)}`,
      `Vehicle Type: ${renderOptional(booking.vehicleType)}`,
      `Rego: ${renderOptional(booking.rego)}`,
      `Notes: ${renderOptional(booking.notes)}`
    ].join('\n');

    const resendPayload = {
      from: 'OzShine Mobile Detailing <mobile@ozshinecarwash.com.au>',
      to: ['ozshinecarwash.beenleigh@gmail.com'],
      subject,
      html,
      text
    };

    if (booking.email) {
      resendPayload.reply_to = booking.email;
    }

    const resendResponse = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(resendPayload)
    });

    if (!resendResponse.ok) {
      return jsonResponse({ success: false, message: ERROR_MESSAGE }, 502, corsHeaders);
    }

    return jsonResponse({ success: true, message: SUCCESS_MESSAGE }, 200, corsHeaders);
  }
};
