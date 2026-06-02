import { useState, useEffect } from 'react';

interface SiteSettingsData {
  siteName: string;
  colorPrimary: string;
}

const defaultSettings: SiteSettingsData = {
  siteName: 'KitchenAsty',
  colorPrimary: '#ea580c',
};

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [h * 360, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function applyPrimaryPalette(hex: string) {
  const [h, s] = hexToHsl(hex);
  const shades: Record<string, number> = {
    '50': 96, '100': 90, '200': 80, '300': 70, '400': 60,
    '500': 50, '600': 40, '700': 33, '800': 26, '900': 20, '950': 12,
  };
  const root = document.documentElement;
  for (const [shade, lightness] of Object.entries(shades)) {
    root.style.setProperty(`--color-primary-${shade}`, hslToHex(h, s, lightness));
  }
}

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettingsData>(defaultSettings);

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          const data = json.data;
          setSettings({
            siteName: data.siteName ?? 'KitchenAsty',
            colorPrimary: data.colorPrimary ?? '#ea580c',
          });
          applyPrimaryPalette(data.colorPrimary ?? '#ea580c');
        }
      })
      .catch(() => {});
  }, []);

  return settings;
}
