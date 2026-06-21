import { asyncHandler } from '../utils/asyncHandler.js';
import { Registration } from '../models/Registration.js';
import { Event } from '../models/Event.js';
import { buildBadgePdf } from '../services/badge.service.js';
import { notFound, badRequest } from '../utils/ApiError.js';

// GET /badges/:registrationId/pdf
// Streams the printable badge PDF. Allowed for the owner doctor or admin/staff.
export const badgePdf = asyncHandler(async (req, res) => {
  const reg = await Registration.findById(req.params.registrationId);
  if (!reg) throw notFound('Registration not found');

  const isOwner = req.user && reg.doctor.toString() === req.user._id.toString();
  const isStaff = req.user && req.user.role === 'admin';
  if (!isOwner && !isStaff) throw badRequest('Not allowed');

  if (reg.paymentStatus === 'pending') throw badRequest('Payment pending');

  // attach event logo text for the badge header
  const event = await Event.findById(reg.event).lean();
  reg._eventLogoText = event?.title || 'Event Portal';

  const pdf = await buildBadgePdf(reg);

  // stamp badge print time (best-effort)
  reg.badgePrintedAt = new Date();
  await reg.save().catch(() => {});

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="badge_${reg._id}.pdf"`);
  res.send(pdf);
});
