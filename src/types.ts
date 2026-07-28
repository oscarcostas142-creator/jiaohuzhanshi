export type TapePattern = 'sage_gold' | 'terracotta_geo' | 'indigo_constellation' | 'pastel_grid' | 'custom';

export type DeskMaterial = 'light_wood' | 'studio_slate' | 'cream_matte' | 'warm_sand';

export interface TapeConfig {
  width: number;
  pattern: TapePattern;
  deskMaterial: DeskMaterial;
  tapeColor: string; // Base accent color for customizing the pattern color
  customImages?: string[]; // Array of base64 / blob URLs representing uploaded images
}

export interface PathPoint {
  x: number;
  y: number; // Stacking height
  z: number;
  nx: number; // Normal vector X for width expansion
  nz: number; // Normal vector Z
  distance: number; // Cumulative path distance
}

export const COLORS = {
  deskColor: '#EAEAEA',
  tapeBaseColor: '#F4F4F6',
  stampRed: '#C83C3C',
  stampBlack: '#2C2C2C',
};
