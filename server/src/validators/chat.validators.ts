import { z } from 'zod';

export const sendMessageSchema = z.object({
  content: z.string().trim().min(1).max(2000),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(30),
});
