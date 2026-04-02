// lib/gtfs-rt.ts
import GtfsRealtimeBindings from 'gtfs-realtime-bindings';

const GTFS_RT_URL = 'https://www.itinisere.fr/ftp/GtfsRT/GtfsRT.CG38.pb';

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

let rtCache: RtCache | null = null;
const CACHE_DURATION = 30_000; // 30 secondes

export async function fetchGtfsRt(): Promise<FeedMessage | null> {
  const now = Date.now();
  
  if (rtCache && now - rtCache.timestamp < CACHE_DURATION) {
    console.log('Using cached GTFS-RT');
    return rtCache.data;
  }

  try {
    console.log('Fetching GTFS-RT from:', GTFS_RT_URL);
    const response = await fetch(GTFS_RT_URL, {
      headers: {
        'Accept': 'application/x-protobuf',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch GTFS-RT: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    console.log('GTFS-RT fetched, size:', buffer.byteLength, 'bytes');
    
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
      new Uint8Array(buffer)
    );
    
    const data = feed.toJSON() as FeedMessage;
    console.log('GTFS-RT entities count:', data.entity?.length || 0);
    
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

export async function getStopArrivals(stopId: string): Promise<Arrival[]> {
  console.log('Getting arrivals for stop ID:', stopId);
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
  
  // Essayer aussi sans les espaces (au cas où)
  const stopIdVariations = [stopId, stopId.trim()];
  
  rtData.entity.forEach((entity: FeedEntity, idx: number) => {
    if (entity.tripUpdate?.stopTimeUpdate) {
      entity.tripUpdate.stopTimeUpdate.forEach((update: StopTimeUpdate) => {
        // Debug: log le premier arrêt pour voir le format
        if (idx === 0) {
          console.log('Sample stopId in RT:', update.stopId);
        }
        
        // Match exact ou avec variations
        if (stopIdVariations.includes(update.stopId) && update.arrival) {
          console.log('Match found for stop:', stopId, 'trip:', entity.tripUpdate?.trip.tripId);
          arrivals.push({
            tripId: entity.tripUpdate!.trip.tripId,
            routeId: entity.tripUpdate!.trip.routeId,
            arrivalTime: update.arrival.time,
            delay: update.arrival.delay || 0,
            direction: entity.tripUpdate!.trip.directionId?.toString() || '',
          });
        }
      });
    }
  });

  console.log('Total arrivals found for stop', stopId, ':', arrivals.length);
  
  // Trier par heure d'arrivée
    return arrivals.sort((a, b) => a.arrivalTime - b.arrivalTime);
}
