export type TransferMethod = 'PROVIDER_APP_TRANSFER' | 'EDIT_NAME_ON_BOOKING' | 'EMAIL_TRANSFER' | 'OTHER';
export type ListingStatus = 'ACTIVE' | 'SOLD' | 'CANCELLED' | 'EXPIRED';
export type RequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';
export type NotificationType =
  | 'NEW_REQUEST'
  | 'REQUEST_ACCEPTED'
  | 'REQUEST_REJECTED'
  | 'NEW_MESSAGE'
  | 'LISTING_EXPIRED';

export interface PublicUser {
  id: string;
  fullName: string;
  email: string;
  createdAt: string;
}

export interface Listing {
  id: string;
  sellerId: string;
  seller?: { id: string; fullName: string; createdAt?: string };
  movieTitle: string;
  posterUrl: string | null;
  language: string;
  theatreName: string;
  city: string;
  theatreLocation: string | null;
  showDateTime: string;
  showtimeLabel: string;
  totalQuantity: number;
  availableQuantity: number;
  originalPricePerTicket: string;
  askingPricePerTicket: string;
  provider: string;
  transferEligibility: boolean;
  transferMethod: TransferMethod;
  seatInfo: string | null;
  description: string | null;
  status: ListingStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectRequest {
  id: string;
  listingId: string;
  listing?: Listing;
  buyerId: string;
  buyer?: { id: string; fullName: string } | null;
  quantity: number;
  message: string | null;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
  /** False when another, earlier request for the same listing is still pending ahead of this one. */
  isActive: boolean;
  /** Only set when isActive is false — this request's position in the wait queue (2, 3, ...). */
  queuePosition?: number;
}

export interface ChatThread {
  id: string;
  listingId: string;
  listing?: { id: string; movieTitle: string; posterUrl: string | null; city: string; theatreName: string };
  requestId: string;
  buyerId: string;
  buyer?: { id: string; fullName: string };
  sellerId: string;
  seller?: { id: string; fullName: string };
  createdAt: string;
  messages?: Message[];
}

export interface Message {
  id: string;
  chatThreadId: string;
  senderId: string;
  content: string;
  createdAt: string;
  readAt: string | null;
}

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedListingId: string | null;
  relatedRequestId: string | null;
  relatedChatThreadId: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
