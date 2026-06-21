import { verifyToken } from '../services/jwt.service.js';
import { Doctor } from '../models/Doctor.js';
import { unauthorized, forbidden } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const requireAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw unauthorized('Missing token');

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch {
    throw unauthorized('Invalid or expired token');
  }

  const doctor = await Doctor.findById(decoded.sub).lean();
  if (!doctor) throw unauthorized('Account not found');

  req.user = doctor;
  next();
});

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') throw forbidden('Admin access required');
  next();
}

// For the profile-completion step: token carries { mobile, scope:'profile_pending' }
export function requirePendingProfile(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw unauthorized('Missing token');
  let decoded;
  try {
    decoded = verifyToken(token);
  } catch {
    throw unauthorized('Invalid or expired token');
  }
  if (decoded.scope !== 'profile_pending') throw forbidden('Wrong token scope');
  req.tokenScope = decoded.scope;
  req.pendingMobile = decoded.mobile;
  next();
}
