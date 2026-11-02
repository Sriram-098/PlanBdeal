import { z } from 'zod';

export const transferMethodEnum = z.enum([
  'PROVIDER_APP_TRANSFER',
  'EDIT_NAME_ON_BOOKING',
  'EMAIL_TRANSFER',
  'OTHER',
]);

export const createListingSchema = z.object({
  movieTitle: z.string().trim().min(1).max(200),
  posterUrl: z.string().trim().url().max(500).optional().or(z.literal('')),
  language: z.string().trim().min(1).max(50),
  theatreName: z.string().trim().min(1).max(200),
  city: z.string().trim().min(1).max(100),
  theatreLocation: z.string().trim().max(300).optional().or(z.literal('')),
  showDateTime: z.coerce.date().refine((d) => d.getTime() > Date.now(), {
    message: 'Show date/time must be in the future',
  }),
  showtimeLabel: z.string().trim().min(1).max(50),
  totalQuantity: z.coerce.number().int().positive().max(20),
  originalPricePerTicket: z.coerce.number().min(0).max(1_000_000),
  askingPricePerTicket: z.coerce.number().min(0).max(1_000_000),
  provider: z.string().trim().min(1).max(100),
  transferEligibility: z.boolean(),
  transferMethod: transferMethodEnum,
  seatInfo: z.string().trim().max(200).optional().or(z.literal('')),
  description: z.string().trim().max(2000).optional().or(z.literal('')),
});

export const updateListingSchema = createListingSchema.omit({ totalQuantity: true }).partial();

export const listingQuerySchema = z.object({
  movieTitle: z.string().trim().optional(),
  city: z.string().trim().optional(),
  theatreName: z.string().trim().optional(),
  language: z.string().trim().optional(),
  showDate: z.string().trim().optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  minQuantity: z.coerce.number().int().positive().optional(),
  sort: z.enum(['newest', 'price_asc']).default('newest'),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(12),
});

export type CreateListingInput = z.infer<typeof createListingSchema>;
export type UpdateListingInput = z.infer<typeof updateListingSchema>;
export type ListingQueryInput = z.infer<typeof listingQuerySchema>;
