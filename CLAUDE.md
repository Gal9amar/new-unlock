# CLAUDE.md – אפיון פרויקט UNLOCK מנעולנות

## מה הפרויקט

אתר שירותי מנעולנות מקצועי עבור **גבי המנעולן – UNLOCK**.
שירות 24/7 באזור המרכז והדרום.
טלפון: 053-388-8381 | מייל: unlock.yavne@gmail.com
דומיין: https://www.hamanulan.com

---

## מבנה קבצים

```
new-unlock/
├── index.html              ← דף הבית
├── product.html            ← דף מוצר בודד
├── firebase.json           ← הגדרות Firebase (functions)
├── .firebaserc             ← פרויקט Firebase: hamanulan-3bbc7
├── netlify.toml            ← הגדרות Netlify
├── CNAME                   ← hamanulan.com
├── robots.txt, sitemap.xml ← SEO
├── functions/              ← Firebase Functions (Node.js)
│   ├── index.js            ← products (public) + adminProducts (CRUD)
│   └── package.json
├── pages/
│   ├── admin.html          ← פאנל ניהול מוצרים
│   ├── sendinfo.html       ← טופס שליחת פרטי לקוח לחשבונית
│   ├── survey.html         ← סקר שביעות רצון לקוחות
│   ├── thankyou.html       ← דף תודה (לאחר מילוי sendinfo)
│   ├── accessibility.html  ← הצהרת נגישות
│   ├── privacy-policy.html ← מדיניות פרטיות
│   └── terms-of-service.html ← תנאי שימוש
├── styles/
│   ├── main.css            ← מערכת עיצוב מרכזית
│   └── ...
├── scripts/
│   ├── main.js             ← לוגיקת דף הבית ומוצרים
│   ├── product.js          ← לוגיקת דף מוצר בודד
│   ├── fetch-reviews.js    ← סקריפט ידני: מושך ביקורות ממדרג → data/reviews.json
│   └── accessibility.js    ← ווידג'ט UserWay
├── netlify/
│   └── functions/
│       └── update-reviews.js ← Netlify Function: מושך ביקורות ממדרג ומעדכן GitHub
├── data/
│   └── reviews.json        ← ביקורות ממדרג (נוצר אוטומטית)
└── images/                 ← תמונות, לוגו, אייקונים
```

---

## פריסה (Deploy)

- **Netlify** – פריסה ישירה מ-GitHub repo: `Gal9amar/new-unlock`
- Push ל-main → Netlify מתעדכן אוטומטית
- **אין build command** – הקבצים נפרסים as-is
- CNAME: `hamanulan.com` → Netlify

### Firebase Functions
```bash
firebase deploy --only functions --project hamanulan-3bbc7
```
- Node.js 20, region: `us-central1`

---

## צבעי הברנד

```css
--color-primary: #0a1628      /* כחול כהה – רקע ראשי */
--color-primary-700: #1a365d  /* כחול בינוני */
--color-gold: #d4a853         /* זהב – אקסנט ראשי */
--color-gold-light: #e8c87a   /* זהב בהיר */
--gradient-hero: linear-gradient(135deg, #0a1628 0%, #0f2247 40%, #1a365d 100%)
```

גופן: **Heebo** (Google Fonts) – עברית/RTL

---

## Firebase

### פרויקט
- **Project ID:** `hamanulan-3bbc7`
- **Auth:** Google Sign-In בלבד – משתמש מורשה: `gal9amar@gmail.com`
- **Firestore:** מסד נתונים מוצרים (region: europe-west1)

### Firebase Functions

| Function | גישה | תיאור |
|----------|------|-------|
| `products` | ציבורי | GET כל המוצרים לפי סדר |
| `adminProducts` | מוגן | GET/POST/PUT/DELETE מוצרים |
| `saveSurvey` | ציבורי | POST שמירת סקר שביעות רצון |
| `saveInvoice` | ציבורי | POST שמירת בקשת חשבונית |
| `adminSurveys` | מוגן | GET/DELETE סקרים |
| `adminInvoices` | מוגן | GET/PATCH/DELETE חשבוניות |
| `adminStats` | מוגן | GET סטטיסטיקות dashboard |
| `triggerBuild` | מוגן | POST הפעלת GitHub Action לבניית SSG |

### Firestore – מבנה Collection `products`

```json
{
  "title": "שם המוצר",
  "desc": "תיאור",
  "image": "images/file.webp",
  "price": 770,
  "discount_price": 550,
  "price_from": false,
  "brand": "מולטילוק",
  "category": "צילינדרים",
  "status": "",
  "tags": ["תג1", "תג2"],
  "phone": "0533888381",
  "whatsapp": "972533888381",
  "note": "כולל שירות והתקנה",
  "including_vat": "n",
  "order": 0
}
```

---

## מערכת ביקורות ממדרג

ביקורות נמשכות מ-`midrag.co.il` ונשמרות ב-`data/reviews.json`.

### URL מקור
```
https://www.midrag.co.il/SpCard/Sp/138646?areaId=7&serviceId=1993&sortByCategory=343&isGeneric=false
```

### קבצים

