// app/api/stop/[id]/route.ts
import { NextResponse } from 'next/server';
import { getStopArrivals } from '@/lib/gtfs-rt';
import { readGtfsFile, parseCsv } from '@/lib/gtfs';

interface Trip {
  trip_id: string;
  trip_headsign: string;
  route_id: string;
}

interface Route {
  route_id: string;
  route_short_name: string;
  route_long_name: string;
  route_color?: string;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id: stopId } = await params;
    console.log('API called for stop ID:', stopId);

    // Récupérer les arrivées temps réel
    const arrivals = await getStopArrivals(stopId);
    
    if (arrivals.length === 0) {
      console.log('No real-time arrivals found for stop:', stopId);
      return NextResponse.json({
        stopId,
        arrivals: [],
        message: 'Aucun bus en approche pour cet arrêt actuellement',
        updatedAt: new Date().toISOString(),
      });
    }

    // Lire les infos statiques pour enrichir
    console.log('Reading static GTFS files...');
    const tripsCsv = await readGtfsFile('trips.txt');
    const routesCsv = await readGtfsFile('routes.txt');
    
    const trips = parseCsv<Trip>(tripsCsv);
    const routes = parseCsv<Route>(routesCsv);
    
    console.log('Found', trips.length, 'trips and', routes.length, 'routes in static data');

    const enrichedArrivals = arrivals.map((arrival) => {
      const trip = trips.find((t) => t.trip_id === arrival.tripId);
      const route = routes.find((r) => r.route_id === (trip?.route_id || arrival.routeId));
      
      return {
        ...arrival,
        destination: trip?.trip_headsign || 'Destination inconnue',
        line: route?.route_short_name || '??',
        lineColor: route?.route_color || '000000',
        lineName: route?.route_long_name || 'Ligne inconnue',
        scheduledTime: new Date(arrival.arrivalTime * 1000).toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        delayMinutes: Math.round(arrival.delay / 60),
        isDelayed: arrival.delay > 60,
      };
    });

    return NextResponse.json({
      stopId,
      arrivals: enrichedArrivals,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      {
        error: 'Internal error',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
