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
