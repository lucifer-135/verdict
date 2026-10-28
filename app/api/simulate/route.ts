import { getConcern, isConcernId, type ConcernId } from '@/lib/verdict/concerns';
import { getClient } from '@/lib/youcam/client';
import { errorResponse, overScanLimit, readImage, respond } from '@/lib/youcam/http';

export const runtime = 'nodejs';

type SimConcern = { concern: ConcernId; intensity: number };

function parseConcerns(raw: FormDataEntryValue | null): SimConcern[] | null {
  if (typeof raw !== 'string') return null;
  let list: unknown;
  try {
    list = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(list) || list.length === 0) return null;
  const valid = list.every(
    (c): c is SimConcern =>
      typeof c?.concern === 'string' &&
      isConcernId(c.concern) &&
      getConcern(c.concern).simulable &&
      typeof c.intensity === 'number' &&
      c.intensity > 0 &&
      c.intensity <= 1,
  );
  return valid ? (list as SimConcern[]) : null;
}

/** Start a skin simulation. Multipart: `image`, `concerns` (JSON [{ concern, intensity }]). */
export async function POST(req: Request) {
  const limited = overScanLimit(req);
  if (limited) return limited;
  const read = await readImage(req);
  if (read instanceof Response) return read;
  const concerns = parseConcerns(read.form.get('concerns'));
  if (!concerns) return errorResponse(400, 'invalid_concerns');
  return respond(() => getClient().createSkinSimulation({ bytes: read.bytes }, concerns));
}
