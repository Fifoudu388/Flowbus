// lib/gtfs.ts

import { promises as fs } from 'fs';
import path from 'path';
import extract from 'extract-zip';

const GTFS_URL = 'https://gtfs.bus-tracker.fr/aura-38.zip';

// Sur Vercel, seul /tmp est writable
const IS_VERCEL = process.env.VERCEL === '1';
const BASE_DIR = IS_VERCEL ? '/tmp' : process.cwd();
const GTFS_DIR = path.join(BASE_DIR, 'data', 'gtfs');

export async function downloadGtfs(): Promise<void> {
  try {
    console.log('Fetching GTFS from:', GTFS_URL);

    const response = await fetch(GTFS_URL);
    if (!response.ok) {
      throw new Error(`Failed to download GTFS: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    console.log('Downloaded', buffer.byteLength, 'bytes');

    const zipPath = path.join(BASE_DIR, 'gtfs.zip');

    // S'assurer que le répertoire existe
    await fs.mkdir(GTFS_DIR, { recursive: true });

    // Sauvegarde du zip
    await fs.writeFile(zipPath, Buffer.from(buffer));
    console.log('Saved to', zipPath);

    // Extraction
    console.log('Extracting to', GTFS_DIR);
    await extract(zipPath, { dir: GTFS_DIR });
    console.log('Extracted successfully');

    // Nettoyage
    await fs.unlink(zipPath);

    console.log('GTFS ready in', GTFS_DIR);
  } catch (error) {
    console.error('Error in downloadGtfs:', error);
    throw error;
  }
}

export async function readGtfsFile(filename: string): Promise<string> {
  const filePath = path.join(GTFS_DIR, filename);

  try {
    console.log('Reading file:', filePath);

    const content = await fs.readFile(filePath, 'utf-8');
    console.log('Read', content.length, 'chars from', filename);

    return content;
  } catch (error) {
    console.error('Error reading', filename, ':', error);
    return '';
  }
}

// Parser CSV robuste
export function parseCsv<T>(csv: string): T[] {
  if (!csv.trim()) {
    console.log('Empty CSV provided');
    return [];
  }

  console.log('Parsing CSV, length:', csv.length);

  const lines: string[] = [];
  let currentLine = '';
  let insideQuotes = false;

  // Découpage des lignes en respectant les guillemets
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

  if (currentLine) {
    lines.push(currentLine);
  }

  console.log('Found', lines.length, 'lines');

  if (lines.length < 2) {
    console.log('Not enough lines for CSV');
    return [];
  }

  const headers = parseLine(lines[0]);
  console.log('Headers:', headers);

  const result: T[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);

    if (values.length === 0) continue;

    const obj: Record<string, string> = {};

    headers.forEach((header, index) => {
      const value = values[index] || '';

      obj[header.trim()] = value
        .trim()
        .replace(/^"|"$/g, '')
        .replace(/""/g, '"');
    });

    result.push(obj as T);
  }

  console.log('Parsed', result.length, 'rows');

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
    .replace(/[\u0300-\u036f]/g, '') // enlève accents
    .replace(/['']/g, '')           // enlève apostrophes
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}