/**
 * generate-ssg.js — SSG Script for UNLOCK product pages
 * Usage: node scripts/generate-ssg.js
 * Creates: products/{slug}/index.html for every product in Firestore
 */

const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');

// ── Init Firebase ──────────────────────────────────────────
const serviceAccount = require('../firebase-service-account.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// ── Helpers ────────────────────────────────────────────────
function slugify(title) {
  return title
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\u0590-\u05ffa-zA-Z0-9\-]/g, '')
    .toLowerCase();
}

function formatPrice(product) {
  if (product.discount_price) {
    const pct = Math.round(((product.price - product.discount_price) / product.price) * 100);
    return `<span class="product-price-sale">₪${product.discount_price}</span>
            <span class="product-price-original">₪${product.price}</span>
            <span class="product-discount-badge">-${pct}%</span>`;
  }
  return `<span class="product-price-sale">${product.price_from ? 'החל מ-' : ''}₪${product.price}</span>`;
}

function statusClass(s) {
  return { 'מבצע': 'sale', 'חדש': 'new', 'מומלץ': 'recommended', 'חם': 'hot', 'מיוחד': 'special' }[s] || 'default';
}

function relatedCard(p, slug) {
  const price = p.discount_price
    ? `<span class="product-price-sale">₪${p.discount_price}</span><span class="product-price-original">₪${p.price}</span>`
    : `<span class="product-price-sale">${p.price_from ? 'החל מ-' : ''}₪${p.price}</span>`;
  return `
  <div class="product-card" onclick="window.location.href='/products/${slug}/'">
    <div class="product-image-container">
      <img src="/${p.image || 'images/fav.png'}" alt="${p.title}" loading="lazy" onerror="this.src='/images/fav.png'" />
      ${p.status ? `<span class="product-status-badge status-${statusClass(p.status)}">${p.status}</span>` : ''}
    </div>
    <div class="product-info-card">
      <h3 class="product-name">${p.title}</h3>
      <p class="product-brand-text">מותג: <strong>${p.brand}</strong></p>
      <div class="product-pricing">${price}</div>
    </div>
  </div>`;
}

function buildHTML(product, related, slug) {
  const title    = `${product.title} | UNLOCK - גבי המנעולן`;
  const desc     = product.desc && product.desc.length > 155 ? product.desc.substring(0, 152) + '...' : (product.desc || '');
  const imageUrl = product.image ? `https://www.hamanulan.com/${product.image}` : 'https://www.hamanulan.com/images/fav.png';
  const pageUrl  = `https://www.hamanulan.com/products/${slug}/`;
  const price    = product.discount_price || product.price;
  const vatText  = product.including_vat === 'n' ? 'לא כולל מע״מ' : 'כולל מע״מ';

  const schema = JSON.stringify({
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": product.title,
    "description": product.desc || '',
    "image": imageUrl,
    "brand": { "@type": "Brand", "name": product.brand },
    "category": product.category || '',
    "offers": {
      "@type": "Offer",
      "url": pageUrl,
      "priceCurrency": "ILS",
      "price": price,
      "priceValidUntil": "2027-01-01",
      "availability": "https://schema.org/InStock",
      "seller": { "@type": "LocalBusiness", "name": "UNLOCK - גבי המנעולן", "telephone": "+972533888381" }
    }
  });

  const breadcrumb = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "דף הבית",  "item": "https://www.hamanulan.com/" },
      { "@type": "ListItem", "position": 2, "name": "מוצרים",   "item": "https://www.hamanulan.com/#products" },
      { "@type": "ListItem", "position": 3, "name": product.brand, "item": "https://www.hamanulan.com/#products" },
      { "@type": "ListItem", "position": 4, "name": product.title, "item": pageUrl }
    ]
  });

  const relatedHTML = related.length > 0 ? `
  <section class="related-products">
    <h2>מוצרים נוספים מאותו מותג</h2>
    <div class="products-grid">
      ${related.map(r => relatedCard(r, slugify(r.title))).join('\n')}
    </div>
  </section>` : '';

  const tagsHTML = product.tags && product.tags.length > 0
    ? product.tags.map(t => `<span class="product-tag">${t}</span>`).join('')
    : '';

  const statusHTML = product.status
    ? `<span class="product-status-badge status-${statusClass(product.status)}">${product.status === 'מבצע' ? 'מוצר במבצע' : 'מוצר ' + product.status}</span>`
    : '';

  const waMsg = encodeURIComponent(`שלום גבי, אני מתעניין ב-${product.title} (${product.brand})`);
  const waNumber = product.whatsapp || '972533888381';

  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="theme-color" content="#0a1628" />
  <link rel="manifest" href="/manifest.json" />

  <title>${title}</title>
  <meta name="description" content="${desc}" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="${pageUrl}" />

  <!-- Open Graph -->
  <meta property="og:type" content="product" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:url" content="${pageUrl}" />
  <meta property="og:site_name" content="UNLOCK - גבי המנעולן" />
  <meta property="og:image" content="${imageUrl}" />
  <meta property="og:locale" content="he_IL" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${desc}" />
  <meta name="twitter:image" content="${imageUrl}" />

  <script type="application/ld+json">${schema}</script>
  <script type="application/ld+json">${breadcrumb}</script>

  <link rel="icon" href="/images/fav.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/styles/main.css?v=4.4" />
