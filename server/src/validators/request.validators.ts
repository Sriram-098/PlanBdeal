import { z } from 'zod';

export const createRequestSchema = z.object({
  quantity: z.coerce.number().int().positive().max(20),
  message: z.string().trim().max(500).optional().or(z.literal('')),
});

export type CreateRequestInput = z.infer<typeof createRequestSchema>;
