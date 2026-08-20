export const SUPPORTED_PLATFORMS = ['Shutterstock', 'Adobe Stock', 'Vecteezy'] as const;

export type PlatformType = (typeof SUPPORTED_PLATFORMS)[number];

export const PLATFORMS_DEFAULT = ['Shutterstock', 'Adobe Stock', 'Vecteezy'];

export const SALES_FILTER_PLATFORMS = ['all', 'Shutterstock', 'Adobe Stock', 'Vecteezy', 'unlinked'] as const;

export interface PlatformTheme {
  dot: string;
  text: string;
  bg: string;
  border: string;
}

export const PLATFORM_THEMES: Record<string, PlatformTheme> = {
  Shutterstock: { dot: 'bg-red-500', text: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  'Adobe Stock': { dot: 'bg-blue-500', text: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  Vecteezy: { dot: 'bg-amber-500', text: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
};
