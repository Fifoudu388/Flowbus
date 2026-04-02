// lib/gtfs.ts
import { promises as fs } from 'fs';
import path from 'path';

// Chemin vers les données (téléchargées au build)
const DATA_DIR = path.join(process.cwd(), 'data', 'gtfs');

export async function readGtfsFile(filename: string): Promise<string> {
  const filePath = path.join(DATA_DIR, filename);
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    console.error('Error reading', filename, ':', error);
    return '';
  }
}

export function parseCsv<T>(csv: string): T[] {
  if (!csv.trim()) return [];
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = parseLine(lines[0]);
  return lines.slice(1).map(line => {
    const values = parseLine(line);
    const obj: Record<string, string> = {};
    headers.forEach((header, i) => {
      obj[header.trim()] = values[i]?.trim().replace(/^"|"$/g, '') || '';
    });
    return obj as T;
  });
}

function parseLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let insideQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

export function normalizeStopName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
    .replace(/['']/g, '')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Fonction vide pour compatibilité (plus besoin de télécharger)
export async function downloadGtfs(): Promise<void> {
  // Les données sont déjà là depuis le build
  console.log('Using pre-downloaded GTFS data');
}
