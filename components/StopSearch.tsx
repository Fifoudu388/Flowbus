'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { normalizeStop, type Stop } from '@/lib/types';

type SearchState = {
  loading: boolean;
  error: string | null;
  stops: Stop[];
};

export function StopSearch() {
  const [query, setQuery] = useState('');
  const [state, setState] = useState<SearchState>({ loading: false, error: null, stops: [] });

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setState({ loading: false, error: null, stops: [] });
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        const response = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal });

        if (!response.ok) {
          throw new Error('Impossible de récupérer les arrêts.');
        }

        const data = await response.json();
        const rawStops = Array.isArray(data) ? data : (data.stops ?? []);
        setState({
          loading: false,
          error: null,
          stops: rawStops.map(normalizeStop).filter((stop: Stop | null): stop is Stop => stop !== null),
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : 'Une erreur est survenue.';
        setState({ loading: false, error: message, stops: [] });
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  const helperText = useMemo(() => {
    if (query.trim().length < 2) return 'Saisissez au moins 2 caractères.';
    if (state.loading) return 'Recherche en cours...';
    if (state.error) return state.error;
    if (state.stops.length === 0) return 'Aucun arrêt trouvé.';
    return `${state.stops.length} arrêt(s) trouvé(s).`;
  }, [query, state]);

  return (
    <section className="card stack">
      <h1>Trouver un arrêt</h1>
      <input
        type="search"
        placeholder="Ex: République"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="search-input"
        aria-label="Rechercher un arrêt"
      />
      <p className="helper-text">{helperText}</p>
      <ul className="stop-list">
        {state.stops.map((stop) => (
          <li key={stop.id}>
            <Link className="stop-item" href={`/stop/${stop.id}`}>
              <strong>{stop.name}</strong>
              {stop.city ? <span>{stop.city}</span> : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
