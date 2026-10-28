import { createRateLimiter } from './rateLimit';
import { YouCamError } from './errors';

export function errorResponse(status: number, code: string, message?: string): Response {
  return Response.json({ error: message ? { code, message } : { code } }, { status });
}

/** Run a YouCam call and return its result as JSON; API failures become 502. */
export async function respond(fn: () => Promise<unknown>): Promise<Response> {
  try {
    return Response.json(await fn());
  } catch (e) {
    if (e instanceof YouCamError) return errorResponse(e.status >= 500 ? e.status : 502, e.code, e.message);
    throw e;
  }
}

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

/** Read the `image` field of a multipart request, or an error response. */
export async function readImage(req: Request): Promise<{ form: FormData; bytes: Uint8Array } | Response> {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return errorResponse(400, 'missing_image');
  }
  const image = form.get('image');
  if (!(image instanceof Blob)) return errorResponse(400, 'missing_image');
  if (image.size > MAX_IMAGE_BYTES) return errorResponse(413, 'image_too_large');
  return { form, bytes: new Uint8Array(await image.arrayBuffer()) };
}

const DEFAULT_SCANS_PER_IP_PER_DAY = 10;
const scanLimiter = createRateLimiter(24 * 60 * 60 * 1000);

/**
 * Daily per-visitor cap on calls that spend API units, so a public demo link
 * can't be used to drain the account. Mock mode spends nothing and is never capped.
 */
export function overScanLimit(req: Request): Response | null {
  if (process.env.YOUCAM_MOCK === '1') return null;
  const raw = process.env.SCAN_LIMIT_PER_IP_PER_DAY?.trim();
  const limit = raw && Number.isFinite(Number(raw)) ? Number(raw) : DEFAULT_SCANS_PER_IP_PER_DAY;
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  return scanLimiter.take(ip, limit) ? null : errorResponse(429, 'rate_limited');
}
