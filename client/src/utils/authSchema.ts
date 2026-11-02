import { z } from 'zod';

export const loginFormSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});
export type LoginFormInput = z.infer<typeof loginFormSchema>;

export const registerFormSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Full name is too short').max(100),
    email: z.string().trim().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type RegisterFormInput = z.infer<typeof registerFormSchema>;
