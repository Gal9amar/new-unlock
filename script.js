// צבעים לכל סטטוס
const STATUS_COLORS = {
  מבצע: 'bg-red-500',
  חדש: 'bg-green-600',
  מומלץ: 'bg-blue-600',
  חם: 'bg-orange-500 text-white border-2 border-orange-400 flex items-center gap-1',
  מיוחד: 'bg-purple-600',
  '': 'bg-gray-500'
}

let allProducts = []
let selectedBrand = null

// עדכון כפתור מצב כהה/בהיר
function updateDarkModeButton() {
  const btn = document.getElementById('toggle-dark')
  const isDark = document.documentElement.classList.contains('dark')
  if (!btn) return
  if (isDark) {
    btn.innerHTML = '☀️ מצב בהיר'
    btn.setAttribute('aria-label', 'עבור למצב בהיר')
  } else {
    btn.innerHTML = '🌙 מצב כהה'
    btn.setAttribute('aria-label', 'עבור למצב כהה')
  }
}

// Dark mode: שמירה והחלפה
function setDarkMode(enabled) {
  if (enabled) {
    document.documentElement.classList.add('dark')
    localStorage.setItem('darkMode', '1')
  } else {
    document.documentElement.classList.remove('dark')
    localStorage.setItem('darkMode', '0')
  }
  updateDarkModeButton()
}

// אתחול מצב כהה אם נבחר או ברירת מחדל בדפדפן
; (function () {
  const fromStorage = localStorage.getItem('darkMode')
  if (
    fromStorage === '1' ||
    (fromStorage === null &&
      window.matchMedia('(prefers-color-scheme: dark)').matches)
  ) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
})()

document.addEventListener('DOMContentLoaded', () => {
  updateDarkModeButton()
  const btn = document.getElementById('toggle-dark')
  if (btn) {
    btn.addEventListener('click', () => {
      const isDark = document.documentElement.classList.contains('dark')
      setDarkMode(!isDark)
    })
  }
  loadProducts()
})

// טען מוצרים, קטגוריות, והצג
async function loadProducts() {
  try {
    const res = await fetch('products.json')
    allProducts = await res.json()
    renderBrands()
    renderProducts()
  } catch (e) {
    document.getElementById('products-grid').innerHTML =
      '<div class="col-span-full text-center text-red-500">שגיאה בטעינת מוצרים</div>'
  }
}

// רצועת קטגוריות (מותגים)
function renderBrands() {
  const brandCats = document.getElementById('brand-cats')
  const brands = [...new Set(allProducts.map(p => p.brand).filter(Boolean))]
  brandCats.innerHTML =
    `<button class="px-4 py-2 rounded-full font-bold bg-blue-100 dark:bg-gray-800 text-blue-900 dark:text-blue-200 hover:bg-blue-300 transition text-center m-1"
    ${!selectedBrand ? 'style="border-bottom:2px solid #2563eb"' : ''}
    onclick="selectBrand(null)">הכל</button>` +
    brands
      .map(
        b =>
          `<button class="px-4 py-2 rounded-full font-bold bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-200 hover:bg-blue-300 transition text-center m-1"
        ${selectedBrand === b ? 'style="border-bottom:2px solid #2563eb"' : ''}
        onclick="selectBrand('${b}')">${b}</button>`
      )
      .join('')
}

// סינון לפי מותג
function selectBrand(brand) {
  selectedBrand = brand
  renderBrands()
  renderProducts()
}
window.selectBrand = selectBrand // כדי ש-JS ב-HTML יכיר

// רינדור כרטיסי מוצר

