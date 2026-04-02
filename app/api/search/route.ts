// app/api/search/route.ts
import { NextResponse } from 'next/server';
import { downloadGtfs, readGtfsFile, parseCsv, normalizeStopName } from '@/lib/gtfs';

interface Stop {
  stop_id: string;
  stop_code: string;
  stop_name: string;
  stop_desc: string;
  stop_lat: string;
  stop_lon: string;
  zone_id: string;
  stop_url: string;
  location_type: string;
  parent_station: string;
  stop_timezone: string;
  wheelchair_boarding: string;
  platform_code: string;
  level_id: string;
}

let initialized = false;
let allStops: Stop[] = [];

export async function GET(request: Request): Promise<NextResponse> {
  if (!initialized) {
    await downloadGtfs();
    const stopsCsv = await readGtfsFile('stops.txt');
    allStops = parseCsv<Stop>(stopsCsv);
    initialized = true;
    console.log(`Loaded ${allStops.length} stops`);
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';

  if (!query || query.length < 2) {
    return NextResponse.json(
      { error: 'Query too short, minimum 2 characters' },
      { status: 400 }
    );
  }

  const normalizedQuery = normalizeStopName(query);
  console.log('Search:', query, '-> normalized:', normalizedQuery);

  const filtered = allStops.filter((stop) => {
    const normalizedName = normalizeStopName(stop.stop_name || '');
    const stopId = (stop.stop_id || '').toLowerCase();
    const stopCode = (stop.stop_code || '').toLowerCase();

    return (
      normalizedName.includes(normalizedQuery) ||
      stopId.includes(query.toLowerCase()) ||
      stopCode.includes(query.toLowerCase())
    );
  }).slice(0, 20);

  console.log(`Found ${filtered.length} results for "${query}"`);
  return NextResponse.json(filtered);
}
