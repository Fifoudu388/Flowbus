// lib/gtfs-rt.ts

import GtfsRealtimeBindings from 'gtfs-realtime-bindings';

const GTFS_RT_URL =
  'https://www.itinisere.fr/ftp/GtfsRT/GtfsRT.CG38.pb';

// Types pour protobuf GTFS-RT

interface TripInfo {
  tripId?: string;
  trip_id?: string;
  routeId?: string;
  route_id?: string;
  directionId?: number;
  direction_id?: number;
}

interface StopTimeUpdate {
  stopId?: string;
  stop_id?: string;
  arrival?: {
    time?: number;
    delay?: number;
  };
  departure?: {
    time?: number;
    delay?: number;
  };
}

interface TripUpdate {
  trip?: TripInfo;
  stopTimeUpdate?: StopTimeUpdate[];
}

interface FeedEntity {
  tripUpdate?: TripUpdate;
}

interface FeedMessage {
  header?: unknown;
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
  stopId: string;
}

let rtCache: RtCache | null = null;
const CACHE_DURATION = 30_000;

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
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const feed =
      GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
        new Uint8Array(buffer)
      ) as FeedMessage;

    console.log('========================================');
    console.log(
      'FEED DECODED - Header:',
      JSON.stringify(feed.header, null, 2)
    );
    console.log(
      'Number of entities:',
      feed.entity?.length || 0
    );

    // DEBUG: Afficher la STRUCTURE EXACTE de la première entité
    if (feed.entity && feed.entity.length > 0) {
      console.log('========================================');
      console.log('SAMPLE ENTITY STRUCTURE:');

      const sample = feed.entity[0];

      console.log('Entity keys:', Object.keys(sample));

      if (sample.tripUpdate) {
        console.log(
          'tripUpdate keys:',
          Object.keys(sample.tripUpdate)
        );
        console.log(
          'trip keys:',
          Object.keys(sample.tripUpdate.trip || {})
        );
        console.log(
          'trip:',
          JSON.stringify(sample.tripUpdate.trip, null, 2)
        );

        if (
          sample.tripUpdate.stopTimeUpdate &&
          sample.tripUpdate.stopTimeUpdate.length > 0
        ) {
          console.log(
            'First stopTimeUpdate keys:',
            Object.keys(
              sample.tripUpdate.stopTimeUpdate[0]
            )
          );
          console.log(
            'First stopTimeUpdate:',
            JSON.stringify(
              sample.tripUpdate.stopTimeUpdate[0],
              null,
              2
            )
          );
        }
      }

      console.log('========================================');
    }

    rtCache = { data: feed, timestamp: now };

    return feed;
  } catch (error) {
    console.error('Error fetching GTFS-RT:', error);
    return rtCache?.data || null;
  }
}

export async function getStopArrivals(
  stopIds: string[]
): Promise<Arrival[]> {
  const searchIds = stopIds.map((id) => id.trim());

  console.log('Searching for stop IDs:', searchIds);

  const feed = await fetchGtfsRt();

  if (!feed) {
    console.log('No feed data');
    return [];
  }

  if (!feed.entity || feed.entity.length === 0) {
    console.log('No entities in feed');
    return [];
  }

  const arrivals: Arrival[] = [];
  let checkedCount = 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  feed.entity.forEach((entity: FeedEntity, idx: number) => {
    if (entity.tripUpdate && entity.tripUpdate.stopTimeUpdate) {
      entity.tripUpdate.stopTimeUpdate.forEach(
        (update: StopTimeUpdate) => {
          checkedCount++;

          const updateStopId =
            update.stopId || update.stop_id;

          if (idx === 0) {
            console.log(
              'Checking update structure:',
              JSON.stringify(update, null, 2)
            );
          }

          if (
            searchIds.includes(updateStopId || '') &&
            (update.arrival || update.departure)
          ) {
            const arrivalTime =
              update.arrival?.time ||
              update.departure?.time ||
              0;

            const delay =
              update.arrival?.delay ||
              update.departure?.delay ||
              0;

            const trip = entity.tripUpdate?.trip;

            console.log('✓✓✓ MATCH FOUND!');
            console.log(' Stop ID:', updateStopId);
            console.log(' Trip:', trip);
            console.log(' Arrival time:', arrivalTime);

            arrivals.push({
              tripId:
                trip?.tripId || trip?.trip_id || '',
              routeId:
                trip?.routeId || trip?.route_id || '',
              arrivalTime: arrivalTime,
              delay: delay,
              direction: String(
                trip?.directionId ||
                  trip?.direction_id ||
                  ''
              ),
              stopId: updateStopId || '',
            });
          }
        }
      );
    }
  });

  console.log(
    `Checked ${checkedCount} stop updates, found ${arrivals.length} matches`
  );

  return arrivals.sort(
    (a, b) => a.arrivalTime - b.arrivalTime
  );
}