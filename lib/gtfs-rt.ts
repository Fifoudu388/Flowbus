// lib/gtfs-rt.ts

import GtfsRealtimeBindings from 'gtfs-realtime-bindings';

const GTFS_RT_URL =
  'https://www.itinisere.fr/ftp/GtfsRT/GtfsRT.CG38.pb';

// Interfaces
interface StopTimeUpdate {
  stopId: string;
  arrival?: {
    time: number;
    delay?: number;
  };
}

interface TripUpdate {
  trip: {
    tripId: string;
    routeId: string;
    directionId?: number;
  };
  stopTimeUpdate: StopTimeUpdate[];
}

interface FeedEntity {
  tripUpdate?: TripUpdate;
}

interface FeedMessage {
  entity?: FeedEntity[];
}

interface RtCache {
  data: FeedMessage;
  timestamp: number;
}

export interface Arrival {
  tripId: string;
  routeId: string;
  arrivalTime: number;
  delay: number;
  direction: string;
}

// Cache
let rtCache: RtCache | null = null;
const CACHE_DURATION = 30_000;

// Debug flag
let sampleStopIdsLogged = false;

// Fetch GTFS-RT
export async function fetchGtfsRt(): Promise<FeedMessage | null> {
  const now = Date.now();

  if (rtCache && now - rtCache.timestamp < CACHE_DURATION) {
    console.log('Using cached GTFS-RT');
    return rtCache.data;
  }

  try {
    console.log('Fetching GTFS-RT from:', GTFS_RT_URL);

    const response = await fetch(GTFS_RT_URL);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch GTFS-RT: ${response.status}`
      );
    }

    const buffer = await response.arrayBuffer();

    console.log(
      'GTFS-RT fetched, size:',
      buffer.byteLength,
      'bytes'
    );

    if (buffer.byteLength === 0) {
      console.log('GTFS-RT is empty');
      return rtCache?.data || null;
    }

    const feed =
      GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
        new Uint8Array(buffer)
      );

    const data = feed.toJSON() as FeedMessage;

    console.log(
      'GTFS-RT entities count:',
      data.entity?.length || 0
    );

    rtCache = {
      data,
      timestamp: now,
    };

    return data;
  } catch (error) {
    console.error('Error fetching GTFS-RT:', error);
    return rtCache?.data || null;
  }
}

// Récupérer les arrivées pour un arrêt
export async function getStopArrivals(
  stopId: string
): Promise<Arrival[]> {
  console.log(
    'Getting arrivals for stop ID:',
    stopId,
    '(length:',
    stopId.length,
    ')'
  );

  const rtData = await fetchGtfsRt();

  if (!rtData) {
    console.log('No GTFS-RT data available');
    return [];
  }

  if (!rtData.entity || rtData.entity.length === 0) {
    console.log('GTFS-RT has no entities');
    return [];
  }

  const arrivals: Arrival[] = [];

  // Debug: tous les stopIds
  const allStopIdsInRt = new Set<string>();

  rtData.entity.forEach((entity: FeedEntity, idx: number) => {
    if (!entity.tripUpdate?.stopTimeUpdate) return;

    entity.tripUpdate.stopTimeUpdate.forEach(
      (update: StopTimeUpdate) => {
        // Stockage debug
        allStopIdsInRt.add(update.stopId);

        // Logs exemple
        if (!sampleStopIdsLogged && idx < 5) {
          console.log(
            'Sample RT stopId:',
            update.stopId,
            '| Looking for:',
            stopId,
            '| Match?',
            update.stopId === stopId
          );
        }

        // Normalisation
        const stopIdTrimmed = stopId.trim();
        const updateStopIdTrimmed = update.stopId.trim();

        // Match
        if (
          stopIdTrimmed === updateStopIdTrimmed &&
          update.arrival
        ) {
          console.log(
            '✓ Match found! Stop:',
            stopId,
            'Trip:',
            entity.tripUpdate!.trip.tripId,
            'Time:',
            new Date(
              update.arrival.time * 1000
            ).toLocaleTimeString('fr-FR')
          );

          arrivals.push({
            tripId: entity.tripUpdate!.trip.tripId,
            routeId: entity.tripUpdate!.trip.routeId,
            arrivalTime: update.arrival.time,
            delay: update.arrival.delay || 0,
            direction:
              entity.tripUpdate!.trip.directionId?.toString() ||
              '',
          });
        }
      }
    );
  });

  sampleStopIdsLogged = true;

  console.log(
    'Unique stop IDs in RT (sample):',
    Array.from(allStopIdsInRt).slice(0, 10)
  );

  console.log(
    `Found ${arrivals.length} arrivals for stop ${stopId} out of ${rtData.entity.length} entities`
  );

  return arrivals.sort(
    (a, b) => a.arrivalTime - b.arrivalTime
  );
}