'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowDownRight, ArrowRight, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { Listing, Category } from '@/types';
import { ListingCard } from '@/components/ListingCard';
import { Carousel } from '@/components/Carousel';
import { Reveal } from '@/components/Reveal';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { SafeImage } from '@/components/SafeImage';
import { resolveMediaUrl } from '@/lib/media';

const FALLBACK_CATEGORIES = [
  'Electronics',
  'Clothing',
  'Furniture',
  'Books',
  'Vehicles',
  'Kitchen',
  'Tools',
  'Other',
].map((name) => ({ id: name, name }));

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api<{ items: Listing[] }>('/api/listings?limit=12&sort=newest'),
      api<Category[]>('/api/listings/categories'),
    ])
      .then(([listRes, catRes]) => {
        setListings(listRes.data.items);
        setCategories(catRes.data);
      })
      .catch((e) => setError(e.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/listings?query=${encodeURIComponent(q)}` : '/listings');
  }

  const heroListing = listings[0];
  const featured = listings.slice(0, 3);
  const trending = listings.slice(0, 8);
  const arrivals = listings.slice(3, 9);
  const cats = categories.length ? categories : FALLBACK_CATEGORIES;

  const heroImage = useMemo(() => {
    const raw = heroListing?.primary_image || heroListing?.images?.[0] || null;
    return raw ? resolveMediaUrl(raw) : null;
  }, [heroListing]);

  return (
    <div className="bg-paper">
      {/* ── Cinematic hero ── */}
      <section className="relative min-h-[100svh] overflow-hidden bg-ink text-white">
        <div className="absolute inset-0">
          {heroImage ? (
            <SafeImage
              src={heroImage}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover opacity-55"
            />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,#44403c,transparent_50%),radial-gradient(ellipse_at_80%_10%,#a1620733,transparent_40%),linear-gradient(160deg,#0c0a09,#1c1917_55%,#292524)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-ink/55 via-ink/35 to-ink/90" />
        </div>

        <div className="page-shell relative z-10 flex min-h-[100svh] flex-col justify-end pb-16 pt-28 sm:pb-24 sm:pt-32">
          <p className="eyebrow animate-fade-up text-white/60">Ethiopia · Second-hand · Editorial</p>
          <h1 className="mt-4 max-w-5xl font-display text-hero font-medium animate-fade-up [animation-delay:80ms]">
            The market,
            <br />
            reimagined.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-white/70 animate-fade-up sm:text-lg [animation-delay:140ms]">
            Discover considered objects from local sellers — message directly, buy with secure
            checkout, and sell what no longer fits your life.
          </p>

          <form
            onSubmit={onSearch}
            className="mt-8 flex w-full max-w-xl flex-col gap-3 animate-fade-up sm:flex-row [animation-delay:200ms]"
          >
            <label htmlFor="home-search" className="sr-only">
              Search listings
            </label>
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" aria-hidden />
              <input
                id="home-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search phones, furniture, bikes…"
                className="w-full border-0 border-b border-white/35 bg-transparent py-3 pl-7 pr-3 text-white outline-none placeholder:text-white/45 focus:border-accent-400"
              />
            </div>
            <Button type="submit" variant="secondary" className="shrink-0">
              Search
            </Button>
          </form>

          <div className="mt-10 flex flex-wrap items-center gap-6 text-xs uppercase tracking-[0.18em] text-white/50 animate-fade-up [animation-delay:260ms]">
            <Link href="/listings" className="inline-flex items-center gap-2 hover:text-white">
              Enter the shop <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link href="/auth/register" className="inline-flex items-center gap-2 hover:text-white">
              Start selling <ArrowDownRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {error && (
        <div className="page-shell pt-8">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      {/* ── Categories carousel ── */}
      <section className="section-pad border-b border-border">
        <div className="page-shell">
          <Reveal>
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <p className="eyebrow">Browse</p>
                <h2 className="mt-2 font-display text-display font-medium">Categories</h2>
              </div>
              <Link href="/listings" className="hidden text-xs font-semibold uppercase tracking-[0.16em] text-muted hover:text-ink sm:inline">
                View all
              </Link>
            </div>
          </Reveal>
          <Carousel label="Categories">
            {cats.map((cat, i) => (
              <Link
                key={cat.id}
                href={`/listings?category_id=${cat.id}`}
                className="group relative block min-w-[70vw] snap-start overflow-hidden bg-ink sm:min-w-[18rem]"
              >
                <div className="aspect-[4/5] bg-gradient-to-br from-stone-700 to-ink transition duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">0{i + 1}</p>
                  <p className="mt-1 font-display text-2xl text-white sm:text-3xl">{cat.name}</p>
                </div>
              </Link>
            ))}
          </Carousel>
        </div>
      </section>

      {/* ── Featured editorial ── */}
      <section className="section-pad">
        <div className="page-shell">
          <Reveal>
            <div className="mb-10 max-w-2xl">
              <p className="eyebrow">Featured collection</p>
              <h2 className="mt-2 font-display text-display font-medium">Objects with a story</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
                A curated cut of what&apos;s live on SuqET right now — larger pieces first, then supporting finds.
              </p>
            </div>
          </Reveal>

          {loading && (
            <div className="flex justify-center py-20">
              <Spinner />
            </div>
          )}

          {!loading && featured.length > 0 && (
            <div className="grid gap-4 lg:grid-cols-12 lg:gap-6">
              <Reveal className="lg:col-span-7" delayMs={40}>
                {featured[0] && <ListingCard listing={featured[0]} priority size="featured" />}
              </Reveal>
              <div className="grid gap-4 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-1 lg:gap-6">
                {featured.slice(1, 3).map((l, i) => (
                  <Reveal key={l.id} delayMs={80 + i * 60}>
                    <ListingCard listing={l} />
                  </Reveal>
                ))}
              </div>
            </div>
          )}

          {!loading && featured.length === 0 && !error && (
            <p className="border border-dashed border-border px-6 py-16 text-center text-sm text-muted">
              No listings yet.{' '}
              <Link href="/auth/register" className="underline underline-offset-4">
                Be the first to list
              </Link>
              .
            </p>
          )}
        </div>
      </section>

      {/* ── Trending carousel ── */}
      {trending.length > 0 && (
        <section className="section-pad border-y border-border bg-stone-100/80">
          <div className="page-shell">
            <Reveal>
              <div className="mb-2 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="eyebrow">Trending</p>
                  <h2 className="mt-2 font-display text-display font-medium">In motion</h2>
                </div>
                <Link
                  href="/listings"
                  className="text-xs font-semibold uppercase tracking-[0.16em] text-muted hover:text-ink"
                >
                  Shop all
                </Link>
              </div>
            </Reveal>
            <Carousel label="Trending listings">
              {trending.map((l) => (
                <div key={l.id} className="min-w-[72vw] sm:min-w-[16rem] lg:min-w-[18rem]">
                  <ListingCard listing={l} size="compact" />
                </div>
              ))}
            </Carousel>
          </div>
        </section>
      )}

      {/* ── Immersive sell CTA ── */}
      <section className="relative overflow-hidden">
        <div className="grid lg:grid-cols-2">
          <div className="relative min-h-[22rem] bg-stone-300 lg:min-h-[32rem]">
            {listings[1]?.primary_image || listings[1]?.images?.[0] ? (
              <SafeImage
                src={(listings[1].primary_image || listings[1].images[0]) as string}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width:1024px) 100vw, 50vw"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-stone-400 to-stone-700" />
            )}
          </div>
          <div className="flex flex-col justify-center bg-paper px-6 py-16 sm:px-12 lg:px-16">
            <Reveal>
              <p className="eyebrow">For sellers</p>
              <h2 className="mt-3 font-display text-display font-medium">Turn unused into opportunity</h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-muted sm:text-base">
                List in minutes, chat with buyers in-app, and settle through secure checkout — built for how Ethiopia trades.
              </p>
              <div className="mt-8">
                <Link href="/auth/register">
                  <Button>Start selling</Button>
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── New arrivals grid ── */}
      {arrivals.length > 0 && (
        <section className="section-pad">
          <div className="page-shell">
            <Reveal>
              <div className="mb-10 flex items-end justify-between gap-4">
                <div>
                  <p className="eyebrow">Just listed</p>
                  <h2 className="mt-2 font-display text-display font-medium">New arrivals</h2>
                </div>
                <Link href="/listings?sort=newest" className="text-xs font-semibold uppercase tracking-[0.16em] text-muted hover:text-ink">
                  View all
                </Link>
              </div>
            </Reveal>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
              {arrivals.map((l, i) => (
                <Reveal key={l.id} delayMs={i * 40}>
                  <ListingCard listing={l} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Trust strip ── */}
      <section className="border-t border-border">
        <div className="page-shell grid gap-8 py-14 sm:grid-cols-3 sm:py-16">
          {[
            { t: 'Secure checkout', d: 'Pay through SuqET with order status tracked in the app.' },
            { t: 'Verified sellers', d: 'KYC-reviewed sellers earn a verified mark buyers can trust.' },
            { t: 'Direct messaging', d: 'Talk condition, meetup, and offers without leaving the listing.' },
          ].map((item, i) => (
            <Reveal key={item.t} delayMs={i * 70}>
              <p className="font-display text-2xl font-medium">{item.t}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">{item.d}</p>
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}
