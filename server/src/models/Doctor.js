import mongoose from 'mongoose';

const doctorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    doctorId: { type: String, required: true, trim: true, index: true },
    mobile: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
    hospital: { type: String, required: true, trim: true },
    specialty: { type: String, required: true, trim: true },
    city: { type: String, trim: true },
    photo: { type: String }, // optional file path / URL

    // Optional now: link-based registrants have NO password (no login).
    // Only the admin account carries a passwordHash.
    passwordHash: { type: String },
    emailVerified: { type: Boolean, default: false },

    role: { type: String, enum: ['doctor', 'admin'], default: 'doctor', index: true },
  },
  { timestamps: true }
);

export const Doctor = mongoose.model('Doctor', doctorSchema);
