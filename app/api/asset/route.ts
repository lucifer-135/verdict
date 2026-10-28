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
  if (!upstream.ok || !upstream.body) return errorResponse(502, 'asset_fetch_failed');

  return new Response(upstream.body, {
    headers: {
      'Content-Type': upstream.headers.get('Content-Type') ?? 'application/octet-stream',
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
