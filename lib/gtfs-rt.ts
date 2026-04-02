// lib/gtfs-rt.ts

import GtfsRealtimeBindings from 'gtfs-realtime-bindings';

const GTFS_RT_URL = 'https://www.itinisere.fr/ftp/GtfsRT/GtfsRT.CG38.pb';

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

// Récupération GTFS-RT
export async function fetchGtfsRt(): Promise<FeedMessage | null> {
  const now = Date.now();

  // Utilisation du cache
  if (rtCache && now - rtCache.timestamp < CACHE_DURATION) {
    return rtCache.data;
  }

  try {
    const response = await fetch(GTFS_RT_URL, {
      headers: {
        Accept: 'application/x-protobuf',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch GTFS-RT');
    }

    const buffer = await response.arrayBuffer();

    const feed =
      GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
        new Uint8Array(buffer)
      );

    const data = feed.toJSON() as FeedMessage;

    // Mise en cache
    rtCache = {
      data,
      timestamp: now,
    };

    return data;
  } catch (error) {
    console.error('Error fetching GTFS-RT:', error);

    // Fallback sur cache si dispo
    return rtCache?.data || null;
  }
}

// Récupérer les arrivées pour un arrêt
export async function getStopArrivals(stopId: string): Promise<Arrival[]> {
  const rtData = await fetchGtfsRt();

  if (!rtData) return [];

  const arrivals: Arrival[] = [];

  rtData.entity?.forEach((entity: FeedEntity) => {
    if (!entity.tripUpdate?.stopTimeUpdate) return;

    entity.tripUpdate.stopTimeUpdate.forEach(
      (update: StopTimeUpdate) => {
        if (update.stopId === stopId && update.arrival) {
          arrivals.push({
            tripId: entity.tripUpdate!.trip.tripId,
            routeId: entity.tripUpdate!.trip.routeId,
            arrivalTime: update.arrival.time,
            delay: update.arrival.delay || 0,
            direction:
              entity.tripUpdate!.trip.directionId?.toString() || '',
          });
        }
      }
    );
  });

  // Tri par heure d’arrivée
  return arrivals.sort((a, b) => a.arrivalTime - b.arrivalTime);
}