import { z } from 'zod';

/** Mirrors the backend DTOs (flowforge-api/src/modules/auth/dto/login.dto.ts, register.dto.ts). */
const email = z
  .string()
  .trim()
  .min(1, 'Enter your email address')
  .max(254, 'Email addresses are at most 254 characters')
  .email('Enter a valid email address');

export const loginSchema = z.object({
  email,
  password: z
    .string()
    .min(1, 'Enter your password')
    .max(128, 'Passwords are at most 128 characters'),
});

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name').max(100, 'At most 100 characters'),
  email,
  password: z.string().min(12, 'Use at least 12 characters').max(128, 'Use at most 128 characters'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
