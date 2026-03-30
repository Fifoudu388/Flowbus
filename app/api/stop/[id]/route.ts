import { NextResponse } from 'next/server';
import { fetchStopRealtime } from '@/lib/api';

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  try {
    const data = await fetchStopRealtime(id);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erreur API' }, { status: 502 });
  }
}
