// app/api/search/route.ts

import { NextResponse } from 'next/server';
import {
  downloadGtfs,
  readGtfsFile,
  parseCsv,
  normalizeStopName,
} from '@/lib/gtfs';

// Interface Stop
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

// Endpoint GET
export async function GET(request: Request): Promise<NextResponse> {
  try {
    // Télécharger GTFS si nécessaire
    await downloadGtfs();

    // Lire stops.txt
    const stopsCsv = await readGtfsFile('stops.txt');

    if (!stopsCsv) {
      return NextResponse.json(
        {
          error: 'stops.txt is empty',
          vercel: process.env.VERCEL === '1',
        },
        { status: 500 }
      );
    }

    // Parser CSV
    const allStops = parseCsv<Stop>(stopsCsv);

    // Récupération query
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    // Si query trop courte
    if (!query || query.length < 2) {
      return NextResponse.json({
        totalStops: allStops.length,
        query: 'empty',
      });
    }

    const normalizedQuery = normalizeStopName(query);

    // Filtrage
    const filtered = allStops
      .filter((stop) => {
        const normalizedName = normalizeStopName(stop.stop_name || '');
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
    console.error('API Error:', error);

    return NextResponse.json(
      {
        error: 'Internal error',
        message:
          error instanceof Error ? error.message : String(error),
        vercel: process.env.VERCEL === '1',
      },
      { status: 500 }
    );
  }
}