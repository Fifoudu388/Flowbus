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

export function normalizeStop(raw: any): Stop | null {
  const id = String(raw?.id ?? raw?.stop_id ?? '').trim();
  const name = String(raw?.name ?? raw?.stop_name ?? '').trim();
  if (!id || !name) return null;

  return {
    id,
    name,
    city: raw?.city ?? raw?.municipality ?? raw?.zone ?? undefined,
  };
}

export function normalizeRealtime(raw: any, stopId: string): StopRealtime {
  const stop = normalizeStop(raw?.stop ?? raw) ?? {
    id: stopId,
    name: raw?.stop_name ?? `Arrêt ${stopId}`,
  };

  const linesRaw = Array.isArray(raw?.lines) ? raw.lines : Array.isArray(raw?.departures) ? raw.departures : [];

  const lines: LineArrival[] = linesRaw
    .map((item: any) => {
      const arrivalsRaw = Array.isArray(item?.arrivals)
        ? item.arrivals
        : Array.isArray(item?.next_passages)
          ? item.next_passages
          : [];

      const arrivals = arrivalsRaw
        .map((value: unknown) => Number(value))
        .filter((value: number) => Number.isFinite(value) && value >= 0)
        .sort((a: number, b: number) => a - b)
        .slice(0, 3);

      const delaySeconds = Number(item?.delay_seconds ?? item?.delay ?? 0);
      const status: LineArrival['status'] =
        delaySeconds >= 300 ? 'major_delay' : delaySeconds >= 120 ? 'minor_delay' : 'on_time';

      const modeValue = String(item?.mode ?? item?.type ?? 'bus').toLowerCase();
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

      const lineId = String(item?.line_id ?? item?.route_id ?? item?.id ?? '').trim();
      const lineName = String(item?.line_name ?? item?.route_short_name ?? lineId).trim();
      if (!lineId || !lineName) return null;

      const direction = String(item?.direction ?? item?.headsign ?? 'Direction inconnue');
      const passedMinutesRaw = Number(item?.passed_minutes ?? item?.last_passed_minutes);
      const passedMinutes = Number.isFinite(passedMinutesRaw) && passedMinutesRaw >= 0 ? passedMinutesRaw : undefined;

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
    .filter((line: LineArrival | null): line is LineArrival => line !== null);

  return {
    stop,
    updatedAt: raw?.updated_at ?? new Date().toISOString(),
    lines,
  };
}
