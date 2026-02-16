// ========================================
// UNLOCK - Main JavaScript (Luxury Edition)
// ========================================

// Global Variables
let allProducts = [];
let currentBrand = 'all';

// ========== Initialize ==========
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initProducts();
  initScrollToTop();
  initSmoothScroll();
  initRevealAnimations();
  initCounterAnimation();
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
    const [productsRes, orderRes] = await Promise.all([
      fetch('products.json'),
      fetch('product_order.json').catch(() => null)
    ]);
    allProducts = await productsRes.json();

    if (orderRes && orderRes.ok) {
      const order = await orderRes.json();
      allProducts.sort((a, b) => {
        const idxA = order.indexOf(a.title);
        const idxB = order.indexOf(b.title);
        if (idxA === -1 && idxB === -1) return 0;
        if (idxA === -1) return 1;
        if (idxB === -1) return 1;
        return idxA - idxB;
      });
    }

    displayProducts(allProducts);
    initBrandFilters();
  } catch (error) {
    console.error('Error loading products:', error);
    showProductsError();
  }
}

function displayProducts(products) {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;

  if (products.length === 0) {
    grid.innerHTML = '<p class="no-products">לא נמצאו מוצרים</p>';
    return;
  }

  grid.innerHTML = products.map((product, index) => `
    <div class="product-card fade-in" onclick="goToProduct(${index})" style="animation-delay: ${index * 0.08}s">
      <div class="product-image-container">
        <img src="${product.image || 'images/fav.png'}" alt="${product.title}" loading="lazy" onerror="this.src='images/fav.png'" />
        ${product.status ? `<span class="product-status-badge status-${getStatusClass(product.status)}">${product.status}</span>` : ''}
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
  const filterButtons = document.querySelectorAll('.filter-btn');

  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Update active button
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Filter products
      const brand = btn.dataset.brand;
      currentBrand = brand;

      const filtered = brand === 'all'
        ? allProducts
        : allProducts.filter(p => p.brand === brand);

      displayProducts(filtered);
    });
  });
}

// ========== Navigate to Product Page ==========
function goToProduct(index) {
  const product = currentBrand === 'all'
    ? allProducts[index]
    : allProducts.filter(p => p.brand === currentBrand)[index];

  // Navigate to product page with title as identifier
  window.location.href = `product.html?name=${encodeURIComponent(product.title)}`;
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
