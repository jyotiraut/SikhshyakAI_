import z from 'zod';

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .refine((val) => /[A-Z]/.test(val), {
    message: 'Password must include one uppercase',
  })
  .refine((val) => /[a-z]/.test(val), {
    message: 'Password must include one lowercase',
  })
  .refine((val) => /[0-9]/.test(val))
  .refine((val) => /[^A-Za-z0-9]/.test(val), {
    message: 'Must include a special character.',
  });
