# CLAUDE.md – אפיון פרויקט UNLOCK 2025

## מה הפרויקט

אתר שירותי מנעולנות מקצועי עבור **גבי המנעולן – UNLOCK**.
שירות 24/7 באזור המרכז והדרום.
טלפון: 053-388-8381 | מייל: unlock.yavne@gmail.com
דומיין: https://www.hamanulan.com

---

## מבנה קבצים

```
Unluck_2025/
├── index.html              ← דף הבית
├── product.html            ← דף מוצר בודד
├── netlify.toml            ← הגדרות פריסה
├── CNAME                   ← hamanulan.com
├── robots.txt, sitemap.xml ← SEO
├── pages/
│   ├── admin.html          ← פאנל ניהול מוצרים
│   ├── sendinfo.html       ← טופס שליחת פרטים
│   ├── survey.html         ← סקר שביעות רצון לקוחות
│   ├── thankyou.html       ← דף תודה (לאחר מילוי טפסים)
│   ├── accessibility.html  ← הצהרת נגישות
│   ├── privacy-policy.html ← מדיניות פרטיות
│   └── terms-of-service.html ← תנאי שימוש
├── data/
│   ├── products.json       ← קטלוג מוצרים (מקור האמת)
│   └── product_order.json  ← סדר הצגת המוצרים
├── styles/
│   ├── main.css            ← מערכת עיצוב מרכזית (index, product, legal)
│   ├── admin.css           ← עיצוב פאנל ניהול
│   ├── sendinfo.css        ← עיצוב טופס שליחת פרטים
│   ├── survey.css          ← עיצוב סקר שביעות רצון
│   └── thankyou.css        ← עיצוב דף תודה
├── scripts/
│   ├── main.js             ← לוגיקת דף הבית ומוצרים
│   ├── product.js          ← לוגיקת דף מוצר בודד
│   └── accessibility.js    ← ווידג'ט UserWay
└── images/                 ← תמונות, לוגו, אייקונים
```

---

## תלויות חיצוניות

```html
<!-- גופן עברית -->
<link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

<!-- נגישות UserWay -->
<script src="https://cdn.userway.org/widget.js" data-account="..."></script>
```

- **אין npm / package.json** – פרויקט vanilla (ללא build step)
- **Netlify** – פריסה ישירה מ-GitHub repo: `Gal9amar/new-unlock`
- **WhatsApp** – לינקים בפורמט: `https://wa.me/972533888381?text=...`

---

## פריסה (Deploy)

1. Push ל-GitHub repo `Gal9amar/new-unlock` ← Netlify מתעדכן אוטומטית
2. CNAME מוגדר: `hamanulan.com` → Netlify
3. `netlify.toml` – מגדיר תיקיית functions: `netlify/functions`
4. **אין build command** – הקבצים נפרסים as-is

---

## פאנל Admin (pages/admin.html)

- **כניסה**: סיסמה קבועה בקוד (לא לשנות ללא עדכון בקוד)
- **GitHub Token**: נשמר ב-localStorage של הדפדפן (`gh_token`)
  - יש להזין בכניסה הראשונה: Personal Access Token עם הרשאת `repo`
- **מה עושה**: קורא ומעדכן `products.json` ישירות דרך GitHub API
- **שמירה**: PUT ל-`https://api.github.com/repos/Gal9amar/new-unlock/contents/products.json`
- **לא** עורך את `product_order.json` – זה ידני בקוד

---

## flow דפים

```
index.html
  ├── לחיצה על מוצר → product.html?name=שם_מוצר
  ├── לחיצה "שלח פרטים" → pages/sendinfo.html → pages/thankyou.html
  └── סקר (לינק נפרד) → pages/survey.html → pages/thankyou.html
```

---

## מוצרים

### מבנה אובייקט ב-data/products.json

```json
{
  "title": "שם המוצר",           // ← מזהה ייחודי, חייב להתאים ל-product_order.json
  "desc": "תיאור",
  "image": "images/file.webp",   // ← נתיב יחסי מהשורש
  "price": 770,                  // ← מחיר מלא (מספר)
  "discount_price": 550,         // ← מחיר מבצע (מספר) – השמט אם אין
  "price_from": false,           // ← true = "החל מ-" (כשמחיר משתנה לפי גודל וכד')
  "brand": "מולטילוק",
  "category": "צילינדרים",
  "status": "",                  // ← "חדש" | "חם" | "מבצע" | "" (ריק = ללא תג)
  "tags": ["תג1", "תג2"],
  "phone": "0533888381",
  "whatsapp": "972533888381",
  "note": "כולל שירות והתקנה",
  "including_vat": "n"           // ← "n" = לא כולל מע"מ | "y" = כולל
}
```

### קטגוריות קיימות

