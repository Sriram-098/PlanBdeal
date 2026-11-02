import { z } from 'zod';

export const transferMethodOptions = [
  { value: 'PROVIDER_APP_TRANSFER', label: "Transfer via the provider's app" },
  { value: 'EDIT_NAME_ON_BOOKING', label: 'Edit attendee name on booking' },
  { value: 'EMAIL_TRANSFER', label: 'Email-based transfer' },
  { value: 'OTHER', label: 'Other permitted method' },
] as const;

export const listingFormSchema = z.object({
  movieTitle: z.string().trim().min(1, 'Movie title is required').max(200),
  posterUrl: z.string().trim().url('Must be a valid URL').optional().or(z.literal('')),
  language: z.string().trim().min(1, 'Language is required').max(50),
  theatreName: z.string().trim().min(1, 'Theatre name is required').max(200),
  city: z.string().trim().min(1, 'City is required').max(100),
  theatreLocation: z.string().trim().max(300).optional().or(z.literal('')),
  showDateTime: z.string().refine((v) => new Date(v).getTime() > Date.now(), 'Show date/time must be in the future'),
  showtimeLabel: z.string().trim().min(1, 'Showtime label is required').max(50),
  totalQuantity: z.coerce.number().int().positive('Must be at least 1').max(20),
  originalPricePerTicket: z.coerce.number().min(0, 'Cannot be negative'),
  askingPricePerTicket: z.coerce.number().min(0, 'Cannot be negative'),
  provider: z.string().trim().min(1, 'Provider is required').max(100),
  transferEligibility: z.boolean(),
  transferMethod: z.enum(['PROVIDER_APP_TRANSFER', 'EDIT_NAME_ON_BOOKING', 'EMAIL_TRANSFER', 'OTHER']),
  seatInfo: z.string().trim().max(200).optional().or(z.literal('')),
  description: z.string().trim().max(2000).optional().or(z.literal('')),
});

export type ListingFormInput = z.infer<typeof listingFormSchema>;

export const editListingFormSchema = listingFormSchema.omit({ totalQuantity: true });
export type EditListingFormInput = z.infer<typeof editListingFormSchema>;
