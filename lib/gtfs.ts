// lib/gtfs.ts
import { promises as fs } from 'fs';
import path from 'path';
import extract from 'extract-zip';

const GTFS_URL = 'https://gtfs.bus-tracker.fr/aura-38.zip';
const GTFS_DIR = path.join(process.cwd(), 'data', 'gtfs');

export async function downloadGtfs(): Promise<void> {
  try {
    const response = await fetch(GTFS_URL);
    if (!response.ok) throw new Error('Failed to download GTFS');

    const buffer = await response.arrayBuffer();
    const zipPath = path.join(process.cwd(), 'data', 'gtfs.zip');

    await fs.mkdir(path.dirname(zipPath), { recursive: true });
    await fs.writeFile(zipPath, Buffer.from(buffer));

    await fs.mkdir(GTFS_DIR, { recursive: true });
    await extract(zipPath, { dir: GTFS_DIR });

    await fs.unlink(zipPath);
    console.log('GTFS downloaded and extracted');
  } catch (error) {
    console.error('Error downloading GTFS:', error);
  }
}

export async function readGtfsFile(filename: string): Promise<string> {
  const filePath = path.join(GTFS_DIR, filename);
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return '';
  }
}

// Parser CSV robuste qui gère les guillemets et les virgules dans les champs
export function parseCsv<T>(csv: string): T[] {
  if (!csv.trim()) return [];

  const lines: string[] = [];
  let currentLine = '';
  let insideQuotes = false;

  for (const char of csv) {
    if (char === '"') {
      insideQuotes = !insideQuotes;
      currentLine += char;
    } else if (char === '\n' && !insideQuotes) {
      lines.push(currentLine);
      currentLine = '';
    } else {
      currentLine += char;
    }
  }
  if (currentLine) lines.push(currentLine);

  if (lines.length < 2) return [];

  const headers = parseLine(lines[0]);
  const result: T[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    if (values.length === 0) continue;

    const obj: Record<string, string> = {};
    headers.forEach((header, index) => {
      const value = values[index] || '';
      obj[header.trim()] = value.trim().replace(/^"|"$/g, '').replace(/""/g, '"');
    });
    result.push(obj as T);
  }

  return result;
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

// Normalise les noms pour la recherche (enlève accents, apostrophes, etc.)
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
