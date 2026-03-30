import { NextRequest, NextResponse } from 'next/server';
import { fetchStops } from '@/lib/api';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';

  if (q.length < 2) {
    return NextResponse.json([]);
  }

  try {
    const data = await fetchStops(q);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erreur API' }, { status: 502 });
  }
}
