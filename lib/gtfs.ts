// lib/gtfs.ts
import { promises as fs } from 'fs';
import path from 'path';
import extract from 'extract-zip';

const GTFS_URL = 'https://gtfs.bus-tracker.fr/aura-38.zip';
const GTFS_DIR = path.join(process.cwd(), 'data', 'gtfs');

export async function downloadGtfs() {
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

// Parse CSV simple
export function parseCsv<T>(csv: string, delimiter = ','): T[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    const values = line.split(delimiter);
    const obj: Record<string, string> = {};
    headers.forEach((header, i) => {
      obj[header] = values[i]?.replace(/^"|"$/g, '') || '';
    });
    return obj as T;
  });
}
