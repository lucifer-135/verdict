import { getClient } from '@/lib/youcam/client';
import { respond } from '@/lib/youcam/http';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params;
  return respond(() => getClient().getSkinAnalysis(taskId));
}
