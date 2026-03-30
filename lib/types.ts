export type Stop = {
  id: string;
  name: string;
  city?: string;
};

export type LineArrival = {
  lineId: string;
  lineName: string;
  direction: string;
  mode: 'bus' | 'tram' | 'train' | 'metro' | 'other';
  status: 'on_time' | 'minor_delay' | 'major_delay';
  arrivals: number[];
  passedMinutes?: number;
};

export type StopRealtime = {
  stop: Stop;
  updatedAt: string;
  lines: LineArrival[];
};

type JsonObject = Record<string, unknown>;

function asObject(value: unknown): JsonObject {
  return typeof value === 'object' && value !== null ? (value as JsonObject) : {};
}

function readString(source: JsonObject, ...keys: string[]): string {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
  }
  return '';
}

function readNumber(source: JsonObject, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const parsed = Number(source[key]);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function readArray(source: JsonObject, ...keys: string[]): unknown[] {
  for (const key of keys) {
    const value = source[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

export function normalizeStop(raw: unknown): Stop | null {
  const stop = asObject(raw);
  const id = readString(stop, 'id', 'stop_id');
  const name = readString(stop, 'name', 'stop_name');
  if (!id || !name) return null;

  const city = readString(stop, 'city', 'municipality', 'zone') || undefined;
  return { id, name, city };
}

export function normalizeRealtime(raw: unknown, stopId: string): StopRealtime {
  const root = asObject(raw);
  const nestedStop = asObject(root.stop);

  const stop = normalizeStop(nestedStop) ??
    normalizeStop(root) ?? {
      id: stopId,
      name: readString(root, 'stop_name') || `Arrêt ${stopId}`,
    };

  const linesRaw = readArray(root, 'lines', 'departures');

  const lines: LineArrival[] = linesRaw
    .map((lineCandidate): LineArrival | null => {
      const item = asObject(lineCandidate);

      const arrivals = readArray(item, 'arrivals', 'next_passages')
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value >= 0)
        .sort((a, b) => a - b)
        .slice(0, 3);

      const delaySeconds = readNumber(item, 'delay_seconds', 'delay') ?? 0;
      const status: LineArrival['status'] =
        delaySeconds >= 300 ? 'major_delay' : delaySeconds >= 120 ? 'minor_delay' : 'on_time';

      const modeValue = readString(item, 'mode', 'type').toLowerCase() || 'bus';
      const mode: LineArrival['mode'] =
        modeValue.includes('tram')
          ? 'tram'
          : modeValue.includes('train')
            ? 'train'
            : modeValue.includes('metro')
              ? 'metro'
              : modeValue.includes('bus')
                ? 'bus'
                : 'other';

      const lineId = readString(item, 'line_id', 'route_id', 'id');
      const lineName = readString(item, 'line_name', 'route_short_name') || lineId;
      if (!lineId || !lineName) return null;

      const direction = readString(item, 'direction', 'headsign') || 'Direction inconnue';
      const passedMinutesRaw = readNumber(item, 'passed_minutes', 'last_passed_minutes');
      const passedMinutes =
        typeof passedMinutesRaw === 'number' && passedMinutesRaw >= 0 ? passedMinutesRaw : undefined;

      return {
        lineId,
        lineName,
        direction,
        mode,
        status,
        arrivals,
        passedMinutes,
      };
    })
    .filter((line): line is LineArrival => line !== null);

  const updatedAt = readString(root, 'updated_at') || new Date().toISOString();
  return {
    stop,
    updatedAt,
    lines,
  };
}
