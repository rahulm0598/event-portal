import mongoose from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler.js';
import { Event } from '../models/Event.js';
import { Registration } from '../models/Registration.js';
import { notFound } from '../utils/ApiError.js';

// GET /events  (public: open events)
export const listEvents = asyncHandler(async (req, res) => {
  const events = await Event.find({ status: { $ne: 'draft' } }).sort({ startsAt: 1 }).lean();
  res.json({ success: true, events });
});

// GET /events/:id
export const getEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id).lean();
  if (!event) throw notFound('Event not found');
  res.json({ success: true, event });
});

// POST /admin/events
export const createEvent = asyncHandler(async (req, res) => {
  const body = { ...req.body };
  if (body.isPaid && (!body.priceInPaise || body.priceInPaise <= 0)) {
    body.priceInPaise = 0;
    body.isPaid = false;
  }
  const event = await Event.create(body);
  res.status(201).json({ success: true, event });
});

// PATCH /admin/events/:id
export const updateEvent = asyncHandler(async (req, res) => {
  const event = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!event) throw notFound('Event not found');
  res.json({ success: true, event });
});

// GET /admin/events/:id/stats
export const eventStats = asyncHandler(async (req, res) => {
  const eventId = req.params.id;
  const [total, checkedIn, paid, revenue] = await Promise.all([
    Registration.countDocuments({ event: eventId }),
    Registration.countDocuments({ event: eventId, checkInStatus: 'checked_in' }),
    Registration.countDocuments({ event: eventId, paymentStatus: 'paid' }),
    Registration.aggregate([
      { $match: { event: new mongoose.Types.ObjectId(eventId), paymentStatus: 'paid' } },
      { $group: { _id: null, sum: { $sum: '$amountInPaise' } } },
    ]),
  ]);
  const revenueInPaise = revenue[0]?.sum || 0;
  res.json({
    success: true,
    stats: { total, checkedIn, paid, pending: total - checkedIn, revenueInPaise },
  });
});
