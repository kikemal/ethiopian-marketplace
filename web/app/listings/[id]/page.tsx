'use client';

import { FormEvent, Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { BadgeCheck, ChevronLeft, Flag, MapPin, MessageCircle, Pencil, ShoppingBag, Tag } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Listing } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { ListingChat } from '@/components/ListingChat';
import { Reveal } from '@/components/Reveal';
import { SafeImage } from '@/components/SafeImage';
import { resolveMediaUrl } from '@/lib/media';

function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, token } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [listing, setListing] = useState<Listing | null>(null);
  const [activeImg, setActiveImg] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [offerOpen, setOfferOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    api<Listing>(`/api/listings/${id}`)
      .then((r) => setListing(r.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function buyNow() {
    if (!user) {
      router.push(`/auth/login?next=/listings/${id}`);
      return;
    }
    setBusy(true);
    try {
      const res = await api<{ checkout_url: string }>('/api/payments/initialize', {
        method: 'POST',
        token,
        body: JSON.stringify({ listing_id: id }),
      });
      window.location.href = res.data.checkout_url;
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'Payment failed');
    } finally {
      setBusy(false);
    }
  }

  async function sendOffer(e: FormEvent) {
    e.preventDefault();
    if (!user) {
      router.push(`/auth/login?next=/listings/${id}`);
      return;
    }
    setBusy(true);
    try {
      await api(`/api/listings/${id}/offer`, {
        method: 'POST',
        token,
        body: JSON.stringify({ amount: Number(offerAmount) }),
      });
      setNote('Offer sent to the seller.');
      setOfferOpen(false);
    } catch (err) {
      setNote(err instanceof Error ? err.message : 'Offer failed');
    } finally {
      setBusy(false);
    }
  }

  async function reportListing() {
    if (!user) {
      router.push(`/auth/login?next=/listings/${id}`);
      return;
    }
    const reason = window.prompt('Why are you reporting this listing?');
    if (!reason) return;
    try {
      await api('/api/reports', {
        method: 'POST',
        token,
        body: JSON.stringify({ target_type: 'listing', target_id: id, reason }),
      });
      setNote('Thanks — your report was submitted.');
    } catch (err) {
      setNote(err instanceof Error ? err.message : 'Report failed');
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" aria-busy="true">
        <Spinner />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="page-shell py-24">
        <Alert tone="error">{error || 'Listing not found'}</Alert>
      </div>
    );
  }

  const images = (listing.images?.length ? listing.images : ['/placeholder-listing.svg']).map(
    resolveMediaUrl
  );
  const isOwn = user?.id === listing.seller_id;
  const canBuy = listing.status === 'active' && !isOwn;
  const fromInbox = Boolean(searchParams.get('with'));
  const peerId = searchParams.get('with') || listing.seller_id;
  const showChat = Boolean(user && (listing.status === 'active' || fromInbox));
  const noteIsSuccess = note.includes('sent') || note.includes('Thanks') || note.includes('submitted');

  return (
    <div className="bg-paper">
      <div className="page-shell pt-24 sm:pt-28">
        <Link
          href="/listings"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-muted transition hover:text-ink"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
          Back to shop
        </Link>
      </div>

      <div className="page-shell grid gap-8 py-8 lg:grid-cols-12 lg:gap-12 lg:py-12">
        <div className="lg:col-span-7">
          <Reveal>
            <div className="relative aspect-[4/5] overflow-hidden bg-stone-200 sm:aspect-[5/6]">
              <SafeImage
                src={images[activeImg]}
                alt={listing.title}
                fill
                sizes="(max-width: 1024px) 100vw, 58vw"
                className="object-cover"
                priority
              />
            </div>
          </Reveal>
          {images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1" role="list" aria-label="Listing photos">
              {images.map((src, i) => (
                <button
                  key={src + i}
                  type="button"
                  onClick={() => setActiveImg(i)}
                  aria-label={`Show photo ${i + 1}`}
                  aria-current={i === activeImg ? 'true' : undefined}
                  className={`relative h-20 w-16 shrink-0 overflow-hidden border transition sm:h-24 sm:w-20 ${
                    i === activeImg ? 'border-ink' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <SafeImage src={src} alt="" fill className="object-cover" sizes="80px" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-28 lg:space-y-6">
            <Reveal delayMs={60}>
              <p className="eyebrow">
                {listing.condition.replace('_', ' ')}
                {listing.status !== 'active' ? ` · ${listing.status}` : ''}
              </p>
              <h1 className="mt-3 font-display text-4xl font-medium leading-tight tracking-tight sm:text-5xl">
                {listing.title}
              </h1>
              <p className="mt-4 font-display text-3xl font-medium text-ink">
                {listing.price.toLocaleString()}{' '}
                <span className="text-lg font-sans font-medium text-muted">ETB</span>
              </p>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" aria-hidden />
                  {listing.location}
                </span>
                {listing.seller && (
                  <span className="inline-flex items-center gap-1.5">
                    {listing.seller.is_verified && (
                      <BadgeCheck className="h-3.5 w-3.5 text-accent-600" aria-hidden />
                    )}
                    {listing.seller.name}
                    {listing.seller.is_verified ? ' · Verified' : ''}
                  </span>
                )}
              </div>
            </Reveal>

            <Reveal delayMs={120}>
              <p className="mt-6 whitespace-pre-wrap text-sm leading-relaxed text-ink/80 sm:text-base">
                {listing.description}
              </p>
            </Reveal>

            {canBuy && (
              <div className="mt-8 space-y-3 border-t border-border pt-6">
                <Button variant="secondary" className="w-full" onClick={buyNow} loading={busy}>
                  <ShoppingBag className="h-4 w-4" aria-hidden />
                  Buy now
                </Button>
                <Button variant="outline" className="w-full" onClick={() => setOfferOpen(true)}>
                  <Tag className="h-4 w-4" aria-hidden />
                  Make an offer
                </Button>
              </div>
            )}

            {isOwn && (
              <div className="mt-8 flex flex-col gap-3 border border-border bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted">This is your listing.</p>
                <Link href={`/listings/${listing.id}/edit`}>
                  <Button variant="outline" type="button">
                    <Pencil className="h-4 w-4" aria-hidden />
                    Edit
                  </Button>
                </Link>
              </div>
            )}

            {note && (
              <div className="mt-4">
                <Alert tone={noteIsSuccess ? 'success' : 'error'}>{note}</Alert>
              </div>
            )}

            {!isOwn && (
              <button
                type="button"
                onClick={reportListing}
                className="mt-6 inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.14em] text-muted hover:text-ink"
              >
                <Flag className="h-3.5 w-3.5" aria-hidden />
                Report
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="page-shell space-y-8 pb-20">
        {showChat ? (
          <ListingChat listingId={listing.id} sellerId={listing.seller_id} peerId={peerId} />
        ) : listing.status !== 'active' && !isOwn ? (
          <Alert tone="info">
            This listing is no longer available.{' '}
            {user ? (
              <Link href="/inbox" className="font-semibold underline">
                Open inbox
              </Link>
            ) : (
              'Sign in to see past conversations in Inbox.'
            )}
          </Alert>
        ) : (
          !isOwn && (
            <Alert tone="info">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 font-semibold underline"
                onClick={() => router.push(`/auth/login?next=/listings/${id}`)}
              >
                <MessageCircle className="h-4 w-4" aria-hidden />
                Sign in
              </button>{' '}
              to message the seller.
            </Alert>
          )
        )}
      </div>

      {offerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="offer-dialog-title"
        >
          <form onSubmit={sendOffer} className="w-full max-w-md space-y-4 border border-border bg-surface p-6">
            <h2 id="offer-dialog-title" className="font-display text-2xl font-medium">
              Make an offer
            </h2>
            <Input
              id="offer-amount"
              label="Amount (ETB)"
              type="number"
              required
              min={1}
              value={offerAmount}
              onChange={(e) => setOfferAmount(e.target.value)}
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="submit" variant="secondary" loading={busy}>
                Send offer
              </Button>
              <Button type="button" variant="ghost" onClick={() => setOfferOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default function ListingDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <ListingDetail />
    </Suspense>
  );
}
