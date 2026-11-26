export type ContentFormatKey = 'static' | 'reels' | 'covers' | 'carousels';

export type CurrencyCode = 'USD' | 'MXN' | 'COP' | 'EUR' | 'ARS' | 'CLP' | 'PEN';

export type CampaignObjective = 'awareness' | 'engagement' | 'traffic';

export type NetworkKey = 'facebook' | 'instagram' | 'tiktok';

export interface ContentMix {
  static: number;
  reels: number;
  covers: number;
  carousels: number;
}

export interface TopPost {
  id: string;
  title: string;
  contentType: ContentFormatKey;
  /** Facebook/Instagram: Alcance; TikTok: Reproducciones */
  primaryMetric: number;
  /** Facebook/Instagram: Interacciones; TikTok: Me gusta */
  secondaryMetric: number;
  imageUrl: string;
  postUrl: string;
  publishedDate: string;
}

export interface MetaNetworkMetrics {
  reach: number;
  engagement: number;
  visits: number;
  followers: number;
  contentMix: ContentMix;
  topPosts: TopPost[];
}

export interface TikTokNetworkMetrics {
  views: number;
  likes: number;
  visits: number;
  newFollowers: number;
  contentMix: ContentMix;
  topPosts: TopPost[];
}

export interface SimulatorDefaults {
  monthlyBudget: number;
  objective: CampaignObjective;
  fbShare: number;
  igShare: number;
  ttShare: number;
  /** CPM expressed in USD baseline; automatically scaled for local currency display */
  fbCpm: number;
  igCpm: number;
  ttCpm: number;
}

export interface AgencySettings {
  agencyName: string;
  agencyTagline: string;
  agencyLogoDataUrl: string;
  ownerId?: string;
}

export interface ClientReport {
  id: string;
  /** Normalized client slug grouping multiple months/intervals of the same client */
  clientKey: string;
  clientName: string;
  clientIndustry: string;
  /** Interval start date (YYYY-MM-DD) */
  startDate: string;
  /** Interval end date (YYYY-MM-DD) */
  endDate: string;
  period: string;
  currency: CurrencyCode;
  executiveSummary: string;
  clientLogoDataUrl: string;
  isPublished: boolean;
  facebook: MetaNetworkMetrics;
  instagram: MetaNetworkMetrics;
  tiktok: TikTokNetworkMetrics;
  simulatorDefaults: SimulatorDefaults;
  ownerId?: string;
  isLocalDemo?: boolean;
}

export const FIELD_LIMITS = {
  agencyName: 100,
  agencyTagline: 180,
  logoDataUrl: 255000,
  postImageUrl: 115000,
  clientKey: 120,
  clientName: 120,
  clientIndustry: 100,
  period: 60,
  executiveSummary: 1200,
  postTitle: 160,
  postUrl: 500,
  publishedDate: 40,
  maxTopPosts: 2,
} as const;

export const ID_PATTERN = /^[a-zA-Z0-9_-]+$/;
export const CLIENT_KEY_PATTERN = /^[a-z0-9_-]+$/;
export const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const CONTENT_FORMAT_LABELS: Record<ContentFormatKey, string> = {
  static: 'Estáticos',
  reels: 'Reels',
  covers: 'Portadas',
  carousels: 'Carruseles',
};

export const CURRENCY_CONFIG: Record<
  CurrencyCode,
  { symbol: string; label: string; usdRate: number; defaultBudget: number; maxBudget: number; step: number }
> = {
  USD: { symbol: '$', label: 'USD — Dólar', usdRate: 1, defaultBudget: 600, maxBudget: 5000, step: 50 },
  MXN: { symbol: '$', label: 'MXN — Peso mexicano', usdRate: 18.5, defaultBudget: 10000, maxBudget: 100000, step: 500 },
  COP: { symbol: '$', label: 'COP — Peso colombiano', usdRate: 4100, defaultBudget: 2000000, maxBudget: 20000000, step: 100000 },
  EUR: { symbol: '€', label: 'EUR — Euro', usdRate: 0.92, defaultBudget: 550, maxBudget: 5000, step: 50 },
  ARS: { symbol: '$', label: 'ARS — Peso argentino', usdRate: 1050, defaultBudget: 500000, maxBudget: 5000000, step: 25000 },
  CLP: { symbol: '$', label: 'CLP — Peso chileno', usdRate: 940, defaultBudget: 500000, maxBudget: 5000000, step: 25000 },
  PEN: { symbol: 'S/', label: 'PEN — Sol peruano', usdRate: 3.75, defaultBudget: 2000, maxBudget: 20000, step: 100 },
};

export const OBJECTIVE_CONFIG: Record<
  CampaignObjective,
  {
    label: string;
    description: string;
    cpmMultiplier: number;
    frequencyFactor: number;
    engagementRate: { facebook: number; instagram: number; tiktok: number };
    visitRate: { facebook: number; instagram: number; tiktok: number };
  }
> = {
  awareness: {
    label: 'Reconocimiento',
    description: 'Maximiza el alcance único y la visibilidad de marca.',
    cpmMultiplier: 1.0,
    frequencyFactor: 1.32,
    engagementRate: { facebook: 0.022, instagram: 0.031, tiktok: 0.042 },
    visitRate: { facebook: 0.008, instagram: 0.012, tiktok: 0.01 },
  },
  engagement: {
    label: 'Interacción',
    description: 'Prioriza reacciones, comentarios, guardados y compartidos.',
    cpmMultiplier: 1.18,
    frequencyFactor: 1.48,
    engagementRate: { facebook: 0.048, instagram: 0.062, tiktok: 0.078 },
    visitRate: { facebook: 0.014, instagram: 0.02, tiktok: 0.018 },
  },
  traffic: {
    label: 'Tráfico y visitas',
    description: 'Dirige audiencia calificada al perfil y enlaces de destino.',
    cpmMultiplier: 1.28,
    frequencyFactor: 1.55,
    engagementRate: { facebook: 0.028, instagram: 0.036, tiktok: 0.045 },
    visitRate: { facebook: 0.028, instagram: 0.034, tiktok: 0.026 },
  },
};
