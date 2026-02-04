export interface Filter {
  id: string;
  name: string;
  cssFilter: string; // The CSS filter string (e.g., 'grayscale(100%)')
  previewColor: string; // Hex or gradient for the UI button
  hasOverlay?: boolean; // If true, adds a vignette/grain overlay
}

export type AppStatus = 'idle' | 'countdown' | 'capturing' | 'review';

export interface PhotoData {
  id: string;
  dataUrl: string;
  filterId: string;
}

export const STRIP_COLORS = [
  { id: 'white', value: '#ffffff', label: 'Classic White', text: '#000000' },
  { id: 'black', value: '#0f0f0f', label: 'Midnight Black', text: '#ffffff' },
  { id: 'pink', value: '#fce7f3', label: 'Soft Pink', text: '#831843' },
  { id: 'cream', value: '#fef3c7', label: 'Vintage Cream', text: '#78350f' },
  { id: 'blue', value: '#e0f2fe', label: 'Sky Blue', text: '#0c4a6e' },
  { id: 'neon', value: '#171717', label: 'Neon Glow', text: '#22d3ee' },
];

export const FILTERS: Filter[] = [
  { id: 'normal', name: 'Normal', cssFilter: 'none', previewColor: 'bg-gray-400' },
  { 
    id: 'grayscale', 
    name: 'Noir', 
    cssFilter: 'grayscale(100%) contrast(1.2) brightness(0.9)', 
    previewColor: 'bg-gray-800', 
    hasOverlay: true 
  },
  { 
    id: 'sepia', 
    name: 'Vintage', 
    cssFilter: 'sepia(0.6) contrast(1.2) brightness(0.9) saturate(0.8)', 
    previewColor: 'bg-amber-700', 
    hasOverlay: true 
  },
  { 
    id: 'warm', 
    name: 'Summer', 
    cssFilter: 'contrast(1.1) brightness(1.1) saturate(1.3) hue-rotate(-10deg)', 
    previewColor: 'bg-orange-400' 
  },
  { 
    id: 'cool', 
    name: 'Winter', 
    cssFilter: 'contrast(0.95) brightness(1.1) saturate(1.1) hue-rotate(10deg)', 
    previewColor: 'bg-blue-400' 
  },
  { 
    id: 'dramatic', 
    name: 'Drama', 
    cssFilter: 'contrast(1.4) saturate(0.2) brightness(0.8)', 
    previewColor: 'bg-rose-900', 
    hasOverlay: true 
  },
  { 
    id: 'cyber', 
    name: 'Cyber', 
    cssFilter: 'contrast(1.2) saturate(1.5) hue-rotate(190deg)', 
    previewColor: 'bg-purple-500' 
  },
];