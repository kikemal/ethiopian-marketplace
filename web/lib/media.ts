import { getApiUrl } from '@/lib/api';

const PLACEHOLDER = '/placeholder-listing.svg';

/**
 * Resolve listing/media URLs for the current environment.
 * Rewrites relative /uploads paths and legacy localhost API hosts onto NEXT_PUBLIC_API_URL
 * so collaborators and production do not request another developer's localhost.
 */
export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url || !url.trim()) return PLACEHOLDER;
  const trimmed = url.trim();

  if (trimmed.startsWith('/placeholder') || trimmed === PLACEHOLDER) {
    return PLACEHOLDER;
  }

  const api = getApiUrl().replace(/\/$/, '');

  if (trimmed.startsWith('/uploads/') || trimmed.startsWith('/placeholders/')) {
    return `${api}${trimmed}`;
  }

  const local = trimmed.match(
    /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(\/uploads\/.+)$/i
  );
  if (local) {
    return `${api}${local[1]}`;
  }

  return trimmed;
}

export function isRemoteMedia(url: string): boolean {
  return /^https?:\/\//i.test(url);
}
