'use client';

import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { normalizeRealtime, type LineArrival, type StopRealtime } from '@/lib/types';

const transportIcon: Record<LineArrival['mode'], string> = {
  bus: '🚌',
  tram: '🚋',
  train: '🚆',
  metro: '🚇',
  other: '🚍',
};

type State = {
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  data: StopRealtime | null;
};

export function StopRealtimeBoard({ stopId }: { stopId: string }) {
  const [state, setState] = useState<State>({ loading: true, refreshing: false, error: null, data: null });

  useEffect(() => {
    let active = true;

    const load = async (refreshing = false) => {
      try {
        setState((prev) => ({ ...prev, loading: !prev.data && !refreshing, refreshing, error: null }));
        const response = await fetch(`/api/stop/${encodeURIComponent(stopId)}`);
        if (!response.ok) throw new Error('Impossible de charger le temps réel.');
        const raw = await response.json();
        if (!active) return;
        setState({ loading: false, refreshing: false, error: null, data: normalizeRealtime(raw, stopId) });
      } catch (error) {
        if (!active) return;
        setState((prev) => ({
          ...prev,
          loading: false,
          refreshing: false,
          error: error instanceof Error ? error.message : 'Erreur inconnue',
        }));
      }
    };

    void load();
    const interval = setInterval(() => {
      void load(true);
    }, 30000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [stopId]);

  const updatedAt = useMemo(() => {
    if (!state.data?.updatedAt) return null;
    return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(
      new Date(state.data.updatedAt),
    );
  }, [state.data?.updatedAt]);

  if (state.loading) return <section className="card">Chargement des prochains passages...</section>;
  if (state.error) return <section className="card error">{state.error}</section>;
  if (!state.data) return <section className="card error">Aucune donnée disponible.</section>;

  return (
    <section className="stack">
      <header className="card stack-sm">
        <p className="eyebrow">Arrêt</p>
        <h1>{state.data.stop.name}</h1>
        <p className="helper-text">ID: {state.data.stop.id}</p>
        <p className="refresh-indicator">
          {state.refreshing ? 'Mise à jour…' : `Dernière mise à jour : ${updatedAt ?? 'maintenant'}`}
        </p>
      </header>

      <div className="line-grid">
        {state.data.lines.length === 0 ? (
          <article className="card">Aucune ligne active pour cet arrêt.</article>
        ) : (
          state.data.lines.map((line) => (
            <article key={`${line.lineId}-${line.direction}`} className="card stack-sm">
              <div className="line-head">
                <span className="line-number">{line.lineName}</span>
                <span className="transport-icon" aria-label={line.mode}>
                  {transportIcon[line.mode]}
                </span>
              </div>
              <p className="line-direction">{line.direction}</p>
              <span className={clsx('status-pill', line.status)}>
                {line.status === 'on_time'
                  ? 'À l’heure'
                  : line.status === 'minor_delay'
                    ? 'Léger retard'
                    : 'Retard important'}
              </span>
              <div className="arrival-chips">
                {line.arrivals.length > 0
                  ? line.arrivals.map((minutes) => (
                      <span key={minutes} className="arrival-chip">
                        {minutes} min
                      </span>
                    ))
                  : 'Pas de passage imminent'}
              </div>
              {typeof line.passedMinutes === 'number' ? (
                <p className="helper-text">Passé il y a {line.passedMinutes} min</p>
              ) : null}
            </article>
          ))
        )}
      </div>
    </section>
  );
}
