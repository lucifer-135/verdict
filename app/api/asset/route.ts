import { isAllowedAssetUrl } from '@/lib/youcam/assetHosts';
import { errorResponse } from '@/lib/youcam/http';

export const runtime = 'nodejs';

/**
 * Same-origin proxy for YouCam result masks and images, so the browser can
 * store them. Only https URLs on allowlisted hosts are fetched; redirects are
 * refused so the allowlist can't be bypassed.
 */
export async function GET(req: Request) {
  const u = new URL(req.url).searchParams.get('u');
  if (!u || !isAllowedAssetUrl(u)) return errorResponse(400, 'invalid_asset_url');

  let upstream: Response;
  try {
    upstream = await fetch(u, { redirect: 'error' });
  } catch {
    return errorResponse(502, 'asset_fetch_failed');
  }
  if (!upstream.ok) return errorResponse(502, 'asset_fetch_failed');

  // S3 does not label the masks reliably, so the type comes from the bytes.
  // Served from our origin, so only raster images pass: no HTML, script or SVG.
  const bytes = new Uint8Array(await upstream.arrayBuffer());
  const type = rasterType(bytes);
  if (!type) return errorResponse(502, 'asset_fetch_failed');

  return new Response(bytes, {
    headers: {
      'Content-Type': type,
      'Cache-Control': 'private, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

/** JPEG, PNG or WebP by magic bytes; null for anything else. */
function rasterType(b: Uint8Array): string | null {
  const starts = (...sig: number[]) => sig.every((v, i) => b[i] === v);
  if (starts(0xff, 0xd8, 0xff)) return 'image/jpeg';
  if (starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return 'image/png';
  if (starts(0x52, 0x49, 0x46, 0x46) && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp';
  return null;
}
