const REPO = 'Gal9amar/new-unlock';
const FILE = 'data/products.json';
const GITHUB_API = `https://api.github.com/repos/${REPO}/contents/${FILE}`;

exports.handler = async (event) => {
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Token not configured' }) };
  }

  const headers = {
    'Authorization': `token ${token}`,
    'Content-Type': 'application/json',
    'User-Agent': 'Netlify-Function'
  };

  // GET – קריאת products.json
  if (event.httpMethod === 'GET') {
    const res = await fetch(GITHUB_API, { headers });
    const data = await res.json();
    return {
      statusCode: res.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    };
  }

  // PUT – כתיבת products.json (עריכה / הוספה / מחיקה)
  if (event.httpMethod === 'PUT') {
    const body = JSON.parse(event.body);

    const res = await fetch(GITHUB_API, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        message: body.message || 'Admin: update products',
        content: body.content,
        sha: body.sha
      })
    });

    const data = await res.json();
    return {
      statusCode: res.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    };
  }

  return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
};
