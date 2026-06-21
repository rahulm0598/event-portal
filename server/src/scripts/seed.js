import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { Event } from '../models/Event.js';
import { Doctor } from '../models/Doctor.js';
import { env } from '../config/env.js';

const U = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1000&q=70`;

async function run() {
  await connectDB();
  await Event.deleteMany({});

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  await Event.create([
    {
      title: 'CardioCon 2026',
      description: 'India’s largest cardiology summit — live surgeries, expert panels & networking.',
      venue: 'ITC Grand Chola, Chennai', city: 'Chennai',
      startsAt: new Date(now + 12 * day),
      isPaid: true, priceInPaise: 150000, capacity: 1000, status: 'open',
      bannerUrl: U('photo-1576091160399-112ba8d25d1d'),
    },
    {
      title: 'NeuroSummit 2026',
      description: 'Advances in neurology & neurosurgery. Hands-on workshops with global faculty.',
      venue: 'Taj Lands End, Mumbai', city: 'Mumbai',
      startsAt: new Date(now + 20 * day),
      isPaid: true, priceInPaise: 200000, capacity: 600, status: 'open',
      bannerUrl: U('photo-1559757148-5c350d0d3c56'),
    },
    {
      title: 'Free CME — Diabetes Update',
      description: 'Complimentary continuing medical education on modern diabetes management.',
      venue: 'Online (Zoom)', city: 'Remote',
      startsAt: new Date(now + 5 * day),
      isPaid: false, priceInPaise: 0, status: 'open',
      bannerUrl: U('photo-1532938911079-1b06ac7ceec7'),
    },
    {
      title: 'Pediatrics Conclave',
      description: 'Child health, vaccination strategy & neonatal care — for pediatric specialists.',
      venue: 'HICC, Hyderabad', city: 'Hyderabad',
      startsAt: new Date(now + 28 * day),
      isPaid: true, priceInPaise: 100000, capacity: 800, status: 'open',
      bannerUrl: U('photo-1530026405186-ed1f139313f8'),
    },
    {
      title: 'Free Webinar — AI in Radiology',
      description: 'How machine learning is transforming diagnostic imaging. Open to all doctors.',
      venue: 'Online (Teams)', city: 'Remote',
      startsAt: new Date(now + 8 * day),
      isPaid: false, priceInPaise: 0, status: 'open',
      bannerUrl: U('photo-1516069677018-378515003435'),
    },
    {
      title: 'Ortho Masterclass 2026',
      description: 'Joint replacement & sports injury masterclass with cadaveric demonstrations.',
      venue: 'Le Méridien, Bengaluru', city: 'Bengaluru',
      startsAt: new Date(now + 34 * day),
      isPaid: true, priceInPaise: 250000, capacity: 400, status: 'open',
      bannerUrl: U('photo-1581595219315-a187dd40c322'),
    },
  ]);

  // Admin (email + password). Override via ADMIN_EMAIL / ADMIN_PASSWORD env.
  const adminEmail = env.adminEmail || 'admin@medevents.test';
  const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
  await Doctor.findOneAndUpdate(
    { email: adminEmail },
    {
      email: adminEmail,
      name: 'Portal Admin',
      doctorId: 'ADMIN-001',
      mobile: '9999999999',
      hospital: 'HQ',
      specialty: 'Administration',
      role: 'admin',
      emailVerified: true,
      passwordHash: await bcrypt.hash(adminPass, 10),
    },
    { upsert: true }
  );

  // eslint-disable-next-line no-console
  console.log(`[seed] 6 events created. Admin: ${adminEmail} / ${adminPass}`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((e) => { console.error(e); process.exit(1); });
