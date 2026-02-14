// ========================================
// UNLOCK - Product Page JavaScript
// ========================================

let allProducts = [];
let currentProduct = null;

// ========== Initialize Product Page ==========
document.addEventListener('DOMContentLoaded', () => {
  loadProduct();
  initScrollToTop();
});

// ========== Load Product from URL Parameter ==========
async function loadProduct() {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');

  if (!productId) {
    showProductNotFound();
    return;
  }

  try {
    // Load products data
    const response = await fetch('products.json');
    allProducts = await response.json();

    // Get specific product
    const index = parseInt(productId);
    currentProduct = allProducts[index];

    if (!currentProduct) {
      showProductNotFound();
      return;
    }

    // Display product
    displayProduct(currentProduct);
    updateMetaTags(currentProduct);
    loadRelatedProducts(currentProduct.brand);

  } catch (error) {
    console.error('Error loading product:', error);
    showProductNotFound();
  }
}

// ========== Display Product Details ==========
function displayProduct(product) {
  // Hide loading, show details
  document.getElementById('productLoading').setAttribute('hidden', '');
  document.getElementById('productDetails').removeAttribute('hidden');

  // Product Image
  const productImage = document.getElementById('productImage');
  productImage.src = product.image || 'images/fav.png';
  productImage.alt = product.title;
  productImage.onerror = function() { this.src = 'images/fav.png'; };

  // Product Status Badge
  const statusBadge = document.getElementById('productStatus');
  if (product.status) {
    statusBadge.textContent = product.status;
    statusBadge.className = `product-status-badge status-${getStatusClass(product.status)}`;
    statusBadge.style.display = 'block';
  } else {
    statusBadge.style.display = 'none';
  }

  // Breadcrumb
  document.getElementById('productBrand').textContent = product.brand;

  // Product Title
  document.getElementById('productTitle').textContent = product.title;

  // Brand & Category
  document.getElementById('productBrandName').textContent = product.brand;
  document.getElementById('productCategory').textContent = product.category;

  // Pricing
  const pricingEl = document.getElementById('productPricing');
  if (product.discount_price) {
    const discount = Math.round(((product.price - product.discount_price) / product.price) * 100);
    pricingEl.innerHTML = `
      <span class="product-price-sale">₪${product.discount_price}</span>
      <span class="product-price-original">₪${product.price}</span>
      <span class="product-discount-badge">-${discount}%</span>
    `;
  } else {
    pricingEl.innerHTML = `
      <span class="product-price-sale">${product.price_from ? 'החל מ-' : ''}₪${product.price}</span>
    `;
  }

  // Product Note
  const noteEl = document.getElementById('productNote');
  noteEl.textContent = product.note || '';

  // Description
  document.getElementById('productDesc').textContent = product.desc;

  // Tags
  const tagsEl = document.getElementById('productTags');
  if (product.tags && product.tags.length > 0) {
    tagsEl.innerHTML = product.tags.map(tag => `
      <span class="product-tag">${tag}</span>
    `).join('');
  }

  // WhatsApp Button
  const whatsappBtn = document.getElementById('productWhatsAppBtn');
  const message = `שלום גבי, אני מתעניין ב-${product.title} (${product.brand})`;
  whatsappBtn.href = `https://wa.me/${product.whatsapp}?text=${encodeURIComponent(message)}`;
}

// ========== Load Related Products ==========
function loadRelatedProducts(brand) {
  const related = allProducts.filter(p =>
    p.brand === brand && p.title !== currentProduct.title
  ).slice(0, 3);

  if (related.length === 0) return;

  const relatedSection = document.getElementById('relatedProducts');
  const relatedGrid = document.getElementById('relatedGrid');

  relatedGrid.innerHTML = related.map(product => {
    const index = allProducts.findIndex(p => p.title === product.title);
    return `
      <div class="product-card" onclick="window.location.href='product.html?id=${index}'">
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
            ` : `
              <span class="product-price-sale">${product.price_from ? 'החל מ-' : ''}₪${product.price}</span>
            `}
          </div>
        </div>
      </div>
    `;
  }).join('');

  relatedSection.removeAttribute('hidden');
}

// ========== Update Meta Tags for SEO ==========
function updateMetaTags(product) {
  document.title = `${product.title} | UNLOCK - גבי המנעולן`;

  const metaDesc = document.getElementById('pageDesc');
  if (metaDesc) {
    metaDesc.content = `${product.desc.substring(0, 150)}...`;
  }
}

// ========== Show Product Not Found ==========
function showProductNotFound() {
  document.getElementById('productLoading').setAttribute('hidden', '');
  document.getElementById('productNotFound').removeAttribute('hidden');
}

// ========== Get Status Class ==========
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
