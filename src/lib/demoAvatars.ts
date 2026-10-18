import type { ImageSourcePropType } from 'react-native';

// Illustrated avatars for the demo members (photo_path = 'demo/<key>'). Real members use Supabase Storage.
const DEMO: Record<string, ImageSourcePropType> = {
  'demo/nino': require('../../assets/images/demo/nino.jpg'),
  'demo/giga': require('../../assets/images/demo/giga.jpg'),
  'demo/tamar': require('../../assets/images/demo/tamar.jpg'),
  'demo/lasha': require('../../assets/images/demo/lasha.jpg'),
  'demo/mariam': require('../../assets/images/demo/mariam.jpg'),
  'demo/zura': require('../../assets/images/demo/zura.jpg'),
  'demo/eka': require('../../assets/images/demo/eka.jpg'),
  'demo/sopo': require('../../assets/images/demo/sopo.jpg'),
  'demo/nika': require('../../assets/images/demo/nika.jpg'),
  'demo/dato': require('../../assets/images/demo/dato.jpg'),
};

export function demoAvatar(path: string | null | undefined): ImageSourcePropType | null {
  return path ? (DEMO[path] ?? null) : null;
}
