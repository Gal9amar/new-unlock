// ========================================
// UNLOCK - Main JavaScript (Luxury Edition)
// ========================================

// Global Variables
let allProducts = [];
let currentBrand = 'all';
let currentCategory = 'all';

// ========== Initialize ==========
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initProducts();
  initScrollToTop();
  initSmoothScroll();
  initRevealAnimations();
  initCounterAnimation();
  initExitIntent();
});

// ========== Navbar Scroll Effect ==========
function initNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  const updateNavbar = () => {
    if (window.scrollY > 80) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', updateNavbar, { passive: true });
  updateNavbar();
}

// ========== Counter Animation ==========
function initCounterAnimation() {
  const counters = document.querySelectorAll('.hero-stat-number[data-target]');
  if (counters.length === 0) return;

  const animateCounter = (el) => {
    const target = parseInt(el.dataset.target);
    const duration = 2000;
    const startTime = performance.now();

    const step = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * target);

      el.textContent = current >= 1000 ? current.toLocaleString() + '+' : current + '+';

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  };

  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        counterObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(counter => counterObserver.observe(counter));
}

// ========== Reveal on Scroll Animations ==========
function initRevealAnimations() {
  const revealElements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');
  if (revealElements.length === 0) return;

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        // Stagger the reveal for siblings
        const parent = entry.target.parentElement;
        const siblings = parent.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');
        const siblingIndex = Array.from(siblings).indexOf(entry.target);
        const delay = siblingIndex * 120;

        setTimeout(() => {
          entry.target.classList.add('revealed');
        }, delay);

        revealObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -40px 0px'
  });

  revealElements.forEach(el => revealObserver.observe(el));
}

// ========== Load and Display Products ==========
async function initProducts() {
  try {
    const res = await fetch('https://us-central1-hamanulan-3bbc7.cloudfunctions.net/products');
    allProducts = await res.json();
    displayProducts(allProducts);
    initBrandFilters();
    initCategoryFilters();
  } catch (error) {
    console.error('Error loading products:', error);
    showProductsError();
  }
}

function getFilteredProducts() {
  return allProducts.filter(p => {
    const brandMatch = currentBrand === 'all' || p.brand === currentBrand;
    const categoryMatch = currentCategory === 'all' || p.category === currentCategory;
    return brandMatch && categoryMatch;
  });
}

function displayProducts(products) {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;

  if (products.length === 0) {
    grid.innerHTML = '<p class="no-products">לא נמצאו מוצרים בקטגוריה זו</p>';
    return;
  }

  grid.innerHTML = products.map((product, index) => `
    <div class="product-card fade-in" onclick="goToProduct('${product.id || index}')" style="animation-delay: ${index * 0.08}s">
      <div class="product-image-container">
        <img src="${product.image || 'images/fav.png'}" alt="${product.title}" loading="lazy" onerror="this.src='images/fav.png'" />
        ${product.status ? `<span class="product-status-badge status-${getStatusClass(product.status)}">${product.status === 'מבצע' ? 'מוצר במבצע' : 'מוצר ' + product.status}</span>` : ''}
      </div>
      <div class="product-info-card">
        <h3 class="product-name">${product.title}</h3>
        <p class="product-brand-text">מותג: <strong>${product.brand}</strong></p>

        <div class="product-pricing">
          ${product.discount_price ? `
            <span class="product-price-sale">₪${product.discount_price}</span>
            <span class="product-price-original">₪${product.price}</span>
            <span class="product-discount-badge">-${Math.round(((product.price - product.discount_price) / product.price) * 100)}%</span>
          ` : `
            <span class="product-price-sale">${product.price_from ? 'החל מ-' : ''}₪${product.price}</span>
          `}
        </div>
          <span class="vat-indicator">${product.including_vat === 'n' ? 'לא כולל מע״מ' : 'כולל מע״מ'}</span>

        ${product.tags && product.tags.length > 0 ? `
          <div class="product-tags">
            ${product.tags.slice(0, 3).map(tag => `<span class="product-tag">${tag}</span>`).join('')}
          </div>
        ` : ''}
      </div>
    </div>
  `).join('');
}

function getStatusClass(status) {
  const statusMap = {
    'מבצע': 'sale',
    'חדש': 'new',
    'מומלץ': 'recommended',
    'חם': 'hot',
    'מיוחד': 'special'
  };
  return statusMap[status] || 'default';
}

// ========== Brand Filters ==========
function initBrandFilters() {
  const brandBtns = document.querySelectorAll('.brand-filters .filter-btn');
  brandBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      brandBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentBrand = btn.dataset.brand;
      displayProducts(getFilteredProducts());
    });
  });
}

// ========== Category Filters ==========
function initCategoryFilters() {
  const catBtns = document.querySelectorAll('.category-filters .filter-btn');
  catBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      catBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = btn.dataset.category;
      displayProducts(getFilteredProducts());
    });
  });
}

// ========== Navigate to Product Page ==========
function slugify(title) {
  return title
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\u0590-\u05ffa-zA-Z0-9\-]/g, '')
    .toLowerCase();
}

function goToProduct(idOrIndex) {
  const product = allProducts.find(p => p.id === idOrIndex) || allProducts[idOrIndex];
  if (!product) return;
  window.location.href = `/products/${slugify(product.title)}/`;
}

// ========== Smooth Scroll ==========
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href');
      if (targetId === '#') return;

      e.preventDefault();
      const targetElement = document.querySelector(targetId);

      if (targetElement) {
        const headerOffset = 80;
        const elementPosition = targetElement.offsetTop;
        const offsetPosition = elementPosition - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
}

// ========== Scroll to Top Button ==========
function initScrollToTop() {
  const scrollBtn = document.getElementById('scrollToTop');
  if (!scrollBtn) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 500) {
      scrollBtn.removeAttribute('hidden');
    } else {
      scrollBtn.setAttribute('hidden', '');
    }
  }, { passive: true });

  scrollBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ========== Exit Intent Popup ==========
function initExitIntent() {
  const popup = document.getElementById('exitPopup');
  if (!popup) return;

  // אל תציג אם כבר נסגר בסשן הזה
  if (sessionStorage.getItem('exitPopupShown')) return;

  let shown = false;

  function showPopup() {
    if (shown) return;
    shown = true;
    sessionStorage.setItem('exitPopupShown', '1');
    popup.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
  }

  // Desktop – מאוס יוצא מהחלון כלפי מעלה
  document.addEventListener('mouseleave', (e) => {
    if (e.clientY <= 0) showPopup();
  });

  // Mobile – אחרי 40 שניות ללא גלילה
  let mobileTimer = setTimeout(() => {
    if (window.innerWidth < 768) showPopup();
  }, 40000);

  // ביטול timer אם גלל
  window.addEventListener('scroll', () => clearTimeout(mobileTimer), { once: true, passive: true });
}

window.closeExitPopup = function() {
  const popup = document.getElementById('exitPopup');
  if (!popup) return;
  popup.setAttribute('hidden', '');
  document.body.style.overflow = '';
};

// ========== Error Handling ==========
function showProductsError() {
  const grid = document.getElementById('productsGrid');
  if (grid) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
        <p style="color: var(--color-error); font-size: 18px; margin-bottom: 16px;">
          אירעה שגיאה בטעינת המוצרים
        </p>
        <button onclick="initProducts()" class="btn btn-primary">נסה שוב</button>
      </div>
    `;
  }
}