</head>

<body class="product-page">
  <a href="#main-content" class="skip-link">דלג לתוכן הראשי</a>

  <header class="product-header">
    <div class="container">
      <a href="/index.html" class="back-btn">← חזרה לכל המוצרים</a>
      <a href="/index.html" class="logo-link">
        <img src="/images/fav.png" alt="UNLOCK" class="header-logo" />
      </a>
      <a href="tel:0533888381" class="quick-call-btn">📞 התקשר עכשיו</a>
    </div>
  </header>

  <main id="main-content" class="product-main">
    <div class="container">
      <div class="product-details">

        <div class="product-gallery">
          <div class="product-image-main">
            <img src="/${product.image || 'images/fav.png'}" alt="${product.title}" onerror="this.src='/images/fav.png'" />
            ${statusHTML}
          </div>
        </div>

        <div class="product-info-main">
          <div class="product-breadcrumb">
            <a href="/index.html">דף הבית</a>
            <span>/</span>
            <a href="/index.html#products">מוצרים</a>
            <span>/</span>
            <span>${product.brand}</span>
          </div>

          <h1 class="product-title">${product.title}</h1>

          <div class="product-meta">
            <span class="product-brand-badge">מותג: <strong>${product.brand}</strong></span>
            <span class="product-category-badge">${product.category || ''}</span>
          </div>

          <div class="product-pricing-main">
            <div class="pricing-wrapper">${formatPrice(product)}</div>
            <span class="vat-indicator">${vatText}</span>
            ${product.note ? `<p class="product-note">${product.note}</p>` : ''}
          </div>

          <div class="product-description">
            <h2>תיאור המוצר</h2>
            <p>${product.desc || ''}</p>
          </div>

          ${tagsHTML ? `<div class="product-tags">${tagsHTML}</div>` : ''}

          <div class="product-cta">
            <a href="https://wa.me/${waNumber}?text=${waMsg}" class="btn btn-primary btn-large" target="_blank" rel="noopener noreferrer">
              💬 הזמן עכשיו ב-WhatsApp
            </a>
            <a href="tel:0533888381" class="btn btn-secondary btn-large">📞 התקשר: 053-388-8381</a>
          </div>

          <div class="product-features">
            <h3>יתרונות</h3>
            <ul>
              <li>✓ התקנה מקצועית על ידי טכנאי מוסמך</li>
              <li>✓ מוצרים מקוריים בלבד</li>
              <li>✓ אחריות יצרן מלאה</li>
              <li>✓ שירות 24/7</li>
            </ul>
          </div>
        </div>
      </div>

      ${relatedHTML}
    </div>
  </main>

  <footer class="site-footer">
    <div class="container">
      <div class="footer-content">
        <div class="footer-section">
          <img src="/images/fav.png" alt="UNLOCK" class="footer-logo" />
          <p>שירותי מנעולנות מקצועיים<br>זמין 24/7 באזור המרכז והדרום</p>
        </div>
        <div class="footer-section">
          <h3>צור קשר</h3>
          <ul>
            <li>📞 <a href="tel:0533888381">053-388-8381</a></li>
            <li>📧 <a href="mailto:unlock.yavne@gmail.com">unlock.yavne@gmail.com</a></li>
            <li>📍 יבנה, חרמון 14</li>
            <li>🕐 24/7 - זמין תמיד</li>
          </ul>
        </div>
        <div class="footer-section">
          <h3>עקבו אחרינו</h3>
          <div class="footer-social">
            <a href="https://www.facebook.com/gabihamanulan" target="_blank" rel="noopener noreferrer">Facebook</a>
            <a href="https://www.instagram.com/gabi.the.locksmith/" target="_blank" rel="noopener noreferrer">Instagram</a>
            <a href="https://wa.me/972533888381" target="_blank" rel="noopener noreferrer">WhatsApp</a>
          </div>
        </div>
        <div class="footer-section">
          <h3>מידע משפטי</h3>
          <ul>
            <li><a href="/pages/privacy-policy.html">מדיניות פרטיות</a></li>
            <li><a href="/pages/terms-of-service.html">תנאי שימוש</a></li>
            <li><a href="/pages/accessibility.html">הצהרת נגישות</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <p>&copy; 2026 UNLOCK - גבי המנעולן. כל הזכויות שמורות.</p>
      </div>
    </div>
  </footer>

  <button id="scrollToTop" class="scroll-to-top" hidden>↑</button>
  <script src="/scripts/security-warning.js"></script>
  <script src="/scripts/accessibility.js?v=2.0"></script>
  <script>
    const scrollBtn = document.getElementById('scrollToTop');
    window.addEventListener('scroll', () => {
      scrollBtn.hidden = window.scrollY <= 500;
    });
    scrollBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  </script>
