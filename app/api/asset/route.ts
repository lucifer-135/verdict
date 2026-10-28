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
  // Served from our origin, so only raster images pass: no HTML, script or SVG.
  const type = upstream.headers.get('Content-Type') ?? '';
  if (!upstream.ok || !upstream.body || !/^image\/(jpeg|png|webp)\b/.test(type)) {
    return errorResponse(502, 'asset_fetch_failed');
  }

  return new Response(upstream.body, {
    headers: {
      'Content-Type': type,
      'Cache-Control': 'private, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
