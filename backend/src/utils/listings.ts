import { Prisma } from '@prisma/client';
import prisma from '../models/prisma';
import { toPublicMediaUrl } from './mediaUrl';

export function mapListing(listing: {
  id: string;
  seller_id: string;
  title: string;
  description: string;
  price: Prisma.Decimal;
  condition: string;
  category_id: string;
  location: string;
  status: string;
  created_at: Date;
  images?: { url: string; is_primary: boolean }[];
  seller?: { id: string; name: string; is_verified: boolean };
  view_count?: number;
}) {
  const images = (listing.images ?? [])
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary))
    .map((i) => toPublicMediaUrl(i.url))
    .filter(Boolean);
  return {
    id: listing.id,
    seller_id: listing.seller_id,
    title: listing.title,
    description: listing.description,
    price: Number(listing.price),
    condition: listing.condition,
    category_id: listing.category_id,
    location: listing.location,
    status: listing.status,
    images,
    created_at: listing.created_at.toISOString(),
    seller: listing.seller,
    view_count: listing.view_count ?? 0,
    primary_image: images[0] ?? null,
  };
}

/** PostgreSQL tsvector search over listing title + description. */
export async function idsMatchingFullText(query: string): Promise<string[] | 'skip'> {
  const q = query.trim();
  if (!q) return 'skip';
  try {
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Listing"
      WHERE to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, ''))
        @@ plainto_tsquery('simple', ${q})
    `;
    return rows.map((r) => r.id);
  } catch {
    const rows = await prisma.listing.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }
}