</body>
</html>`;
}

// ── Main ───────────────────────────────────────────────────
async function main() {
  console.log('📦 Fetching products from Firestore...');
  const snap = await db.collection('products').orderBy('order').get();
  const products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`✅ Found ${products.length} products`);

  const outDir = path.join(__dirname, '..', 'products');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

  const sitemapUrls = [];

  for (const product of products) {
    const slug = slugify(product.title);
    if (!slug) { console.warn(`⚠ Skipping product with empty slug: ${product.title}`); continue; }

    const dir = path.join(outDir, slug);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const related = products
      .filter(p => p.brand === product.brand && p.title !== product.title)
      .slice(0, 3);

    const html = buildHTML(product, related, slug);
    fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
    console.log(`  ✓ products/${slug}/index.html`);

    sitemapUrls.push(`https://www.hamanulan.com/products/${slug}/`);
  }

  // ── Update sitemap.xml ──────────────────────────────────
  const today = new Date().toISOString().split('T')[0];
  const staticUrls = [
    { loc: 'https://www.hamanulan.com/',                        freq: 'weekly',  pri: '1.0' },
    { loc: 'https://www.hamanulan.com/pages/privacy-policy.html',  freq: 'yearly',  pri: '0.3' },
    { loc: 'https://www.hamanulan.com/pages/terms-of-service.html',freq: 'yearly',  pri: '0.3' },
    { loc: 'https://www.hamanulan.com/pages/accessibility.html',    freq: 'yearly',  pri: '0.3' },
  ];

  const productEntries = sitemapUrls.map(url => `  <url>
    <loc>${url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`).join('\n');

  const staticEntries = staticUrls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.freq}</changefreq>
    <priority>${u.pri}</priority>
  </url>`).join('\n');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticEntries}
${productEntries}
</urlset>`;

  fs.writeFileSync(path.join(__dirname, '..', 'sitemap.xml'), sitemap, 'utf8');
  console.log(`\n📋 sitemap.xml updated (${sitemapUrls.length + staticUrls.length} URLs)`);

  console.log('\n🎉 SSG complete! Run: git add . && git commit -m "ssg: generate product pages" && git push');
  process.exit(0);
}

main().catch(err => { console.error('❌ Error:', err); process.exit(1); });
