import { z } from 'zod';

const mobile = z.string().regex(/^\d{10}$/, 'Enter a 10-digit mobile number');
const email = z.string().email('Enter a valid email');

export const signupSchema = z.object({
  name: z.string().min(2),
  doctorId: z.string().min(2),
  mobile,
  email,
  hospital: z.string().min(2),
  specialty: z.string().min(2),
  city: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const verifyEmailSchema = z.object({
  email,
  code: z.string().regex(/^\d{6}$/, '6-digit code required'),
});

export const resendCodeSchema = z.object({ email });

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password required'),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({
  email,
  code: z.string().regex(/^\d{6}$/, '6-digit code required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const createEventSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  venue: z.string().optional(),
  city: z.string().optional(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date().optional(),
  isPaid: z.boolean().optional(),
  priceInPaise: z.number().int().min(0).optional(),
  capacity: z.number().int().min(0).optional(),
  bannerUrl: z.string().optional(),
  logoUrl: z.string().optional(),
});

export const registerEventSchema = z.object({
  eventId: z.string().min(8),
});

// ---- Public link-based registration (no password) ----
export const publicRegisterSchema = z.object({
  name: z.string().min(2),
  doctorId: z.string().min(2),
  mobile,
  email,
  hospital: z.string().min(2),
  specialty: z.string().min(2),
  city: z.string().optional(),
});

export const publicVerifySchema = z.object({
  email,
  code: z.string().regex(/^\d{6}$/, '6-digit code required'),
});

export const publicResendSchema = z.object({ email });

export const publicPaySchema = z.object({
  registrationId: z.string().min(8),
});

export const scanSchema = z.object({
  qrToken: z.string().min(8),
});

export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: { message: 'Validation failed', details: result.error.flatten().fieldErrors },
      });
    }
    req.body = result.data;
    next();
  };
}
