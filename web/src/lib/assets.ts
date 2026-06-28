import { SKIN_MODEL_NAMES } from './skins-map';

/**
 * GTA SA-MP Skin & Vehicle Image Asset Helper
 * Resolves to flat local assets in the Next.js public directory
 */

export function getSkinImageUrl(skinId: number, small: boolean = false): string {
  const name = SKIN_MODEL_NAMES[skinId] || 'cj';
  
  if (small) {
    return `/skins_small/${name}-240-400.png`;
  }
  return `/skins/${name}-380-600.png`;
}

export function getVehicleImageUrl(modelId: number): string {
  // MTA/SA-MP vehicle ID range is 400 to 611
  if (modelId >= 400 && modelId <= 611) {
    return `/vehicles/${modelId}.png`;
  }
  // Default fallback to Infernus
  return '/vehicles/411.png';
}
