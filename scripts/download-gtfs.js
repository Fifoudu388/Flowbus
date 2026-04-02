// scripts/download-gtfs.js
const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const GTFS_URL = 'https://gtfs.bus-tracker.fr/aura-38.zip';
const DATA_DIR = path.join(__dirname, '..', 'data', 'gtfs');

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Status: ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('Creating data directory...');
  fs.mkdirSync(DATA_DIR, { recursive: true });
  
  const zipPath = path.join(__dirname, '..', 'data', 'gtfs.zip');
  
  console.log('Downloading GTFS...');
  await downloadFile(GTFS_URL, zipPath);
  console.log('Downloaded to', zipPath);
  
  console.log('Extracting...');
  // Utilise unzip système ou un package npm
  try {
    execSync(`unzip -o "${zipPath}" -d "${DATA_DIR}"`, { stdio: 'inherit' });
  } catch {
    // Fallback avec PowerShell si sur Windows
    execSync(`powershell -command "Expand-Archive -Path '${zipPath}' -DestinationPath '${DATA_DIR}' -Force"`, { stdio: 'inherit' });
  }
  
  fs.unlinkSync(zipPath);
  console.log('GTFS ready at', DATA_DIR);
  console.log('Files:', fs.readdirSync(DATA_DIR));
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
