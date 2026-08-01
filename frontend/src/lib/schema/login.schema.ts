import { z } from 'zod';
import { passwordSchema } from './password.schema';

export const loginSchema = z.object({
  email: z.email('Invalid email address'),
  password: passwordSchema,
});

export type LoginSchema = z.infer<typeof loginSchema>;
