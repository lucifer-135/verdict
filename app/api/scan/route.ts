import { SD_ACTIONS, isConcernId, type ConcernId } from '@/lib/verdict/concerns';
import { getClient } from '@/lib/youcam/client';
import { errorResponse, readImage, respond } from '@/lib/youcam/http';

export const runtime = 'nodejs';

/** Start a skin analysis. Multipart: `image` (JPEG ≤ 4 MB), optional `actions` (comma list). */
export async function POST(req: Request) {
  const read = await readImage(req);
  if (read instanceof Response) return read;

  let actions: readonly ConcernId[] = SD_ACTIONS;
  const raw = read.form.get('actions');
  if (typeof raw === 'string' && raw.trim()) {
    const list = raw.split(',').map(s => s.trim());
    if (!list.every(isConcernId)) return errorResponse(400, 'invalid_actions');
    actions = list;
  }
  return respond(() => getClient().createSkinAnalysis({ bytes: read.bytes }, actions));
}
