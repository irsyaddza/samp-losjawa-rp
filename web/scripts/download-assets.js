const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

// Configuration
const SKINS_DIR = path.join(__dirname, '..', 'public', 'skins');
const VEHICLES_DIR = path.join(__dirname, '..', 'public', 'vehicles');

const VEHICLE_FILENAMES = {
  400: 'Landstalker.png',
  411: 'Infernus.png',
  415: 'Cheetah.png',
  451: 'Turismo.png',
  480: 'Comet.png',
  541: 'Bullet.png',
  560: 'Sultan.png',
  562: 'Elegy.png',
  559: 'Jester.png',
  561: 'Stratum.png',
  565: 'Flash.png',
  422: 'Bobcat.png',
  475: 'Sabre.png',
  506: 'Super_GT.png',
  522: 'NRG-500.png',
  521: 'FCR-900.png',
  461: 'PCJ-600.png',
  463: 'Freeway.png',
  468: 'Sanchez.png',
  471: 'Quad.png',
  596: 'Police_LS.png',
  597: 'Police_SF.png',
  598: 'Police_LV.png',
  599: 'Police_Ranger.png',
  427: 'Enforcer.png',
  490: 'FBI_Rancher.png',
  528: 'FBI_Truck.png',
  407: 'Fire_Truck.png',
  416: 'Ambulance.png',
  433: 'Barracks.png',
  432: 'Rhino.png',
  426: 'Premier.png',
  545: 'Hustler.png',
};

// Ensure directories exist
if (!fs.existsSync(SKINS_DIR)) {
  fs.mkdirSync(SKINS_DIR, { recursive: true });
}
if (!fs.existsSync(VEHICLES_DIR)) {
  fs.mkdirSync(VEHICLES_DIR, { recursive: true });
}

function calculateMD5Path(filename) {
  const hash = crypto.createHash('md5').update(filename).digest('hex');
  const first = hash[0];
  const firstTwo = hash.slice(0, 2);
  return `${first}/${firstTwo}/${filename}`;
}

function downloadFile(url, destPath) {
  return new Promise((resolve) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        file.close();
        fs.unlink(destPath, () => {}); // Delete empty file
        resolve(false);
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(true);
      });
    }).on('error', () => {
      file.close();
      fs.unlink(destPath, () => {});
      resolve(false);
    });
  });
}

async function downloadAll() {
  console.log('Downloading character skins (0-311)...');
  let skinCount = 0;
  for (let id = 0; id <= 311; id++) {
    const filename = `Skin_${id}.png`;
    const subpath = calculateMD5Path(filename);
    const url = `https://wiki.multitheftauto.com/images/${subpath}`;
    const dest = path.join(SKINS_DIR, `${id}.png`);
    
    // Download only if not exists
    if (!fs.existsSync(dest)) {
      const ok = await downloadFile(url, dest);
      if (ok) {
        skinCount++;
        if (skinCount % 20 === 0) {
          console.log(`  Downloaded ${skinCount} skins...`);
        }
      }
    }
  }
  console.log(`Finished downloading skins. Total new skins: ${skinCount}`);

  console.log('Downloading vehicle models...');
  let vehCount = 0;
  for (const [modelId, name] of Object.entries(VEHICLE_FILENAMES)) {
    const subpath = calculateMD5Path(name);
    const url = `https://wiki.multitheftauto.com/images/${subpath}`;
    const dest = path.join(VEHICLES_DIR, `${modelId}.png`);
    
    if (!fs.existsSync(dest)) {
      const ok = await downloadFile(url, dest);
      if (ok) {
        vehCount++;
      }
    }
  }
  console.log(`Finished downloading vehicles. Total new vehicles: ${vehCount}`);
}

downloadAll();
