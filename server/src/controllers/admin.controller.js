import { nanoid } from 'nanoid';
import { asyncHandler } from '../utils/asyncHandler.js';
import { Registration } from '../models/Registration.js';
import { Event } from '../models/Event.js';
import { Doctor } from '../models/Doctor.js';
import { buildAttendeesXlsx } from '../services/excel.service.js';
import { sendEventDetails, sendFollowup } from '../services/notify.service.js';
import { env } from '../config/env.js';
import { notFound } from '../utils/ApiError.js';

// POST /admin/events/:id/share — generate (once) + return the shareable link.
export const shareLink = asyncHandler(async (req, res) => {
  const ev = await Event.findById(req.params.id);
  if (!ev) throw notFound('Event not found');
  if (!ev.publicToken) {
    ev.publicToken = `reg-${nanoid(10)}`;
    await ev.save();
  }
  res.json({
    success: true,
    publicToken: ev.publicToken,
    url: `${env.publicBaseUrl}/register/${ev.publicToken}`,
  });
});

// POST /admin/events/:id/broadcast  { type: 'details' | 'followup', note? }
// Sends to every CONFIRMED registrant of the event.
export const broadcast = asyncHandler(async (req, res) => {
  const ev = await Event.findById(req.params.id).lean();
  if (!ev) throw notFound('Event not found');
  const type = req.body?.type === 'followup' ? 'followup' : 'details';
  const note = (req.body?.note || '').toString().slice(0, 500);

  const confirmed = await Registration.find({
    event: ev._id,
    emailVerified: true,
    paymentStatus: { $ne: 'pending' },
  });

  // Only mail people who haven't already received THIS type of mail.
  const stampField = type === 'followup' ? 'followupEmailSentAt' : 'detailsEmailSentAt';
  const targets = confirmed.filter((r) => !r[stampField]);

  let sent = 0;
  const previews = [];
  for (const reg of targets) {
    try {
      const fn = type === 'followup' ? sendFollowup : sendEventDetails;
      const { previewUrl } = await fn(reg, ev, note); // stamps stampField on success
      sent += 1;
      if (previewUrl) previews.push(previewUrl);
    } catch {
      // skip failures, keep going
    }
  }

  res.json({
    success: true,
    type,
    totalConfirmed: confirmed.length,
    alreadySent: confirmed.length - targets.length,
    recipients: targets.length, // new people targeted this run
    sent,
    previews,
  });
});

function sendXlsx(res, buffer, filename) {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(Buffer.from(buffer));
}

// GET /admin/overview — global KPIs across all events.
export const overview = asyncHandler(async (req, res) => {
  const [events, doctors, total, checkedIn, paidAgg, recent] = await Promise.all([
    Event.countDocuments({}),
    Doctor.countDocuments({ role: 'doctor' }),
    Registration.countDocuments({}),
    Registration.countDocuments({ checkInStatus: 'checked_in' }),
    Registration.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, sum: { $sum: '$amountInPaise' } } },
    ]),
    Registration.find({}).sort({ createdAt: -1 }).limit(8)
      .populate('event', 'title').lean(),
  ]);

  res.json({
    success: true,
    overview: {
      events,
      doctors,
      registrations: total,
      checkedIn,
      revenueInPaise: paidAgg[0]?.sum || 0,
      recent: recent.map((r) => ({
        id: r._id,
        name: r.snapshot?.name,
        event: r.event?.title,
        paymentStatus: r.paymentStatus,
        checkInStatus: r.checkInStatus,
        createdAt: r.createdAt,
      })),
    },
  });
});

// GET /admin/registrations — EVERY registration across all events (full list).
export const allRegistrations = asyncHandler(async (req, res) => {
  const regs = await Registration.find({})
    .sort({ createdAt: -1 })
    .populate('event', 'title startsAt city isPaid')
    .lean();
  res.json({
    success: true,
    registrations: regs.map((r) => ({
      id: r._id,
      ...r.snapshot,
      event: r.event?.title || '—',
      eventDate: r.event?.startsAt || null,
      paymentStatus: r.paymentStatus,
      amountInPaise: r.amountInPaise,
      checkInStatus: r.checkInStatus,
      checkedInAt: r.checkedInAt || null,
      createdAt: r.createdAt,
    })),
  });
});

