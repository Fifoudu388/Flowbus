// app/api/search/route.ts

import { NextResponse } from 'next/server';
import {
  readGtfsFile,
  parseCsv,
  normalizeStopName,
} from '@/lib/gtfs';

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

export async function GET(
  request: Request
): Promise<NextResponse> {
  try {
    const stopsCsv = await readGtfsFile('stops.txt');
    const allStops = parseCsv<Stop>(stopsCsv);

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    if (!query || query.length < 2) {
      return NextResponse.json({
        totalStops: allStops.length,
        query: 'empty',
      });
    }

    const normalizedQuery = normalizeStopName(query);

    const filtered = allStops
      .filter((stop) => {
        const normalizedName = normalizeStopName(
          stop.stop_name || ''
        );
        const stopId = (stop.stop_id || '').toLowerCase();
        const stopCode = (stop.stop_code || '').toLowerCase();

        return (
          normalizedName.includes(normalizedQuery) ||
          stopId.includes(query.toLowerCase()) ||
          stopCode.includes(query.toLowerCase())
        );
      })
      .slice(0, 20);

    return NextResponse.json(filtered);
  } catch (error) {
    console.error('Search API Error:', error);

    return NextResponse.json(
      {
        error: 'Internal error',
        message:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}