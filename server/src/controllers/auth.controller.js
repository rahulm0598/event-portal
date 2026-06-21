import bcrypt from 'bcryptjs';
import { asyncHandler } from '../utils/asyncHandler.js';
import { Doctor } from '../models/Doctor.js';
import { signToken } from '../services/jwt.service.js';
import { issueEmailCode, verifyEmailCode } from '../services/verify.service.js';
import { env } from '../config/env.js';
import { badRequest, conflict, unauthorized } from '../utils/ApiError.js';

function sanitize(d) {
  return {
    id: d._id,
    name: d.name,
    doctorId: d.doctorId,
    mobile: d.mobile,
    email: d.email,
    hospital: d.hospital,
    specialty: d.specialty,
    city: d.city,
    photo: d.photo,
    role: d.role,
    emailVerified: d.emailVerified,
  };
}

// POST /auth/signup
// Creates an UNVERIFIED account, hashes password, emails a 6-digit code.
export const signup = asyncHandler(async (req, res) => {
  const { name, doctorId, mobile, email, hospital, specialty, city, password } = req.body;

  const existing = await Doctor.findOne({ email });
  if (existing) {
    if (existing.emailVerified) throw conflict('Email already registered. Please login.');
    // not verified yet -> resend a fresh code
    const r = await issueEmailCode(email, name);
    return res.json({ success: true, needsVerification: true, message: 'Code re-sent', ...r });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const role = env.adminEmail && email === env.adminEmail ? 'admin' : 'doctor';

  await Doctor.create({
    name, doctorId, mobile, email, hospital, specialty, city, passwordHash, role, emailVerified: false,
  });

  const r = await issueEmailCode(email, name);
  res.status(201).json({ success: true, needsVerification: true, message: 'Verification code sent', ...r });
});

// POST /auth/verify-email  { email, code } -> verifies + logs in
export const verifyEmail = asyncHandler(async (req, res) => {
  const { email, code } = req.body;
  await verifyEmailCode(email, code);

  const doctor = await Doctor.findOne({ email });
  if (!doctor) throw badRequest('Account not found');

  doctor.emailVerified = true;
  await doctor.save();

  const token = signToken({ sub: doctor._id.toString(), role: doctor.role });
  res.json({ success: true, token, doctor: sanitize(doctor) });
});

// POST /auth/resend-code  { email }
export const resendCode = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findOne({ email: req.body.email });
  if (!doctor) throw badRequest('Account not found');
  if (doctor.emailVerified) throw badRequest('Already verified');
  const r = await issueEmailCode(doctor.email, doctor.name);
  res.json({ success: true, message: 'Code re-sent', ...r });
});

// POST /auth/login  { email, password }
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const doctor = await Doctor.findOne({ email });
  // Only accounts with a password (admins) can log in. Doctors register via link.
  if (!doctor || !doctor.passwordHash) throw unauthorized('Invalid email or password');

  const ok = await bcrypt.compare(password, doctor.passwordHash);
  if (!ok) throw unauthorized('Invalid email or password');

  const token = signToken({ sub: doctor._id.toString(), role: doctor.role });
  res.json({ success: true, token, doctor: sanitize(doctor) });
});

// POST /auth/forgot-password { email } -> emails a reset code
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const doctor = await Doctor.findOne({ email });
  // Always respond success (don't leak which emails exist)...
  if (!doctor) return res.json({ success: true, message: 'If the account exists, a code was sent' });
  const r = await issueEmailCode(email, doctor.name);
  res.json({ success: true, message: 'Reset code sent', ...r });
});

// POST /auth/reset-password { email, code, password }
export const resetPassword = asyncHandler(async (req, res) => {
  const { email, code, password } = req.body;
  await verifyEmailCode(email, code);

  const doctor = await Doctor.findOne({ email });
  if (!doctor) throw badRequest('Account not found');

  doctor.passwordHash = await bcrypt.hash(password, 10);
  doctor.emailVerified = true; // resetting via emailed code also proves ownership
  await doctor.save();

  const token = signToken({ sub: doctor._id.toString(), role: doctor.role });
  res.json({ success: true, message: 'Password updated', token, doctor: sanitize(doctor) });
});

// GET /auth/me
export const me = asyncHandler(async (req, res) => {
  res.json({ success: true, doctor: sanitize(req.user) });
});