`צילינדרים` | `מנעולים חכמים` | `מנעולים עליונים` | `מנעולים מכאניים` | `דלתות` | `מנעול ויטרינה` | `שונות`

### מותגים קיימים

`מולטילוק` | `רב בריח` | `EVVA` | `Elock` | `וועד בניין` | `שונות`

### סדר מוצרים

`data/product_order.json` – מערך שמות לפי הסדר הרצוי.
חייב להכיל את **כל** השמות מ-products.json (התאמה מדויקת לפי `title`).
לאחר הוספת מוצר ב-products.json → יש להוסיף את שמו גם כאן.

---

## CSS – מוסכמות

- **כל דף HTML יש לו קובץ CSS משלו** ב-`styles/`
- `styles/main.css` – עיצוב ראשי משותף (index, product, legal pages)
- קבצי CSS נוספים לפי דף: `admin.css`, `sendinfo.css`, `survey.css`, `thankyou.css`
- שמות קלאסים: kebab-case (`product-card`, `hero-section`)
- משתני CSS מוגדרים ב-`:root` (צבעים, spacing, גדלי פונט)
- Media queries: `min-width: 768px` = דסקטופ | מתחת = מובייל

### ניווט (Navbar) – מובייל

- `.navbar-links` – מוצג בכל המסכים
- `.nav-desktop-only` – מוסתר במובייל, מוצג מ-768px ומעלה
- מובייל: **לוגו (שמאל) | מוצרים (מרכז) | טלפון (ימין)** – כל אחד `flex: 1`

---

## JavaScript – מוסכמות

- שמות פונקציות: camelCase (`initProducts`, `goToProduct`)
- כניסה לדף: `DOMContentLoaded` מפעיל את כל פונקציות ה-init
- מוצרים נטענים async מ-JSON עם `Promise.all()`
- ניווט למוצר בודד: `goToProduct(name)` → `product.html?name=...`

---

## תמונות (images/)

תמונות מוצרים קיימות:

| קובץ | שימוש |
|------|-------|
| `fav.png` | לוגו + favicon + fallback לתמונה שבורה |
| `MTL800.webp` | MTL™800 מולטילוק |
| `600.jpg` | MTL™600 מולטילוק |
| `lockung-product-locxis.png` | Locxis רב בריח |
| `jUWEL.jpg` | JUWEL מולטילוק |
| `4ks.jpg` | EVVA 4KS |
| `כספת.jpg` | מנעול כספת עליון רב בריח |
| `צילינדר-רב-בריח-דינאמיק.webp` | Dynamic+ רב בריח |
| `שבת.jpg` | מנעול מכאני לשומרי שבת |
| `מעלית.jpg` | חיפוי מעלית בלוחות עץ |
| `מיגון לובי.jpeg` | חיפוי לובי לבניינים חדשים |
| `מנעול ארון חשמל.png` | מנעול לארון חשמל/תיבת דואר |
| `מנעול ויטרינה.png` | מנעול לדלת ויטרינה / גינה |
| `פלדלת_משופר.png` | דלת פלדלת תואמת רב בריח |
| `דלת ממד2.jpg` | קיצור דלת ממד |
| `open_door.jpg` | שינוי כיוון דלת מחסן |
| `ידית חכמה.png` | רב בריח ידית קוד אלקטרו-ביומטרית |
| `elock.jpg` | Elock Wize Pro מנעול חכם |
| `גומי ממד.png` | גומיות לדלת ממ"ד |
| `כיוון דלת.png` | כיוון דלת ממ"ד |

---

## פיצ'רים עיקריים

- **סינון לפי מותג** – פילטר דינמי, כולל "הכל"
- **מחיר עם הנחה** – מחיר מקורי + מבצע + אחוז חיסכון
- **price_from** – מציג "החל מ-₪X" כשהמחיר משתנה
- **אנימציות** – IntersectionObserver לכרטיסים, counter animation לסטטיסטיקות
- **Dark Mode** – שמירה ב-localStorage
- **WhatsApp** – הודעה מולאה מראש עם פרטי המוצר
- **SEO** – schema.org (Locksmith type), Open Graph, Twitter Card, meta דינמי בדף מוצר
- **נגישות** – skip-link, ARIA labels, UserWay widget

---

## כללים חשובים

1. **data/products.json הוא מקור האמת** – כל שינוי במוצרים נעשה שם
2. **data/product_order.json** – לאחר הוספת מוצר, להוסיף שמו גם כאן (התאמה מדויקת)
3. לכל קובץ HTML יש קובץ CSS משלו ב-`styles/` – לא להוסיף inline styles
4. תמיד לבדוק RTL בעברית לאחר שינויים בלייאאוט
5. מובייל קודם – לבדוק תמיד על מסך צר לפני דסקטופ
6. אין build – שינוי קובץ = מיד בפרודקשן לאחר push
