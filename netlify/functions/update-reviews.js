const https = require('https');

const MIDRAG_URL = 'https://www.midrag.co.il/SpCard/Sp/138646?areaId=7&serviceId=1993&sortByCategory=343&isGeneric=false';
const GITHUB_REPO = 'Gal9amar/new-unlock';
const FILE_PATH = 'data/reviews.json';

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'he-IL,he;q=0.9',
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.end();
  });
}

function githubRequest(method, path, token, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.github.com',
      path,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'unlock-netlify-function',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data || '{}') }));
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function parseReviews(html) {
  const ratingMatch = html.match(/(\d+\.\d+)\s*(?:\/10|מתוך\s*10)/);
  const countMatch  = html.match(/(\d+)\s*(?:חוות דעת|ביקורות)/);
  const datePattern = /(\d{2}\/\d{2}\/\d{4})/g;
  const namePattern = /(?:class="[^"]*name[^"]*"[^>]*>)([^<]+)/gi;
  const textPattern = /(?:class="[^"]*comment[^"]*"[^>]*>|class="[^"]*review-text[^"]*"[^>]*>)([^<]{15,300})/gi;

  const names = [...html.matchAll(namePattern)].map(m => m[1].trim());
  const texts = [...html.matchAll(textPattern)].map(m => m[1].trim().replace(/\s+/g, ' '));
  const dates = [...html.matchAll(datePattern)].map(m => m[1]);

  const INVALID = ['הכל', 'גבי', 'כל', 'ביקורות', 'דירוג', ''];
  const reviews = [];
  const len = Math.min(names.length, texts.length, 20);
  for (let i = 0; i < len; i++) {
    if (texts[i]?.length > 15 && names[i] && !INVALID.includes(names[i].trim())) {
      reviews.push({ name: names[i], rating: null, date: dates[i] || '', text: texts[i] });
    }
  }
  return {
    overallRating: ratingMatch ? parseFloat(ratingMatch[1]) : null,
    totalReviews:  countMatch  ? parseInt(countMatch[1])    : null,
    reviews
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const GITHUB_PAT = process.env.GITHUB_PAT;
  if (!GITHUB_PAT) return { statusCode: 500, body: JSON.stringify({ error: 'GITHUB_PAT not set' }) };

  let html = '';
  try {
    const res = await fetchUrl(MIDRAG_URL);
    html = res.body;
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch midrag: ' + e.message }) };
  }

  const { overallRating, totalReviews, reviews } = parseReviews(html);

  const fallback = [
    { name: "עמית עזר, נס ציונה.", rating: null, date: "05/04/2026", text: "הוא היה בסדר גמור, והשירות מצוין!" },
    { name: "שי שיוביץ, נס ציונה.", rating: null, date: "24/03/2026", text: "הוא היה 100 אחוז. הוא טוב מאוד והיה בסדר גמור." },
    { name: "דנית ש. נס ציונה.", rating: null, date: "22/03/2026", text: "הוא היה ממש נחמד! בא מהר וסיים מהר." },
    { name: "שרון שפיר, נס ציונה.", rating: null, date: "18/03/2026", text: "הגיע מהר, עבד מקצועי ומחיר הוגן. ממליצה בחום!" },
    { name: "שלמה וייס", rating: null, date: "08/02/2026", text: "גבי היה בסדר גמור! הייתה לי עוד בעיה אחרת בדלת. הוא סידר את זה ולא לקח תשלום." },
    { name: "גילי צמח, יבנה.", rating: null, date: "09/12/2025", text: "הוא מהמם, דייקן ומגיע בזמן!" },
  ];

  const finalReviews = reviews.length >= 4 ? reviews : fallback;
  const featured = [...finalReviews].sort((a, b) => {
    const da = a.date ? a.date.split('/').reverse().join('') : '0';
    const db = b.date ? b.date.split('/').reverse().join('') : '0';
    return db.localeCompare(da);
  }).slice(0, 6);

  const output = {
    updatedAt:     new Date().toISOString(),
    overallRating: overallRating || 9.94,
    totalReviews:  totalReviews  || 66,
    sourceUrl:     MIDRAG_URL,
    featured
  };

  const getRes = await githubRequest('GET', `/repos/${GITHUB_REPO}/contents/${FILE_PATH}`, GITHUB_PAT);
  if (getRes.status !== 200) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to get file SHA' }) };
  }
  const sha = getRes.body.sha;

  const content = Buffer.from(JSON.stringify(output, null, 2)).toString('base64');
  const putRes = await githubRequest('PUT', `/repos/${GITHUB_REPO}/contents/${FILE_PATH}`, GITHUB_PAT, {
    message: `Update reviews: ${output.totalReviews} ביקורות, דירוג ${output.overallRating}`,
    content,
    sha
  });

  if (putRes.status !== 200 && putRes.status !== 201) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to write to GitHub' }) };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      success: true,
      rating: output.overallRating,
      total: output.totalReviews,
      reviews: featured.length,
      usedFallback: reviews.length < 4
    })
  };
};
