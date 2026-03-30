# FlowBus

Application Next.js moderne pour consulter les prochains passages de transports en commun en temps réel.

## Démarrage

```bash
npm install
npm run dev
```

## Variables d'environnement

Créez un fichier `.env.local` :

```bash
FLOWBUS_API_BASE=https://votre-api-transports.example.com
```

L'application interroge :

- `GET {FLOWBUS_API_BASE}/stops?query=<texte>`
- `GET {FLOWBUS_API_BASE}/stops/{id}/arrivals`

## Parcours utilisateur

- `/` : accueil avec actions rapides
- `/search` : recherche d'arrêt avec autocomplétion
- `/scan` : scan QR code fonctionnel via caméra
- `/stop/[id]` : affichage des lignes, directions, prochains passages, retards

## Déploiement Vercel

Le projet est compatible Vercel sans configuration supplémentaire.
