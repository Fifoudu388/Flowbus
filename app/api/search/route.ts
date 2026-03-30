// app/api/search/route.ts
import { NextResponse } from 'next/server';
import { downloadGtfs, readGtfsFile, parseCsv } from '@/lib/gtfs';

interface Stop {
  stop_id: string;
  stop_name: string;
  stop_lat: string;
  stop_lon: string;
  stop_code?: string;
}

let initialized = false;

export async function GET(request: Request): Promise<NextResponse> {
  if (!initialized) {
    await downloadGtfs();
    initialized = true;
  }
  
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  
  if (!query || query.length < 2) {
    return NextResponse.json(
      { error: 'Query too short, minimum 2 characters' },
      { status: 400 }
    );
  }
  
  const stopsCsv = await readGtfsFile('stops.txt');
  const stops = parseCsv<Stop>(stopsCsv);
  
  const filtered = stops.filter(
    (s) =>
      s.stop_name.toLowerCase().includes(query.toLowerCase()) ||
      s.stop_id.toLowerCase().includes(query.toLowerCase()) ||
      (s.stop_code && s.stop_code.toLowerCase().includes(query.toLowerCase()))
  );
  
  return NextResponse.json(filtered);
}
