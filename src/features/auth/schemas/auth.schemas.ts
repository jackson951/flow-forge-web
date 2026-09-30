import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});

export const registerSchema = z.object({
  name: z.string().min(1, 'Enter your name').max(100),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(12, 'Use at least 12 characters').max(128),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
