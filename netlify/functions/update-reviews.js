const https = require('https');
const { json, preflight } = require('./_lib/http');
const { verifyAdmin } = require('./_lib/verify-admin');
const { getDb } = require('./_lib/db');

const MIDRAG_URL = 'https://www.midrag.co.il/SpCard/Sp/138646?areaId=7&serviceId=1993&sortByCategory=343&isGeneric=false';
const GITHUB_REPO = 'Gal9amar/new-unlock';
const FILE_PATH = 'data/reviews.json';

// Buffers raw chunks and decodes once at the end instead of `data += chunk`,
// which corrupts multi-byte UTF-8 (e.g. Hebrew review text) whenever a
// character lands on a network chunk boundary — see migrate-to-turso.js for
// the same bug found and fixed there.
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
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
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
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') }));
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function parseReviews(html) {
  const ratingMatch = html.match(/דירוג כללי\s*([\d.]+)/) || html.match(/(\d+\.\d+)\s*(?:\/10|מתוך\s*10)/);
  const countMatch  = html.match(/(\d+)\s*(?:לקוחות מאומתים|חוות דעת|ביקורות|דירוגים)/);

  const reviews = [];
  const blockPattern = /<div[^>]+class="[^"]*feedback-container[^"]*"[^>]*>([\s\S]*?)(?=<div[^>]+class="[^"]*feedback-container|$)/gi;

  for (const blockMatch of html.matchAll(blockPattern)) {
    const block = blockMatch[1];
    const nameMatch = block.match(/class="[^"]*customer-name[^"]*"[^>]*>([^<]+)/i);
    const dateMatch = block.match(/משוב:\s*(\d{2}\/\d{2}\/\d{4})/);
    const textMatch = block.match(/class="[^"]*verbalreview[^"]*"[^>]*>\s*([^<]{5,300})/i);
    if (!nameMatch || !textMatch) continue;
    reviews.push({
      name:   nameMatch[1].trim(),
      rating: null,
      date:   dateMatch ? dateMatch[1] : '',
      text:   textMatch[1].trim().replace(/\s+/g, ' '),
      source: 'midrag',
    });
  }

  return {
    overallRating: ratingMatch ? parseFloat(ratingMatch[1]) : null,
    totalReviews:  countMatch  ? parseInt(countMatch[1])    : null,
    reviews
  };
}

// Our own 5-star satisfaction-survey submissions (see save-survey.js) that
// carry a real written comment — folded into the same "what customers say"
// carousel as the Midrag reviews, tagged `source: 'unlock'` so the front-end
// can badge them differently since (unlike Midrag) they're self-reported.
async function fetchSurveyReviews() {
  try {
    const db = getDb();
    const res = await db.execute(
      `SELECT customer_name, comment, created_at FROM surveys
       WHERE stars = '5' AND comment IS NOT NULL AND length(trim(comment)) > 10
       ORDER BY created_at DESC LIMIT 10`
    );
    return res.rows.map((r) => {
      const d = new Date(r.created_at);
      const date = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      return { name: r.customer_name, rating: 5, date, text: String(r.comment).trim(), source: 'unlock' };
    });
  } catch {
    return []; // never fail the whole refresh just because the survey table is unreachable
  }
}

// Uses the same shared JWT check as every other admin endpoint (see
// netlify/functions/_lib/verify-admin.js) — this used to be a third,
// separate re-implementation that called Firebase's Identity Toolkit
// REST API directly.
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method Not Allowed' });

  if (!verifyAdmin(event)) return json(403, { error: 'Forbidden' });

  const GITHUB_PAT = process.env.GITHUB_PAT;
  if (!GITHUB_PAT) return json(500, { error: 'GITHUB_PAT not set' });

  let html = '';
  try {
    const res = await fetchUrl(MIDRAG_URL);
    html = res.body;
  } catch (e) {
    return json(500, { error: 'Failed to fetch midrag: ' + e.message });
  }

  const { overallRating, totalReviews, reviews } = parseReviews(html);

  const fallback = [
    { name: "עמית עזר, נס ציונה.", rating: null, date: "05/04/2026", text: "הוא היה בסדר גמור, והשירות מצוין!", source: 'midrag' },
    { name: "שי שיוביץ, נס ציונה.", rating: null, date: "24/03/2026", text: "הוא היה 100 אחוז. הוא טוב מאוד והיה בסדר גמור.", source: 'midrag' },
    { name: "דנית ש. נס ציונה.", rating: null, date: "22/03/2026", text: "הוא היה ממש נחמד! בא מהר וסיים מהר.", source: 'midrag' },
    { name: "שרון שפיר, נס ציונה.", rating: null, date: "18/03/2026", text: "הגיע מהר, עבד מקצועי ומחיר הוגן. ממליצה בחום!", source: 'midrag' },
    { name: "שלמה וייס", rating: null, date: "08/02/2026", text: "גבי היה בסדר גמור! הייתה לי עוד בעיה אחרת בדלת. הוא סידר את זה ולא לקח תשלום.", source: 'midrag' },
  ];

  const HIDDEN_NAMES = ['נועה זכריה'];
  const filteredReviews = reviews.filter(r => !HIDDEN_NAMES.some(n => r.name.includes(n)));
  const finalReviews = filteredReviews.length >= 4 ? filteredReviews : fallback;
  const surveyReviews = await fetchSurveyReviews();
  const featured = [...finalReviews, ...surveyReviews]
    .filter(r => r.text && r.text.length > 10)
    .sort((a, b) => {
      const da = a.date ? a.date.split('/').reverse().join('') : '0';
      const db = b.date ? b.date.split('/').reverse().join('') : '0';
      return db.localeCompare(da);
    })
    .slice(0, 60); // sanity cap — front-end paginates 8 at a time via "טען עוד"

  const output = {
    updatedAt:     new Date().toISOString(),
    overallRating: overallRating || 9.94,
    totalReviews:  totalReviews  || 66,
    sourceUrl:     MIDRAG_URL,
    featured
  };

  const getRes = await githubRequest('GET', `/repos/${GITHUB_REPO}/contents/${FILE_PATH}`, GITHUB_PAT);
  if (getRes.status !== 200) {
    return json(500, { error: 'Failed to get file SHA' });
  }
  const sha = getRes.body.sha;

  const content = Buffer.from(JSON.stringify(output, null, 2)).toString('base64');
  const putRes = await githubRequest('PUT', `/repos/${GITHUB_REPO}/contents/${FILE_PATH}`, GITHUB_PAT, {
    message: `Update reviews: ${output.totalReviews} ביקורות, דירוג ${output.overallRating}`,
    content,
    sha
  });

  if (putRes.status !== 200 && putRes.status !== 201) {
    return json(500, { error: 'Failed to write to GitHub' });
  }

  return json(200, {
    success: true,
    rating: output.overallRating,
    total: output.totalReviews,
    reviews: featured.length,
    fromSurvey: surveyReviews.length,
    usedFallback: reviews.length < 4
  });
};
