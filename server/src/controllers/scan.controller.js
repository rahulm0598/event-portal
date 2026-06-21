import { asyncHandler } from '../utils/asyncHandler.js';
import { Registration } from '../models/Registration.js';
import { extractToken } from '../services/qr.service.js';
import { badRequest, notFound } from '../utils/ApiError.js';

// POST /scan  { qrToken }  (admin/staff)
// Resolves the QR token, marks check-in, returns badge-ready data.
// Accepts either a raw token or the full QR URL (extractToken normalizes it).
export const scanCheckIn = asyncHandler(async (req, res) => {
  const qrToken = extractToken(req.body.qrToken);
  const reg = await Registration.findOne({ qrToken }).populate('event', 'title startsAt venue logoUrl');
  if (!reg) throw notFound('Invalid QR — registration not found');

  if (reg.paymentStatus === 'pending') {
    throw badRequest('Payment pending — entry not allowed');
  }

  const alreadyIn = reg.checkInStatus === 'checked_in';
  if (!alreadyIn) {
    reg.checkInStatus = 'checked_in';
    reg.checkedInAt = new Date();
    await reg.save();
  }

  res.json({
    success: true,
    alreadyCheckedIn: alreadyIn,
    registrationId: reg._id,
    checkedInAt: reg.checkedInAt,
    doctor: reg.snapshot,
    event: reg.event,
    badgeUrl: `/api/badges/${reg._id}/pdf`,
  });
});

// GET /scan/lookup/:qrToken  — read-only, no state change (preview before allow)
export const scanLookup = asyncHandler(async (req, res) => {
  const reg = await Registration.findOne({ qrToken: req.params.qrToken })
    .populate('event', 'title startsAt venue')
    .lean();
  if (!reg) throw notFound('Invalid QR');
  res.json({
    success: true,
    doctor: reg.snapshot,
    event: reg.event,
    paymentStatus: reg.paymentStatus,
    checkInStatus: reg.checkInStatus,
  });
});
