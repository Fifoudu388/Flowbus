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
) {
  const { id: stopId } = await params;

  // Récupère les arrivées temps réel
  const arrivals = await getStopArrivals(stopId);

  // Enrichit avec les infos routes/trips (noms de lignes, destinations)
  const tripsCsv = await readGtfsFile('trips.txt');
  const routesCsv = await readGtfsFile('routes.txt');
  const trips = parseCsv<Trip>(tripsCsv);
  const routes = parseCsv<Route>(routesCsv);

  const enrichedArrivals = arrivals.map(arrival => {
    const trip = trips.find(t => t.trip_id === arrival.tripId);
    const route = routes.find(r => r.route_id === (trip?.route_id || arrival.routeId));

    return {
      ...arrival,
      destination: trip?.trip_headsign || 'Destination inconnue',
      line: route?.route_short_name || '??',
      lineColor: route?.route_color,
      lineName: route?.route_long_name,
      // Temps formaté
      scheduledTime: new Date(arrival.arrivalTime * 1000).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      delayMinutes: Math.round(arrival.delay / 60),
    };
  });

  return NextResponse.json({
    stopId,
    arrivals: enrichedArrivals,
    updatedAt: new Date().toISOString(),
  });
}
