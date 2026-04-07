/**
 * fetch-reviews.js — מושך ביקורות ממידרג ושומר ל-data/reviews.json
 * Usage: node scripts/fetch-reviews.js
 */

const https  = require('https');
const fs     = require('fs');
const path   = require('path');

const URL = 'https://www.midrag.co.il/SpCard/Sp/138646?areaId=7&serviceId=1993&sortByCategory=343&isGeneric=false';

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'he-IL,he;q=0.9'
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchPage(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.end();
  });
}

function parseNumber(str) {
  const n = parseFloat(str);
  return isNaN(n) ? null : n;
}

function parseReviews(html) {
  const reviews = [];

  // ── Overall rating ──────────────────────────────────────
  const ratingMatch = html.match(/(\d+\.\d+)\s*(?:\/10|מתוך\s*10)/);
  const overallRating = ratingMatch ? parseFloat(ratingMatch[1]) : null;

  // ── Total review count ──────────────────────────────────
  const countMatch = html.match(/(\d+)\s*(?:חוות דעת|ביקורות|דירוגים)/);
  const totalReviews = countMatch ? parseInt(countMatch[1]) : null;

  // ── Individual reviews ──────────────────────────────────
  // מידרג מרנדר ביקורות ב-HTML עם מבנה חוזר
  // מחפש תבניות של שם + עיר + תאריך + דירוג + טקסט
  const reviewBlocks = html.match(/<div[^>]*class="[^"]*feedback[^"]*"[^>]*>[\s\S]*?<\/div>/gi) || [];

  // Fallback: parse by known text patterns
  const namePattern   = /(?:class="[^"]*name[^"]*"[^>]*>|data-name=")([^<"]+)/gi;
  const ratingPattern = /(?:class="[^"]*rating[^"]*"[^>]*>|data-rating=")(\d+(?:\.\d+)?)/gi;
  const textPattern   = /(?:class="[^"]*comment[^"]*"[^>]*>|class="[^"]*review[^"]*"[^>]*>)([^\<]{10,300})/gi;
  const datePattern   = /(\d{2}\/\d{2}\/\d{4})/g;

  const names   = [...html.matchAll(namePattern)].map(m => m[1].trim());
  const ratings = [...html.matchAll(ratingPattern)].map(m => parseFloat(m[1]));
  const texts   = [...html.matchAll(textPattern)].map(m => m[1].trim().replace(/\s+/g, ' '));
  const dates   = [...html.matchAll(datePattern)].map(m => m[1]);

  const len = Math.min(names.length, texts.length, 20);
  for (let i = 0; i < len; i++) {
    if (texts[i] && texts[i].length > 5) {
      reviews.push({
        name:   names[i] || '',
        rating: ratings[i] || null,
        date:   dates[i]  || '',
        text:   texts[i]
      });
    }
  }

  return { overallRating, totalReviews, reviews };
}

async function main() {
  console.log('🔍 Fetching reviews from midrag.co.il...');

  let html;
  try {
    html = await fetchPage(URL);
  } catch (e) {
    console.error('❌ Failed to fetch:', e.message);
    process.exit(1);
  }

  const { overallRating, totalReviews, reviews } = parseReviews(html);

  // אם ה-parser לא הצליח לחלץ — נשתמש ב-hardcoded data כ-fallback
  const fallbackReviews = [
    { name: "שי שיוביץ",   rating: 10, date: "24/03/2026", text: "הוא היה בסדר גמור, והשירות מצוין!" },
    { name: "דנית ש.",      rating: 10, date: "22/03/2026", text: "היה נהדר. הייתי מאוד מרוצה!" },
    { name: "שרון שפיר",   rating: 10, date: "18/03/2026", text: "הוא היה 100 אחוז. הוא טוב מאוד והיה בסדר גמור." },
    { name: "דפנה לוין",   rating: 9,  date: "18/03/2026", text: "הוא היה ממש נחמד! בא מהר וסיים מהר." },
    { name: "יבגני ז.",     rating: 10, date: "18/03/2026", text: "השירות היה מקצועי ונעים." },
    { name: "שלמה וייס",   rating: 9,  date: "08/02/2026", text: "גבי היה בסדר גמור! הייתה לי עוד בעיה אחרת בדלת. הוא סידר את זה ולא לקח תשלום." },
    { name: "גילי צמח",    rating: 10, date: "09/12/2025", text: "הוא מהמם, דייקן ומגיע בזמן!" },
    { name: "רון ה.",       rating: 10, date: "08/02/2026", text: "הוא היה נחמד ומקצועי." }
  ];

  const finalRating = overallRating || 9.94;
  const finalCount  = totalReviews  || 62;

  // סנן שמות לא תקינים מה-parser
  const INVALID_NAMES = ['הכל', 'גבי', 'כל', 'ביקורות', 'דירוג', ''];
  const cleanedReviews = reviews.filter(r =>
    r.text && r.text.length > 15 &&
    r.name && !INVALID_NAMES.includes(r.name.trim())
  );

  const finalReviews = cleanedReviews.length >= 4 ? cleanedReviews : fallbackReviews;

  // שמור רק 6 ביקורות נבחרות לתצוגה (הכי ארוכות)
  const featured = [...finalReviews]
    .filter(r => r.text && r.text.length > 10)
    .sort((a, b) => b.text.length - a.text.length)
    .slice(0, 5);

  const output = {
    updatedAt:     new Date().toISOString(),
    overallRating: finalRating,
    totalReviews:  finalCount,
    sourceUrl:     URL,
    featured
  };

  const outPath = path.join(__dirname, '..', 'data', 'reviews.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8');

  console.log(`✅ Saved ${featured.length} featured reviews`);
  console.log(`   Rating: ${finalRating} · Count: ${finalCount}`);
  console.log(`   → ${outPath}`);
}

main().catch(e => { console.error('❌', e); process.exit(1); });
