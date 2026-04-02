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

export async function GET(request: Request): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    console.log('Downloading GTFS...');
    await downloadGtfs();
    console.log('GTFS downloaded in', Date.now() - startTime, 'ms');
  } catch (error) {
    console.error('Error downloading GTFS:', error);
    return NextResponse.json(
      { error: 'Failed to download GTFS', details: String(error) },
      { status: 500 }
    );
  }

  try {
    console.log('Reading stops.txt...');
    const stopsCsv = await readGtfsFile('stops.txt');
    console.log('stops.txt length:', stopsCsv.length, 'chars');
    console.log('First 500 chars:', stopsCsv.substring(0, 500));

    if (!stopsCsv) {
      return NextResponse.json(
        { error: 'stops.txt is empty or not found' },
        { status: 500 }
      );
    }

    console.log('Parsing CSV...');
    const allStops = parseCsv<Stop>(stopsCsv);
    console.log('Parsed', allStops.length, 'stops');
    console.log('First 3 stops:', allStops.slice(0, 3));

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    console.log('Query:', query);

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: 'Query too short, minimum 2 characters', totalStops: allStops.length },
        { status: 400 }
      );
    }

    const normalizedQuery = normalizeStopName(query);
    console.log('Normalized query:', normalizedQuery);

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

    console.log('Found', filtered.length, 'results');

    return NextResponse.json({
      query,
      normalizedQuery,
      totalStops: allStops.length,
      results: filtered,
    });
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: 'Internal error', details: String(error) },
      { status: 500 }
    );
  }
}