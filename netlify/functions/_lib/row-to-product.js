// Shared by products.js, admin-products.js, and scripts/generate-ssg.js —
// previously redefined identically in all three, with no guarantee they'd
// stay in sync if a field were ever added.
function rowToProduct(r) {
  return {
    id: r.id,
    title: r.title,
    desc: r.description,
    image: r.image,
    price: r.price,
    discount_price: r.discount_price,
    price_from: !!r.price_from,
    brand: r.brand,
    category: r.category,
    status: r.status,
    tags: JSON.parse(r.tags_json || '[]'),
    phone: r.phone,
    whatsapp: r.whatsapp,
    note: r.note,
    including_vat: r.including_vat,
    order: r.sort_order,
  };
}

module.exports = { rowToProduct };
