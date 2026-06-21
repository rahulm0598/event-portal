import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { nanoid } from 'nanoid';
import { env } from '../config/env.js';
import { badRequest } from '../utils/ApiError.js';

const dir = path.resolve(env.uploadDir);
fs.mkdirSync(dir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, dir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `photo_${nanoid(12)}${ext}`);
  },
});

const allowed = ['.jpg', '.jpeg', '.png', '.webp'];

export const uploadPhoto = multer({
  storage,
  limits: { fileSize: env.maxPhotoMb * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) return cb(badRequest('Only JPG/PNG/WEBP photos allowed'));
    cb(null, true);
  },
}).single('photo');
