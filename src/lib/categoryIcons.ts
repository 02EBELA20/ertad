import type { ComponentProps } from 'react';
import type { MaterialCommunityIcons } from '@expo/vector-icons';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

// One icon per top-level category (by slug). Add new slugs here when categories grow.
const icons: Record<string, IconName> = {
  auto: 'car-wrench',
  repair: 'hammer-wrench',
  cleaning: 'broom',
  moving: 'truck-fast-outline',
  driver: 'steering',
  care: 'baby-face-outline',
  beauty: 'content-cut',
  health: 'heart-pulse',
  legal: 'scale-balance',
  translation: 'translate',
  'it-design': 'laptop',
  teaching: 'school-outline',
  'events-food': 'party-popper',
  'general-work': 'briefcase-outline',
  other: 'dots-horizontal-circle-outline',
};

export function categoryIcon(slug: string): IconName {
  return icons[slug] ?? 'shape-outline';
}
