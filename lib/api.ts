const API_BASE = process.env.FLOWBUS_API_BASE ?? process.env.NEXT_PUBLIC_FLOWBUS_API_BASE;

function requireApiBase() {
  if (!API_BASE) {
    throw new Error('Variable FLOWBUS_API_BASE manquante.');
  }
  return API_BASE.replace(/\/$/, '');
}

export async function fetchStops(query: string) {
  const apiBase = requireApiBase();
  const response = await fetch(`${apiBase}/stops?query=${encodeURIComponent(query)}`, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 15 },
  });

  if (!response.ok) {
    throw new Error('Erreur API sur la recherche d’arrêts.');
  }

  return response.json();
}

export async function fetchStopRealtime(stopId: string) {
  const apiBase = requireApiBase();
  const response = await fetch(`${apiBase}/stops/${encodeURIComponent(stopId)}/arrivals`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Erreur API sur le temps réel.');
  }

  return response.json();
}
