import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const serviceAccount = JSON.parse(readFileSync(join(__dirname, '../firebase-service-account.json'), 'utf8'));

initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();

const products = JSON.parse(readFileSync(join(__dirname, '../data/products.json'), 'utf8'));
const order = JSON.parse(readFileSync(join(__dirname, '../data/product_order.json'), 'utf8'));

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
  process.exit(0);
}

importProducts().catch(e => { console.error(e); process.exit(1); });