function renderProducts() {
  const grid = document.getElementById('products-grid')
  let products = selectedBrand
    ? allProducts.filter(p => p.brand === selectedBrand)
    : allProducts

  if (!products.length) {
    grid.innerHTML =
      '<div class="col-span-full text-center text-gray-400 dark:text-gray-600">לא נמצאו מוצרים.</div>'
    return
  }
  grid.innerHTML = ''
  products.forEach((product, idx) => {
    let msg =
      `שלום, אני מתעניין במוצר: ${product.title}` +
      (product.discount_price
        ? ` - מחיר ${product.price_from ? 'החל מ־' : ''}${product.discount_price
        } ש"ח במבצע`
        : product.price
          ? ` - מחיר ${product.price_from ? 'החל מ־' : ''}${product.price} ש"ח`
          : '')
    let waText = encodeURIComponent(msg)
    let waLink = `https://wa.me/${product.whatsapp}?text=${waText}`
    let statusClass = STATUS_COLORS[product.status] || STATUS_COLORS['']

    // סטטוס "חם" עם להבה
    let statusHtml = ''
    if (product.status === 'חם') {
      statusHtml = `<span class="absolute top-3 left-3 ${statusClass} rounded-full px-3 py-1 text-xs font-bold animate-pulse" aria-label="חם"><span aria-hidden="true">🔥</span> חם</span>`
    } else if (product.status) {
      statusHtml = `<span class="absolute top-3 left-3 ${statusClass} text-white rounded-full px-3 py-1 text-xs font-bold" aria-label="${product.status}">${product.status}</span>`
    }

    grid.innerHTML += `
        <div class="relative bg-white dark:bg-gray-900 rounded-2xl shadow-lg dark:shadow-xl p-5 flex flex-col min-h-[500px] items-center w-full max-w-xs min-w-[260px] md:max-w-md md:min-w-[320px] mx-auto transition hover:scale-105 hover:shadow-2xl duration-300 opacity-0 animate-fadein"
          style="animation-delay:${idx * 60}ms;">
          ${statusHtml}
          <div class="w-full mb-3 rounded-xl overflow-hidden flex items-center justify-center bg-gray-100 dark:bg-gray-800" style="height: 160px;">
            <img src="${product.image}" alt="${product.title
      }" class="w-full h-full object-fill" loading="lazy">
          </div>
          <!-- אזור התוכן עם מחיר ממורכז -->
          <div class="flex-1 w-full flex flex-col justify-between">
            <h4 class="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2 text-center">${product.title
      }</h4>
            <p class="text-gray-600 dark:text-gray-300 text-right mb-4 text-sm w-full">${product.desc
      }</p>
  <div class="w-full flex flex-col items-center justify-center mb-2">
    ${product.discount_price
        ? `
          <div class="flex items-baseline justify-center gap-2">
            <span class="text-2xl font-extrabold text-black dark:text-yellow-300 flex items-center">
              ${product.price_from ? 'החל מ־' : ''}₪${product.discount_price}
            </span>
            <span class="text-sm text-gray-400 dark:text-gray-500 line-through ml-2">
              ₪${product.price}
            </span>
          </div>
        `
        : product.price
          ? `
          <span class="text-2xl font-extrabold text-black dark:text-yellow-300 flex items-center">
            ${product.price_from ? 'החל מ־' : ''}₪${product.price}
          </span>
        `
          : `
          <span class="inline-flex items-center gap-1 text-md font-bold text-blue-600 dark:text-yellow-300">
            חייגו להצעת מחיר
          </span>
        `
      }
    ${product.note
        ? `<span class="block mt-1 text-xs text-gray-400 dark:text-gray-400 text-center w-full font-normal">
              ${product.note}
           </span>`
        : ''
      }
  </div>
          </div>
          <!-- כפתורים תמיד בתחתית -->
          <div class="flex gap-2 w-full justify-center mt-auto pb-1">
            <a href="tel:${product.phone}"
               class="flex items-center gap-2 bg-gradient-to-r from-blue-700 to-blue-500 hover:from-blue-800 hover:to-blue-600 text-white rounded-xl px-5 py-2 font-bold shadow-lg transition focus:outline-none focus:ring-2 focus:ring-blue-400"
               aria-label="התקשר עכשיו">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20" class="w-5 h-5"><path fill="currentColor" d="M2.3 3.27c.53-1.3 1.94-2 3.3-1.64.56.13 1.1.38 1.5.79l1.6 1.6a2.7 2.7 0 01.53 2.95l-.6 1.21c-.17.35-.1.78.17 1.04l2.53 2.53c.26.27.69.34 1.04.17l1.21-.6a2.7 2.7 0 012.95.53l1.6 1.6c.41.41.66.94.79 1.5.35 1.36-.33 2.77-1.64 3.3-.71.29-1.48.45-2.26.45C7.41 19 1 12.59 1 5.96c0-.78.16-1.55.45-2.26z"/></svg>
               חייג
            </a>
            ${product.whatsapp
        ? `
                  <a href="${waLink}"
                     class="flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-400 hover:from-green-700 hover:to-green-500 text-white rounded-xl px-5 py-2 font-bold shadow-lg transition focus:outline-none focus:ring-2 focus:ring-green-400"
                     aria-label="וואטסאפ על המוצר" target="_blank" rel="noopener">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="w-5 h-5"><path fill="currentColor" d="M12 2A10 10 0 0 0 2 12a9.96 9.96 0 0 0 1.44 5.23L2 22l4.93-1.43A9.95 9.95 0 0 0 12 22a10 10 0 1 0 0-20zm0 18c-1.45 0-2.88-.36-4.13-1.05l-.3-.17-2.92.84.83-2.85-.18-.29A7.97 7.97 0 0 1 4 12a8 8 0 1 1 8 8zm4.23-5.36-.75-.37c-.2-.1-.44-.2-.7-.12-.19.06-.42.22-.68.44-.27.22-.53.27-.73.13a6.47 6.47 0 0 1-2.04-2.04c-.14-.2-.09-.46.13-.73.22-.26.37-.49.44-.68.08-.26-.02-.5-.12-.7l-.37-.75c-.18-.37-.6-.52-.94-.39-.98.4-1.57 1.22-1.37 2.18.13.59.54 1.26 1.21 1.92.67.68 1.34 1.08 1.93 1.21.96.2 1.78-.39 2.18-1.37.13-.34-.02-.76-.39-.94z"/></svg>
                    וואטסאפ
                  </a>
                `
        : ''
      }
          </div>
          <div class="flex flex-wrap gap-1 justify-center mb-1 w-full">
            ${(product.tags || [])
        .map(
          tag =>
            `<span class="bg-blue-100 dark:bg-gray-800 text-blue-800 dark:text-yellow-300 px-2 py-0.5 rounded text-xs">${tag}</span>`
        )
        .join('')}
          </div>
        </div>
      `
  })
}

// אנימציה מקצועית לכרטיסים
const style = document.createElement('style')
style.innerHTML = `
@keyframes fadein { from {opacity:0; transform: translateY(30px);} to {opacity:1; transform: none;} }
.animate-fadein { animation: fadein 0.7s cubic-bezier(.4,0,.2,1) forwards;}
`
document.head.appendChild(style)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then(
      reg => console.log("SW registered", reg),
      err => console.warn("SW registration failed", err)
    );
  });
}