| קובץ | תיאור |
|------|-------|
| `scripts/fetch-reviews.js` | סקריפט ידני – `node scripts/fetch-reviews.js` |
| `netlify/functions/update-reviews.js` | Netlify Function – POST אוטומטי, מעדכן GitHub ישירות |

### מבנה data/reviews.json
```json
{
  "updatedAt": "ISO timestamp",
  "overallRating": 9.94,
  "totalReviews": 66,
  "sourceUrl": "...",
  "featured": [
    { "name": "שם", "rating": null, "date": "DD/MM/YYYY", "text": "טקסט הביקורת" }
  ]
}
```

### לוגיקה
- ה-parser מחלץ שמות + טקסטים + תאריכים מה-HTML של מדרג
- אם התוצאה < 4 ביקורות → fallback לרשימה hardcoded
- `featured` = 6 ביקורות ממוינות לפי תאריך (חדש ראשון)
- `GITHUB_PAT` נדרש כ-env variable ב-Netlify לכתיבה ל-GitHub API

---

## עמוד sendinfo (pages/sendinfo.html)

טופס שליחת פרטי לקוח לצורך הפקת חשבונית.

### שדות הטופס
| שדה | חובה | הערות |
|-----|------|--------|
| שם מלא | ✅ | |
| טלפון | ✅ | |
| כתובת מייל | ✅ | |
| ח.פ / ת.ז | ❌ | |
| כתובת קבלת השירות | ✅ | |
| תיאור השירות | ✅ | |
| סכום | ✅ | מספרים + נקודה בלבד |
| מע"מ | ✅ | כולל / לפני |
| שיטת תשלום | ✅ | ביט / המחאה / העברה בנקאית / מזומן |
| שם מידרג | ❌ | אופציונלי |

### שליחה
- Web3Forms API: `https://api.web3forms.com/submit`
- Access Key: `8f6811e4-edba-4ca8-8776-e39c6eaf1b72`
- שם הלקוח מועבר ב-URL לדף תודה: `/pages/thankyou.html?name=...`

### אחרי שליחה
- Redirect אוטומטי → `pages/thankyou.html?name=שם_לקוח`

---

## עמוד thankyou (pages/thankyou.html)

דף תודה אחרי שליחת sendinfo.
- מציג שם פרטי של הלקוח מה-URL param `?name=`
- עיצוב: רקע gradient כחול כהה, כרטיס glass, כפתור זהב
- CSS עצמאי (לא תלוי ב-main.css)
- `position: fixed` על main לריכוז מדויק ללא גלילה

---

## עמוד survey (pages/survey.html)

סקר שביעות רצון לקוחות לאחר מתן שירות.

### שאלות
1. דירוג כללי (כוכבים 1–5, תיבות עם מספר)
2. איכות העבודה הטכנית (4 אפשרויות)
3. זמן הגעה ומהירות (3 אפשרויות)
4. מחיר ושקיפות (3 אפשרויות)
5. שירות ויחס אישי (4 אפשרויות)
6. המלצה (3 אפשרויות)
7. הערות חופשיות (אופציונלי)

### שליחה
- Web3Forms – אותו access key
- נשלח למייל `unlock.yavne@gmail.com`

---

## פאנל Admin (pages/admin.html)

- **כניסה:** Google Sign-In – רק `gal9amar@gmail.com`
- **נתונים:** Firestore דרך Firebase Function `adminProducts`
- **פעולות:** הוספה / עריכה / מחיקה של מוצרים

---

## Flow דפים

```
index.html
  ├── לחיצה על מוצר → product.html?name=שם_מוצר
  ├── כפתור "שלח פרטים" → pages/sendinfo.html → pages/thankyou.html
  └── סקר שביעות רצון → pages/survey.html
```

---

## מוצרים

### קטגוריות
`צילינדרים` | `מנעולים חכמים` | `מנעולים עליונים` | `מנעולים מכאניים` | `דלתות` | `מנעול ויטרינה` | `שונות`

### מותגים
`מולטילוק` | `רב בריח` | `EVVA` | `Elock` | `וועד בניין` | `שונות`

---

## תלויות חיצוניות

```html
<!-- גופן עברית -->
<link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;600;700;800&display=swap"/>

<!-- נגישות UserWay -->
<script src="https://cdn.userway.org/widget.js" data-account="..."></script>

<!-- Firebase (admin בלבד) -->
<script type="module" src="https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js"></script>

<!-- Web3Forms (sendinfo + survey) -->
POST https://api.web3forms.com/submit
```

- **אין npm/build** בצד לקוח – vanilla JS
- **WhatsApp:** `https://wa.me/972533888381?text=...`

---

## כללים חשובים

1. **Firestore = מקור האמת** למוצרים – שינוי דרך Admin בלבד
2. עיצוב: כחול כהה `#0a1628` + זהב `#d4a853` בכל הדפים
3. כל שינוי = push ל-GitHub → Netlify מתעדכן אוטומטית
4. Firebase Functions = `firebase deploy --only functions`
5. תמיד לבדוק RTL + מובייל אחרי שינויי CSS
6. PAT לגיטהאב – לשלוח בכל session ולמחוק אחרי שימוש
