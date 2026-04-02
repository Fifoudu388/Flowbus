// lib/gtfs.ts
import { promises as fs } from 'fs';
import path from 'path';

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

// Fonction vide pour compatibilité
export async function downloadGtfs(): Promise<void> {
  console.log('Using pre-downloaded GTFS data');
}

// NOUVEAU : Récupère tous les IDs d'un arrêt (parent + enfants)
export async function getStopIdsForSearch(stopId: string): Promise<string[]> {
  const stopsCsv = await readGtfsFile('stops.txt');
  const stops = parseCsv<{ stop_id: string; parent_station: string; location_type: string }>(stopsCsv);
  
  const ids = new Set<string>();
  ids.add(stopId);
  
  // Si c'est un parent (gare), récupérer les enfants
  const hasChildren = stops.some(s => s.parent_station === stopId);
  if (hasChildren) {
    stops.filter(s => s.parent_station === stopId).forEach(child => {
      ids.add(child.stop_id);
      console.log('Found child stop:', child.stop_id, 'for parent:', stopId);
    });
  }
  
  // Si c'est un enfant, récupérer aussi le parent et les autres enfants
  const stop = stops.find(s => s.stop_id === stopId);
  if (stop?.parent_station) {
    ids.add(stop.parent_station);
    stops.filter(s => s.parent_station === stop.parent_station).forEach(sibling => {
      ids.add(sibling.stop_id);
      console.log('Found sibling stop:', sibling.stop_id);
    });
  }
    return Array.from(ids);
}
