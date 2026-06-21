import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import {
  validate,
  loginSchema,
  createEventSchema,
  scanSchema,
  publicRegisterSchema,
  publicVerifySchema,
  publicResendSchema,
  publicPaySchema,
} from '../validators/schemas.js';

import * as auth from '../controllers/auth.controller.js';
import * as events from '../controllers/event.controller.js';
import * as pay from '../controllers/payment.controller.js';
import * as scan from '../controllers/scan.controller.js';
import * as badge from '../controllers/badge.controller.js';
import * as admin from '../controllers/admin.controller.js';
import * as pub from '../controllers/public.controller.js';

const r = Router();

// --- Auth (ADMIN ONLY — doctors never log in) ---
r.post('/auth/login', validate(loginSchema), auth.login);
r.get('/auth/me', requireAuth, auth.me);

// --- Events (public read) ---
r.get('/events', events.listEvents);
r.get('/events/:id', events.getEvent);

// --- Public link-based registration (no auth, no password) ---
r.get('/public/events/:token', pub.getEventByToken);
r.post('/public/events/:token/register', validate(publicRegisterSchema), pub.publicRegister);
r.post('/public/events/:token/verify', validate(publicVerifySchema), pub.publicVerify);
r.post('/public/events/:token/resend', validate(publicResendSchema), pub.publicResend);
r.post('/public/pay', validate(publicPaySchema), pub.publicPay);

// --- Payments (production webhook mounted separately in server.js) ---
r.post('/payments/verify', requireAuth, pay.verifyPayment);

// --- Badge PDF (admin) ---
r.get('/badges/:registrationId/pdf', requireAuth, badge.badgePdf);

// --- Public check-in (no auth) — any phone that scans the QR URL ---
r.get('/public/checkin/:token', pub.getByToken);
r.post('/public/checkin/:token', pub.checkInByToken);
r.get('/public/badge/:token/pdf', pub.badgePdfByToken);

// --- Scan / Check-in (staff) ---
r.post('/scan', requireAuth, requireAdmin, validate(scanSchema), scan.scanCheckIn);
r.get('/scan/lookup/:qrToken', requireAuth, requireAdmin, scan.scanLookup);

// --- Admin ---
r.get('/admin/overview', requireAuth, requireAdmin, admin.overview);
r.get('/admin/registrations', requireAuth, requireAdmin, admin.allRegistrations);
r.get('/admin/registrations.csv', requireAuth, requireAdmin, admin.exportAllCsv);
r.get('/admin/registrations.xlsx', requireAuth, requireAdmin, admin.exportAllXlsx);
r.post('/admin/events', requireAuth, requireAdmin, validate(createEventSchema), events.createEvent);
r.patch('/admin/events/:id', requireAuth, requireAdmin, events.updateEvent);
r.post('/admin/events/:id/share', requireAuth, requireAdmin, admin.shareLink);
r.post('/admin/events/:id/broadcast', requireAuth, requireAdmin, admin.broadcast);
r.get('/admin/events/:id/stats', requireAuth, requireAdmin, events.eventStats);
r.get('/admin/events/:id/attendees', requireAuth, requireAdmin, admin.listAttendees);
r.get('/admin/events/:id/attendees.csv', requireAuth, requireAdmin, admin.exportAttendeesCsv);
r.get('/admin/events/:id/attendees.xlsx', requireAuth, requireAdmin, admin.exportAttendeesXlsx);
r.post('/admin/registrations/:id/checkin', requireAuth, requireAdmin, admin.setCheckin);

export default r;
