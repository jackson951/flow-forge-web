import { z } from 'zod';

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().default('/api'),
  VITE_APP_NAME: z.string().default('FlowForge'),
});

export const env = envSchema.parse(import.meta.env);
