import Link from 'next/link';
import { BadgeCheck, Heart } from 'lucide-react';
import { Listing } from '@/types';
import { SafeImage } from '@/components/SafeImage';

export function ListingCard({
  listing,
  priority = false,
  size = 'default',
}: {
  listing: Listing;
  priority?: boolean;
  size?: 'default' | 'featured' | 'compact';
}) {
  const imgs = [
    listing.primary_image || listing.images?.[0],
    listing.images?.[1],
  ].filter(Boolean) as string[];
  const primary = imgs[0];
  const secondary = imgs[1];

  const wrap =
    size === 'featured'
      ? 'w-full'
      : size === 'compact'
        ? 'w-full'
        : 'w-full';

  return (
    <article className={`group relative snap-start ${wrap}`}>
      <Link href={`/listings/${listing.id}`} className="block cursor-pointer outline-none">
        <div
          className={`relative overflow-hidden bg-stone-200 ${
            size === 'featured' ? 'aspect-[3/4]' : size === 'compact' ? 'aspect-[3/4]' : 'aspect-[4/5]'
          }`}
        >
          <SafeImage
            src={primary}
            alt={listing.title}
            fill
            priority={priority}
            sizes={size === 'featured' ? '420px' : '(max-width:640px) 50vw, 33vw'}
            className={`object-cover transition duration-700 ease-out group-hover:scale-[1.04] ${
              secondary ? 'group-hover:opacity-0' : ''
            }`}
          />
          {secondary && (
            <SafeImage
              src={secondary}
              alt=""
              fill
              sizes="(max-width:640px) 50vw, 33vw"
              className="object-cover opacity-0 transition duration-700 group-hover:opacity-100"
              aria-hidden
            />
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/35 via-transparent to-transparent opacity-80" />
          {listing.seller?.is_verified && (
            <span className="absolute left-3 top-3 inline-flex items-center gap-1 bg-white/95 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-ink backdrop-blur-sm">
              <BadgeCheck className="h-3 w-3 text-accent-600" aria-hidden />
              Verified
            </span>
          )}
          <span className="absolute bottom-3 left-3 text-[10px] font-semibold uppercase tracking-wider text-white/90">
            {listing.condition.replace('_', ' ')}
          </span>
        </div>
        <div className="space-y-1 pt-3">
          <h3
            className={`font-display font-medium leading-snug text-ink ${
              size === 'featured' ? 'text-xl sm:text-2xl' : 'text-base sm:text-lg'
            }`}
          >
            <span className="line-clamp-2">{listing.title}</span>
          </h3>
          <p className="text-sm font-medium tracking-wide text-ink">
            {listing.price.toLocaleString()} <span className="text-muted">ETB</span>
          </p>
          <p className="truncate text-xs uppercase tracking-wider text-muted">{listing.location}</p>
        </div>
      </Link>
      <button
        type="button"
        className="absolute right-3 top-3 z-10 flex h-9 w-9 cursor-pointer items-center justify-center bg-white/90 text-ink opacity-0 transition duration-300 hover:bg-white group-hover:opacity-100 focus-visible:opacity-100"
        aria-label="Save for later"
        onClick={(e) => {
          e.preventDefault();
        }}
      >
        <Heart className="h-4 w-4" aria-hidden />
      </button>
    </article>
  );
}
