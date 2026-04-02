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
  stopId: string; // ID réel matché
}

// Cache
let rtCache: RtCache | null = null;
const CACHE_DURATION = 30_000;

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

// Récupérer les arrivées
export async function getStopArrivals(
  searchStopId: string
): Promise<Arrival[]> {
  console.log('Getting arrivals for stop ID:', searchStopId);

  const rtData = await fetchGtfsRt();

  if (!rtData) {
    console.log('No GTFS-RT data available');
    return [];
  }

  if (!rtData.entity || rtData.entity.length === 0) {
    console.log('GTFS-RT has no entities');
    return [];
  }

  // Variations d’ID
  const searchVariations: string[] = [searchStopId.trim()];

  if (/\d$/.test(searchStopId)) {
    searchVariations.push(searchStopId.slice(0, -1));
  }

  if (/\d{2}$/.test(searchStopId)) {
    searchVariations.push(searchStopId.slice(0, -2));
  }

  console.log('Searching with variations:', searchVariations);

  const arrivals: Arrival[] = [];
  const matchedStopIds = new Set<string>();

  rtData.entity.forEach((entity: FeedEntity) => {
    if (!entity.tripUpdate?.stopTimeUpdate) return;

    entity.tripUpdate.stopTimeUpdate.forEach(
      (update: StopTimeUpdate) => {
        const rtStopId = update.stopId.trim();

        const isMatch = searchVariations.some(
          (variation) =>
            rtStopId === variation ||
            rtStopId.startsWith(variation) ||
            variation.startsWith(rtStopId)
        );

        if (isMatch && update.arrival) {
          console.log(
            '✓ Match:',
            searchStopId,
            '→ RT ID:',
            rtStopId
          );

          matchedStopIds.add(rtStopId);

          arrivals.push({
            tripId: entity.tripUpdate!.trip.tripId,
            routeId: entity.tripUpdate!.trip.routeId,
            arrivalTime: update.arrival.time,
            delay: update.arrival.delay || 0,
            direction:
              entity.tripUpdate!.trip.directionId?.toString() ||
              '',
            stopId: rtStopId,
          });
        }
      }
    );
  });

  console.log(
    `Found ${arrivals.length} arrivals for stop ${searchStopId} (matched RT IDs: ${Array.from(
      matchedStopIds
    ).join(', ')})`
  );

  return arrivals.sort(
    (a, b) => a.arrivalTime - b.arrivalTime
  );
}