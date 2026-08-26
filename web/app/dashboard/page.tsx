'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SafeImage } from '@/components/SafeImage';
import { useRouter } from 'next/navigation';
import { Package, MessageSquare, HandCoins } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';

interface DashboardData {
  stats: {
    active_listings: number;
    total_sold: number;
    unread_messages: number;
    pending_verifications: number;
  };
  is_verified: boolean;
  listings: {
    id: string;
    title: string;
    status: string;
    price: number;
    view_count: number;
    image: string | null;
  }[];
  recent_messages: {
    id: string;
    content: string;
    sender: { id: string; name: string };
    listing: { id: string; title: string };
  }[];
  held_sales: {
    id: string;
    amount: number;
    status: string;
    listing: { id: string; title: string };
    created_at: string;
  }[];
}

export default function DashboardPage() {
  const { user, token, isLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const canManage = user?.role === 'seller' || user?.role === 'admin';

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/auth/login?next=/dashboard');
      return;
    }
    if (!canManage) router.replace('/');
  }, [user, isLoading, router, canManage]);

  useEffect(() => {
    if (!user || !canManage) return;
    api<DashboardData>('/api/dashboard', token ? { token } : {})
      .then((r) => setData(r.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user, token, canManage]);

  async function releaseSale(id: string) {
    if (!user) return;
    setBusyId(id);
    try {
      await api(`/api/payments/release/${id}`, { method: 'POST', token });
      setData((d) =>
        d ? { ...d, held_sales: d.held_sales.filter((s) => s.id !== id) } : d
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not release');
    } finally {
      setBusyId('');
    }
  }

  async function removeListing(id: string) {
    if (!user || !confirm('Remove this listing?')) return;
    await api(`/api/listings/${id}`, { method: 'DELETE', token });
    setData((d) =>
      d
        ? {
            ...d,
            listings: d.listings.filter((l) => l.id !== id),
            stats: {
              ...d.stats,
              active_listings: Math.max(0, d.stats.active_listings - 1),
            },
          }
        : d
    );
  }

  if (isLoading || !canManage || loading) {
    return (
      <div className="page-shell flex justify-center pt-24 sm:pt-28 pb-16">
        <Spinner />
      </div>
    );
  }

  if (!data) {
    return error ? (
      <div className="page-shell pt-24 sm:pt-28 pb-16">
        <Alert tone="error">{error}</Alert>
      </div>
    ) : null;
  }

  const kpis: [string, number][] = [
    ['Active', data.stats.active_listings],
    ['Sold', data.stats.total_sold],
    ['Unread', data.stats.unread_messages],
    ['Pending verify', data.stats.pending_verifications],
  ];

  return (
    <div>
      <section className="border-b border-border bg-ink text-white">
        <div className="page-shell flex flex-wrap items-end justify-between gap-4 pt-24 sm:pt-28 pb-10 sm:pb-12">
          <div>
            <p className="eyebrow text-white/45">Seller</p>
            <h1 className="mt-3 font-display text-display font-medium">Dashboard</h1>
            <p className="mt-3 max-w-lg text-sm text-white/60">Manage listings and messages</p>
          </div>
          <Link href="/sell">
            <Button variant="inverse">New listing</Button>
          </Link>
        </div>
      </section>

      <div className="page-shell space-y-10 py-10 pb-16">
        {error && <Alert tone="error">{error}</Alert>}

        {!data.is_verified && (
          <Alert tone="info">
            Get verified to build buyer trust.{' '}
            <Link href="/verify" className="font-semibold underline underline-offset-2">
              Start verification
            </Link>
          </Alert>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {kpis.map(([label, value]) => (
            <div key={label} className="border border-border bg-surface p-5">
              <p className="eyebrow">{label}</p>
              <p className="mt-3 font-display text-3xl font-medium text-ink">{value}</p>
            </div>
          ))}
        </div>

        <section className="space-y-4">
          <h2 className="font-display text-2xl font-medium text-ink">My listings</h2>
          {data.listings.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No listings yet"
              description="Create your first listing to start selling on the marketplace."
              actionHref="/sell"
              actionLabel="New listing"
            />
          ) : (
            <div className="overflow-x-auto border border-border bg-surface">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                      Item
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                      Status
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                      Price
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                      Views
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.listings.map((l) => (
                    <tr
                      key={l.id}
                      className="border-b border-border last:border-0 transition hover:bg-paper"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative h-10 w-10 overflow-hidden border border-border bg-paper">
                            <SafeImage
                              src={l.image}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="40px"
                            />
                          </div>
                          <Link
                            href={`/listings/${l.id}`}
                            className="font-medium text-ink transition hover:underline"
                          >
                            {l.title}
                          </Link>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={l.status === 'active' ? 'green' : 'gray'}>{l.status}</Badge>
                      </td>
                      <td className="px-4 py-3 font-medium text-accent-600">
                        {l.price.toLocaleString()} ETB
                      </td>
                      <td className="px-4 py-3 text-muted">{l.view_count}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          className="text-danger-600 transition hover:underline"
                          onClick={() => removeListing(l.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-2xl font-medium text-ink">Held payments</h2>
          {(data.held_sales ?? []).length === 0 ? (
            <EmptyState
              icon={HandCoins}
              title="No held payments"
              description="Escrowed sales will appear here until you confirm delivery."
            />
          ) : (
            <ul className="space-y-2">
              {(data.held_sales ?? []).map((s) => (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-3 border border-border bg-surface px-5 py-4 text-sm"
                >
                  <div>
                    <Link
                      href={`/listings/${s.listing.id}`}
                      className="font-medium text-ink transition hover:underline"
                    >
                      {s.listing.title}
                    </Link>
                    <p className="mt-1 font-medium text-accent-600">
                      {s.amount.toLocaleString()} ETB held
                    </p>
                  </div>
                  <Button loading={busyId === s.id} onClick={() => releaseSale(s.id)}>
                    Confirm delivery
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-2xl font-medium text-ink">Recent messages</h2>
          {data.recent_messages.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="No messages yet"
              description="Buyer inquiries about your listings will show up here."
            />
          ) : (
            <ul className="space-y-2">
              {data.recent_messages.map((m) => (
                <li key={m.id} className="border border-border bg-surface px-5 py-4 text-sm transition hover:bg-paper">
                  <Link
                    href={`/listings/${m.listing.id}?with=${m.sender.id}`}
                    className="font-medium text-ink transition hover:underline"
                  >
                    {m.sender.name} · {m.listing.title}
                  </Link>
                  <p className="mt-1 text-muted">{m.content}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
