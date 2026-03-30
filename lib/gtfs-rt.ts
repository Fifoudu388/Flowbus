// lib/gtfs-rt.ts
import GtfsRealtimeBindings from 'gtfs-realtime-bindings';

const GTFS_RT_URL = 'https://www.itinisere.fr/ftp/GtfsRT/GtfsRT.CG38.pb';

// Cache simple en mémoire
let rtCache: {
  data: any;
  timestamp: number;
} | null = null;

const CACHE_DURATION = 30_000; // 30 secondes

export async function fetchGtfsRt() {
  const now = Date.now();
  
  // Retourne le cache si frais
  if (rtCache && now - rtCache.timestamp < CACHE_DURATION) {
    return rtCache.data;
  }
  
  try {
    const response = await fetch(GTFS_RT_URL, {
      headers: {
        'Accept': 'application/x-protobuf',
      },
    });
    
    if (!response.ok) throw new Error('Failed to fetch GTFS-RT');
    
    const buffer = await response.arrayBuffer();
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
      new Uint8Array(buffer)
    );
    
    const data = feed.toJSON();
    
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

// Récupère les prochains passages pour un arrêt spécifique
export async function getStopArrivals(stopId: string) {
  const rtData = await fetchGtfsRt();
  if (!rtData) return [];
  
  const arrivals: Array<{
    tripId: string;
    routeId: string;
    arrivalTime: number;
    delay: number;
    direction: string;
  }> = [];
  rtData.entity?.forEach((entity: any) => {
    if (entity.tripUpdate?.stopTimeUpdate) {
      entity.tripUpdate.stopTimeUpdate.forEach((update: any) => {
        if (update.stopId === stopId && update.arrival) {
          arrivals.push({
            tripId: entity.tripUpdate.trip.tripId,
            routeId: entity.tripUpdate.trip.routeId,
            arrivalTime: update.arrival.time,
            delay: update.arrival.delay || 0,
            direction: entity.tripUpdate.trip.directionId?.toString() || '',
          });
        }
      });
    }
  });
  
  // Trie par heure d'arrivée
  return arrivals.sort((a, b) => a.arrivalTime - b.arrivalTime);
}
