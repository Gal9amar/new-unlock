// צבעים לכל סטטוס
const STATUS_CLASSES = {
  "מבצע": "product-status status-sale",
  "חדש": "product-status status-new",
  "מומלץ": "product-status status-recommended",
  "חם": "product-status status-hot animate-pulse",
  "מיוחד": "product-status status-special",
  default: "product-status status-default"
};

let allProducts = [];
let selectedBrand = null;
let productOrder = [];

// עדכון כפתור מצב כהה/בהיר
function updateDarkModeButton() {
  const btn = document.getElementById('toggle-dark');
  const isDark = document.documentElement.classList.contains('dark');
  if (!btn) return;
  if (isDark) {
    btn.innerHTML = '☀️ שנה לבהיר';
    btn.setAttribute('aria-label', 'עבור למצב בהיר');
    btn.setAttribute('aria-pressed', 'true');
  } else {
    btn.innerHTML = '🌙 שנה לכהה';
    btn.setAttribute('aria-label', 'עבור למצב כהה');
    btn.setAttribute('aria-pressed', 'false');
  }
}

// Dark mode: שמירה והחלפה
function setDarkMode(enabled) {
  if (enabled) {
    document.documentElement.classList.add('dark');
    localStorage.setItem('darkMode', '1');
  } else {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('darkMode', '0');
  }
  updateDarkModeButton();
}

// אתחול מצב כהה אם נבחר או ברירת מחדל בדפדפן
; (function () {
  const fromStorage = localStorage.getItem('darkMode');
  if (
    fromStorage === '1' ||
    (fromStorage === null && window.matchMedia('(prefers-color-scheme: dark)').matches)
  ) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
})()

document.addEventListener('DOMContentLoaded', () => {
  updateDarkModeButton();
  const btn = document.getElementById('toggle-dark');
  if (btn) {
    btn.addEventListener('click', () => {
      const isDark = document.documentElement.classList.contains('dark');
      setDarkMode(!isDark);
    });
  }
  loadProducts();
})

// טען מוצרים, קטגוריות, והצג
function applyProductOrdering(products) {
  if (!Array.isArray(products)) {
    return [];
  }

  if (!Array.isArray(productOrder) || productOrder.length === 0) {
    return [...products];
  }

  const orderMap = new Map();
  productOrder.forEach((title, index) => {
    if (typeof title === 'string') {
      orderMap.set(title, index);
    }
  });

  const originalIndexMap = new Map();
  products.forEach((product, index) => {
    originalIndexMap.set(product, index);
  });

  const fallbackIndex = Number.MAX_SAFE_INTEGER;

  return [...products].sort((a, b) => {
    const aTitle = typeof a.title === 'string' ? a.title.trim() : '';
    const bTitle = typeof b.title === 'string' ? b.title.trim() : '';
    const aIndex = orderMap.has(aTitle) ? orderMap.get(aTitle) : fallbackIndex;
    const bIndex = orderMap.has(bTitle) ? orderMap.get(bTitle) : fallbackIndex;

    if (aIndex !== bIndex) {
      return aIndex - bIndex;
    }

    return (originalIndexMap.get(a) || 0) - (originalIndexMap.get(b) || 0);
  });
}

async function loadProducts() {
  const grid = document.getElementById('products-grid');
  if (grid) {
    grid.setAttribute('aria-busy', 'true');
  }
  try {
    const res = await fetch('products.json', { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`Failed to load products (status ${res.status})`);
    }

    const payload = await res.text();

    let parsed;
    try {
      parsed = JSON.parse(payload);
    } catch (parseErr) {
      console.error('Invalid products.json payload sample:', payload.slice(0, 200));
      throw parseErr;
    }

    if (!Array.isArray(parsed)) {
      throw new Error('Products payload is not an array');
    }

    try {
      const orderRes = await fetch('product_order.json', { cache: 'no-store' });
      if (orderRes.ok) {
        const orderPayload = await orderRes.text();
        const parsedOrder = JSON.parse(orderPayload);
        if (Array.isArray(parsedOrder)) {
          productOrder = parsedOrder
            .map(item => (typeof item === 'string' ? item.trim() : ''))
            .filter(Boolean);
        } else {
          console.warn('product_order.json payload is not an array');
          productOrder = [];
        }
      } else {
        if (orderRes.status !== 404) {
          console.warn(`Failed to load product order (status ${orderRes.status})`);
        }
        productOrder = [];
      }
    } catch (orderErr) {
      console.warn('Unable to load product order file:', orderErr);
      productOrder = [];
    }

    allProducts = applyProductOrdering(parsed);
    renderBrands();
    renderProducts();
  } catch (e) {
    if (grid) {
      grid.innerHTML = '<div class="products-message products-message--error" role="status">שגיאה בטעינת מוצרים. בדקו שעבדתם מתוך שרת ולא מקובץ מקומי.</div>';
      grid.setAttribute('aria-busy', 'false');
    }
    console.error('loadProducts error:', e);
  }
}