// GET /admin/registrations.csv — export the full list (opens in Excel).
export const exportAllCsv = asyncHandler(async (req, res) => {
  const regs = await Registration.find({}).sort({ createdAt: -1 }).populate('event', 'title').lean();
  const header = ['Name', 'DoctorID', 'Mobile', 'Email', 'Hospital', 'Specialty', 'Event', 'Payment', 'Amount(INR)', 'CheckIn', 'CheckedInAt', 'RegisteredAt'];
  const rows = regs.map((r) => {
    const s = r.snapshot || {};
    return [
      s.name, s.doctorId, s.mobile, s.email, s.hospital, s.specialty,
      r.event?.title || '', r.paymentStatus, (r.amountInPaise / 100).toFixed(2),
      r.checkInStatus, r.checkedInAt ? new Date(r.checkedInAt).toISOString() : '',
      new Date(r.createdAt).toISOString(),
    ].map(csvCell).join(',');
  });
  const csv = '﻿' + [header.join(','), ...rows].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="all_registrations.csv"');
  res.send(csv);
});

// GET /admin/registrations.xlsx — full list as styled Excel.
export const exportAllXlsx = asyncHandler(async (req, res) => {
  const regs = await Registration.find({}).sort({ createdAt: -1 }).populate('event', 'title').lean();
  const data = regs.map((r) => ({ ...r, eventTitle: r.event?.title || '' }));
  const buf = await buildAttendeesXlsx({ title: 'All Registrations — MedEvents', regs: data });
  sendXlsx(res, buf, 'all_registrations.xlsx');
});

// GET /admin/events/:id/attendees.xlsx — per-event Excel.
export const exportAttendeesXlsx = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id).lean();
  const regs = await Registration.find({ event: req.params.id }).sort({ createdAt: -1 }).lean();
  const data = regs.map((r) => ({ ...r, eventTitle: event?.title || '' }));
  const buf = await buildAttendeesXlsx({ title: `${event?.title || 'Event'} — Attendees`, regs: data });
  sendXlsx(res, buf, `attendees_${req.params.id}.xlsx`);
});

// GET /admin/events/:id/attendees
export const listAttendees = asyncHandler(async (req, res) => {
  const regs = await Registration.find({ event: req.params.id }).sort({ createdAt: -1 }).lean();
  res.json({ success: true, attendees: regs });
});

// POST /admin/registrations/:id/checkin  { checkedIn: true|false } — manual toggle
export const setCheckin = asyncHandler(async (req, res) => {
  const reg = await Registration.findById(req.params.id);
  if (!reg) throw notFound('Registration not found');
  const want = req.body.checkedIn !== false;
  reg.checkInStatus = want ? 'checked_in' : 'registered';
  reg.checkedInAt = want ? new Date() : undefined;
  await reg.save();
  res.json({ success: true, checkInStatus: reg.checkInStatus, checkedInAt: reg.checkedInAt || null });
});

// GET /admin/events/:id/attendees.csv — export (opens in Excel)
export const exportAttendeesCsv = asyncHandler(async (req, res) => {
  const regs = await Registration.find({ event: req.params.id }).lean();
  const header = ['Name', 'DoctorID', 'Mobile', 'Email', 'Hospital', 'Specialty', 'Payment', 'Amount(INR)', 'CheckIn', 'CheckedInAt', 'RegisteredAt'];
  const rows = regs.map((r) => {
    const s = r.snapshot || {};
    return [
      s.name, s.doctorId, s.mobile, s.email, s.hospital, s.specialty,
      r.paymentStatus, (r.amountInPaise / 100).toFixed(2),
      r.checkInStatus, r.checkedInAt ? new Date(r.checkedInAt).toISOString() : '',
      new Date(r.createdAt).toISOString(),
    ].map(csvCell).join(',');
  });
  const csv = '﻿' + [header.join(','), ...rows].join('\n'); // BOM so Excel reads UTF-8
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="attendees_${req.params.id}.csv"`);
  res.send(csv);
});

function csvCell(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
