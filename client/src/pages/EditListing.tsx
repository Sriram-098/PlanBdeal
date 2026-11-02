import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../hooks/useAuth';
import { api, getErrorMessage } from '../services/api';
import { editListingFormSchema, EditListingFormInput, transferMethodOptions } from '../utils/listingSchema';
import { Listing } from '../types';

// Converts an ISO timestamp into the local value a <input type="datetime-local"> expects.
function toDateTimeLocalValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EditListing() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { show } = useToast();
  const [listing, setListing] = useState<Listing | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditListingFormInput>({ resolver: zodResolver(editListingFormSchema) });

  useEffect(() => {
    api.get(`/listings/${id}`).then((res) => {
      const data: Listing = res.data.listing;
      setListing(data);
      reset({
        movieTitle: data.movieTitle,
        posterUrl: data.posterUrl ?? '',
        language: data.language,
        theatreName: data.theatreName,
        city: data.city,
        theatreLocation: data.theatreLocation ?? '',
        showDateTime: toDateTimeLocalValue(data.showDateTime),
        showtimeLabel: data.showtimeLabel,
        originalPricePerTicket: Number(data.originalPricePerTicket),
        askingPricePerTicket: Number(data.askingPricePerTicket),
        provider: data.provider,
        transferEligibility: data.transferEligibility,
        transferMethod: data.transferMethod,
        seatInfo: data.seatInfo ?? '',
        description: data.description ?? '',
      });
    });
  }, [id, reset]);

  if (!listing) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (user && listing.sellerId !== user.id) {
    navigate(`/tickets/${listing.id}`, { replace: true });
    return null;
  }

  const onSubmit = async (data: EditListingFormInput) => {
    try {
      await api.patch(`/listings/${id}`, data);
      show('Listing updated', 'success');
      navigate(`/tickets/${id}`);
    } catch (err) {
      show(getErrorMessage(err), 'error');
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-white">Edit Listing</h1>
      <Card className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Movie title" {...register('movieTitle')} error={errors.movieTitle?.message} />
          <Input label="Poster URL (optional)" {...register('posterUrl')} error={errors.posterUrl?.message} />
          <Input label="Language" {...register('language')} error={errors.language?.message} />
          <Input label="Provider (e.g. BookMyShow)" {...register('provider')} error={errors.provider?.message} />
          <Input label="Theatre name" {...register('theatreName')} error={errors.theatreName?.message} />
          <Input label="City" {...register('city')} error={errors.city?.message} />
          <Input label="Theatre location (optional)" {...register('theatreLocation')} error={errors.theatreLocation?.message} />
          <Input label="Seat info (optional)" {...register('seatInfo')} error={errors.seatInfo?.message} />
          <Input type="datetime-local" label="Show date & time" {...register('showDateTime')} error={errors.showDateTime?.message} />
          <Input label="Showtime label (e.g. 7:00 PM)" {...register('showtimeLabel')} error={errors.showtimeLabel?.message} />
          <Input
            type="number"
            min={0}
            step="0.01"
            label="Original price per ticket"
            {...register('originalPricePerTicket')}
            error={errors.originalPricePerTicket?.message}
          />
          <Input
            type="number"
            min={0}
            step="0.01"
            label="Asking price per ticket"
            {...register('askingPricePerTicket')}
            error={errors.askingPricePerTicket?.message}
          />
          <Select label="Transfer method" {...register('transferMethod')} error={errors.transferMethod?.message}>
            {transferMethodOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>

          <label className="col-span-full flex items-center gap-2 text-sm text-cine-muted">
            <input type="checkbox" {...register('transferEligibility')} className="h-4 w-4 rounded border-cine-border bg-cine-surface2" />
            This ticket is eligible for transfer through the provider's permitted method
          </label>

          <Textarea className="col-span-full" rows={3} label="Description (optional)" {...register('description')} error={errors.description?.message} />

          <p className="col-span-full text-xs text-cine-muted">
            Total tickets listed ({listing.totalQuantity}) can't be changed after creation — cancel and relist if
            you need a different quantity.
          </p>

          <Button type="submit" isLoading={isSubmitting} className="col-span-full">
            Save Changes
          </Button>
        </form>
      </Card>
    </div>
  );
}
