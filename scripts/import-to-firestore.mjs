// סקריפט חד-פעמי לייבוא מוצרים מ-products.json ל-Firestore
// הרץ: node scripts/import-to-firestore.mjs

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

// Service account key
const serviceAccount = JSON.parse(readFileSync('./firebase-service-account.json', 'utf8'));

initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();

const products = JSON.parse(readFileSync('./data/products.json', 'utf8'));
const order = JSON.parse(readFileSync('./data/product_order.json', 'utf8'));

async function importProducts() {
  const batch = db.batch();

  for (const product of products) {
    const orderIndex = order.indexOf(product.title);
    const docRef = db.collection('products').doc();
    batch.set(docRef, {
      ...product,
      order: orderIndex >= 0 ? orderIndex : 999
    });
  }

  await batch.commit();
  console.log(`✅ יובאו ${products.length} מוצרים ל-Firestore`);
}

importProducts().catch(console.error);
