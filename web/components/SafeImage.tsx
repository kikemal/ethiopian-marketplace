'use client';

import Image, { ImageProps } from 'next/image';
import { useEffect, useState } from 'react';
import { resolveMediaUrl } from '@/lib/media';

type SafeImageProps = Omit<ImageProps, 'src'> & {
  src: string | null | undefined;
  fallback?: string;
};

/**
 * next/image wrapper that resolves API-relative/localhost media URLs and
 * falls back to a placeholder when the remote file is missing.
 */
export function SafeImage({
  src,
  fallback = '/placeholder-listing.svg',
  alt,
  onError,
  ...rest
}: SafeImageProps) {
  const resolved = resolveMediaUrl(src);
  const [current, setCurrent] = useState(resolved);

  useEffect(() => {
    setCurrent(resolveMediaUrl(src));
  }, [src]);

  return (
    <Image
      {...rest}
      alt={alt}
      src={current || fallback}
      onError={(e) => {
        if (current !== fallback) setCurrent(fallback);
        onError?.(e);
      }}
      unoptimized={
        typeof current === 'string' &&
        (current.includes('/uploads/') || current.includes('onrender.com'))
      }
    />
  );
}
