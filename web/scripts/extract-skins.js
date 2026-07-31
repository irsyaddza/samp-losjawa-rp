const fs = require('fs');
const path = require('path');

const phpPath = 'C:\\Users\\irsyadd\\AppData\\Local\\Temp\\lsrp-ucp-temp\\api\\skins.php';
const destPath = path.join(__dirname, '..', 'src', 'lib', 'skins-map.ts');

if (!fs.existsSync(phpPath)) {
  console.error('skins.php not found at', phpPath);
  process.exit(1);
}

const content = fs.readFileSync(phpPath, 'utf8');
const lines = content.split('\n');

const skinMap = {};

for (const line of lines) {
  if (!line.trim()) continue;
  try {
    const data = JSON.parse(line.trim());
    if (data && data.skins) {
      for (const skin of data.skins) {
        if (skin.id && skin.name) {
          skinMap[skin.id] = skin.name;
        }
      }
    }
  } catch (e) {
    // Ignore lines that are not JSON
  }
}

// Add default fallback names for missing/common skins
skinMap[0] = 'cj';

const tsContent = `// Automatically generated skin mapping
export const SKIN_MODEL_NAMES: Record<number, string> = ${JSON.stringify(skinMap, null, 2)};
`;

fs.writeFileSync(destPath, tsContent);
console.log('Successfully generated skins-map.ts with', Object.keys(skinMap).length, 'mappings.');
