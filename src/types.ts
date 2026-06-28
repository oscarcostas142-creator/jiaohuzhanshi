export type TapePattern = 'sage_gold' | 'terracotta_geo' | 'indigo_constellation' | 'pastel_grid';

export type DeskMaterial = 'light_wood' | 'studio_slate' | 'cream_matte' | 'warm_sand';

export interface TapeConfig {
  width: number;
  pattern: TapePattern;
  deskMaterial: DeskMaterial;
  tapeColor: string; // Base accent color for customizing the pattern color
}

export interface PathPoint {
  x: number;
  y: number; // Stacking height
  z: number;
  nx: number; // Normal vector X for width expansion
  nz: number; // Normal vector Z
  distance: number; // Cumulative path distance
}
