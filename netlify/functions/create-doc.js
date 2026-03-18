const https = require('https');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const API_KEY = process.env.EZCOUNT_API_KEY;
  if (!API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'API key not configured' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { type, customer_name, customer_email, customer_phone, customer_address, description, amount, vat_type, payment_method } = body;

  // Build price with/without VAT
  const price = parseFloat(amount) || 0;
  const vat = vat_type === 'כולל מע"מ' ? 1 : 0;

  const payload = JSON.stringify({
    api_key: API_KEY,
    type: parseInt(type) || 320,
    description: description || 'שירות מנעולנות',
    price_total: price,
    vat_included: vat,
    client_name: customer_name || '',
    client_email: customer_email || '',
    client_phone: customer_phone || '',
    client_address: customer_address || '',
    remarks: `שיטת תשלום: ${payment_method || ''}`,
    lang: 'he',
    currency: 'ILS',
    send_client_copy: 1,
  });

  return new Promise((resolve) => {
    const options = {
      hostname: 'www.ezcount.co.il',
      path: '/api/createDoc',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(json),
          });
        } catch {
          resolve({ statusCode: 200, body: data });
        }
      });
    });

    req.on('error', (e) => {
      resolve({ statusCode: 500, body: JSON.stringify({ error: e.message }) });
    });

    req.write(payload);
    req.end();
  });
};
