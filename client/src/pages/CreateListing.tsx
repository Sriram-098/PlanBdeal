import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useToast } from '../components/ui/Toast';
import { api, getErrorMessage } from '../services/api';
import { listingFormSchema, ListingFormInput, transferMethodOptions } from '../utils/listingSchema';

export function CreateListing() {
  const navigate = useNavigate();
  const { show } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ListingFormInput>({
    resolver: zodResolver(listingFormSchema),
    defaultValues: { transferEligibility: true, transferMethod: 'PROVIDER_APP_TRANSFER', totalQuantity: 1 },
  });

  const onSubmit = async (data: ListingFormInput) => {
    try {
      const res = await api.post('/listings', data);
      show('Listing published', 'success');
      navigate(`/tickets/${res.data.listing.id}`);
    } catch (err) {
      show(getErrorMessage(err), 'error');
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-white">List a Ticket</h1>
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
          <Input type="number" min={1} max={20} label="Number of tickets" {...register('totalQuantity')} error={errors.totalQuantity?.message} />
          <Input type="number" min={0} step="0.01" label="Original price per ticket" {...register('originalPricePerTicket')} error={errors.originalPricePerTicket?.message} />
          <Input type="number" min={0} step="0.01" label="Asking price per ticket" {...register('askingPricePerTicket')} error={errors.askingPricePerTicket?.message} />
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

          <div className="col-span-full rounded-xl border border-amber-800 bg-amber-900/20 p-3 text-xs text-amber-200">
            Listings not marked eligible for a supported transfer method will not be published. PlanBDeal never
            claims a screenshot or QR code proves a valid transfer.
          </div>

          <Button type="submit" isLoading={isSubmitting} className="col-span-full">
            Publish Listing
          </Button>
        </form>
      </Card>
    </div>
  );
}