// רצועת קטגוריות (מותגים)
function renderBrands() {
  const brandCats = document.getElementById('brand-cats');
  if (!brandCats) return;

  const brands = [...new Set(allProducts.map(p => p.brand).filter(Boolean))];
  const allButtonPressed = !selectedBrand ? 'true' : 'false';
  const allButton = `<button type="button" class="brand-button ${!selectedBrand ? 'is-active' : ''}" onclick="selectBrand(null)" aria-pressed="${allButtonPressed}">הכל</button>`;
  const brandButtons = brands
    .map(brand => {
      const encoded = JSON.stringify(brand);
      const activeClass = selectedBrand === brand ? ' is-active' : '';
      const pressed = selectedBrand === brand ? 'true' : 'false';
      return `<button type="button" class="brand-button${activeClass}" onclick='selectBrand(${encoded})' aria-pressed="${pressed}">${brand}</button>`;
    })
    .join('');

  brandCats.innerHTML = allButton + brandButtons;
}

// סינון לפי מותג
function selectBrand(brand) {
  selectedBrand = brand;
  renderBrands();
  renderProducts();
}
window.selectBrand = selectBrand;

// רינדור כרטיסי מוצר

function renderProducts() {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  const products = selectedBrand
    ? allProducts.filter(p => p.brand === selectedBrand)
    : allProducts;

  if (!products.length) {
    grid.innerHTML = '<div class="products-message products-message--muted" role="status">לא נמצאו מוצרים.</div>';
    grid.setAttribute('aria-busy', 'false');
    return;
  }

  const cards = products
    .map((product, idx) => {
      const messageParts = [
        `שלום, אני מתעניין במוצר: ${product.title}`
      ];

      if (product.discount_price) {
        messageParts.push(` - מחיר ${product.price_from ? 'החל מ־' : ''}${product.discount_price} ש"ח במבצע`);
      } else if (product.price) {
        messageParts.push(` - מחיר ${product.price_from ? 'החל מ־' : ''}${product.price} ש"ח`);
      }

      const waText = encodeURIComponent(messageParts.join(''));
      const waLink = product.whatsapp
        ? `https://wa.me/${product.whatsapp}?text=${waText}`
        : '';

      const statusKey = product.status || 'default';
      const statusClass = STATUS_CLASSES[statusKey] || STATUS_CLASSES.default;
      let statusHtml = '';
      if (product.status) {
        const safeStatus = product.status.replace(/"/g, '&quot;');
        if (product.status === 'חם') {
          statusHtml = `<span class="${statusClass}" aria-label="${safeStatus}"><span aria-hidden="true">🔥</span> ${safeStatus}</span>`;
        } else {
          statusHtml = `<span class="${statusClass}" aria-label="${safeStatus}">${safeStatus}</span>`;
        }
      }

      let priceHtml = '';
      if (product.discount_price) {
        priceHtml = `
          <span class="product-price-current">
            ${product.price_from ? 'החל מ־' : ''}₪${product.discount_price}
          </span>
          <span class="product-price-old">₪${product.price}</span>
        `;
      } else if (product.price) {
        priceHtml = `
          <span class="product-price-current">
            ${product.price_from ? 'החל מ־' : ''}₪${product.price}
          </span>
        `;
      } else {
        priceHtml = '<span class="product-price-contact">חייגו להצעת מחיר</span>';
      }

      const noteHtml = product.note
        ? `<span class="product-note">${product.note}</span>`
        : '';

      const safeTitle = product.title
        ? product.title.replace(/"/g, '&quot;')
        : '';

      const tagsHtml = (product.tags || [])
        .map(tag => `<span class="tag-chip">${tag}</span>`)
        .join('');

      const tagContainer = tagsHtml
        ? `<div class="product-tags">${tagsHtml}</div>`
        : '';

      const delay = idx * 60;

      return `
        <div class="product-card animate-fadein" style="animation-delay:${delay}ms;" role="listitem" tabindex="0" aria-label="${safeTitle}">
          ${statusHtml}
          <div class="product-image-wrapper">
            <img src="${product.image}" alt="${product.title}" class="product-image" loading="lazy">
          </div>
          <div class="product-content">
            <h4 class="product-title">${product.title}</h4>
            <p class="product-description">${product.desc || ''}</p>
            <div class="product-price">
              ${priceHtml}
            </div>
            ${noteHtml}
          </div>
          <div class="product-actions">
            ${product.whatsapp ? `
              <a href="${waLink}" class="btn btn-whatsapp" aria-label="הזמן את המוצר" target="_blank" rel="noopener">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="install-icon"><path fill="currentColor" d="M12 2A10 10 0 0 0 2 12a9.96 9.96 0 0 0 1.44 5.23L2 22l4.93-1.43A9.95 9.95 0 0 0 12 22a10 10 0 1 0 0-20zm0 18c-1.45 0-2.88-.36-4.13-1.05l-.3-.17-2.92.84.83-2.85-.18-.29A7.97 7.97 0 0 1 4 12a8 8 0 1 1 8 8zm4.23-5.36-.75-.37c-.2-.1-.44-.2-.7-.12-.19.06-.42.22-.68.44-.27.22-.53.27-.73.13a6.47 6.47 0 0 1-2.04-2.04c-.14-.2-.09-.46.13-.73.22-.26.37-.49.44-.68.08-.26-.02-.5-.12-.7l-.37-.75c-.18-.37-.6-.52-.94-.39-.98.4-1.57 1.22-1.37 2.18.13.59.54 1.26 1.21 1.92.67.68 1.34 1.08 1.93 1.21.96.2 1.78-.39 2.18-1.37.13-.34-.02-.76-.39-.94z"/></svg>
                הזמן
              </a>
            ` : ''}
          </div>
          ${tagContainer}
        </div>
      `;
    })
    .join('');

  grid.innerHTML = cards;
  grid.setAttribute('aria-busy', 'false');
}

