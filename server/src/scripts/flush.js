import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';

// Wipe ALL portal data (doctors, registrations, payments, codes, events).
// Run:  npm run flush   (then `npm run seed` to recreate events + admin)
async function run() {
  await connectDB();
  const names = ['doctors', 'registrations', 'payments', 'emailcodes', 'otps', 'events'];
  for (const n of names) {
    try {
      await mongoose.connection.db.collection(n).drop();
      console.log(`[flush] dropped ${n}`);
    } catch (e) {
      if (e.codeName === 'NamespaceNotFound') console.log(`[flush] ${n} (none)`);
      else console.warn(`[flush] ${n}: ${e.message}`);
    }
  }
  console.log('[flush] done');
  await mongoose.disconnect();
  process.exit(0);
}
run().catch((e) => { console.error(e); process.exit(1); });
