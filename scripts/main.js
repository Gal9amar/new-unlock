// ========================================
// UNLOCK - Main JavaScript
// ========================================

// Global Variables
let allProducts = [];
let currentBrand = 'all';

// ========== Initialize ==========
document.addEventListener('DOMContentLoaded', () => {
  initProducts();
  initScrollToTop();
  initSmoothScroll();
});

// ========== Load and Display Products ==========
async function initProducts() {
  try {
    const response = await fetch('products.json');
    allProducts = await response.json();
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
    <div class="product-card fade-in" onclick="goToProduct(${index})" style="animation-delay: ${index * 0.1}s">
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

  // Find the actual index in allProducts
  const productIndex = allProducts.findIndex(p =>
    p.title === product.title && p.brand === product.brand
  );

  // Navigate to product page with index
  window.location.href = `product.html?id=${productIndex}`;
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
  });

  scrollBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ========== Animate on Scroll ==========
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('fade-in');
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

// Observe service and why cards
document.querySelectorAll('.service-card, .why-card').forEach(el => {
  observer.observe(el);
});

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
