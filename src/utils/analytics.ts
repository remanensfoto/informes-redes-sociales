import {
  CURRENCY_CONFIG,
  FIELD_LIMITS,
  ID_PATTERN,
  ISO_DATE_PATTERN,
  OBJECTIVE_CONFIG,
  type AgencySettings,
  type CampaignObjective,
  type ClientReport,
  type ContentMix,
  type CurrencyCode,
  type NetworkKey,
  type TopPost,
} from '../types/report';

export interface ConsolidatedMetrics {
  totalExposure: number;
  totalInteractions: number;
  totalVisits: number;
  totalFollowersAudience: number;
  tiktokNewFollowers: number;
  totalContentPieces: number;
  contentMixTotals: ContentMix;
  engagementRateOverall: number;
  perNetwork: {
    key: NetworkKey;
    label: string;
    exposure: number;
    exposureLabel: string;
    interactions: number;
    interactionsLabel: string;
    visits: number;
    audience: number;
    audienceLabel: string;
    contentCount: number;
    exposureSharePct: number;
    engagementRatePct: number;
  }[];
}

export interface NetworkSimulationResult {
  key: NetworkKey;
  label: string;
  sharePct: number;
  budgetLocal: number;
  budgetUsd: number;
  cpmUsd: number;
  impressions: number;
  estimatedReach: number;
  estimatedInteractions: number;
  estimatedVisits: number;
  organicBaseline: number;
  projectedTotalExposure: number;
  upliftPct: number;
}

export interface SimulationSummary {
  currency: CurrencyCode;
  totalBudgetLocal: number;
  totalBudgetUsd: number;
  objective: CampaignObjective;
  totalImpressions: number;
  totalEstimatedReach: number;
  totalEstimatedInteractions: number;
  totalEstimatedVisits: number;
  totalOrganicExposure: number;
  totalCombinedExposure: number;
  overallUpliftPct: number;
  networks: NetworkSimulationResult[];
}

export interface SimulatorInput {
  monthlyBudget: number;
  currency: CurrencyCode;
  objective: CampaignObjective;
  fbShare: number;
  igShare: number;
  ttShare: number;
  fbCpm: number;
  igCpm: number;
  ttCpm: number;
  organicBaseline: {
    facebook: number;
    instagram: number;
    tiktok: number;
  };
}

export function clampNonNeg(value: number, max = 10_000_000_000): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.min(Math.round(value * 100) / 100, max);
}

export function clampInt(value: number, max = 10_000_000_000): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.min(Math.round(value), max);
}

export function computeContentMixTotal(mix: ContentMix): number {
  return (
    clampInt(mix.static) +
    clampInt(mix.reels) +
    clampInt(mix.covers) +
    clampInt(mix.carousels)
  );
}

export function computeConsolidatedMetrics(report: ClientReport): ConsolidatedMetrics {
  const fbExposure = clampInt(report.facebook.reach);
  const igExposure = clampInt(report.instagram.reach);
  const ttExposure = clampInt(report.tiktok.views);
  const totalExposure = fbExposure + igExposure + ttExposure;

  const fbInteractions = clampInt(report.facebook.engagement);
  const igInteractions = clampInt(report.instagram.engagement);
  const ttInteractions = clampInt(report.tiktok.likes);
  const totalInteractions = fbInteractions + igInteractions + ttInteractions;

  const fbVisits = clampInt(report.facebook.visits);
  const igVisits = clampInt(report.instagram.visits);
  const ttVisits = clampInt(report.tiktok.visits);
  const totalVisits = fbVisits + igVisits + ttVisits;

  const fbFollowers = clampInt(report.facebook.followers);
  const igFollowers = clampInt(report.instagram.followers);
  const ttNewFollowers = clampInt(report.tiktok.newFollowers);
  const totalFollowersAudience = fbFollowers + igFollowers + ttNewFollowers;

  const contentMixTotals: ContentMix = {
    static:
      clampInt(report.facebook.contentMix.static) +
      clampInt(report.instagram.contentMix.static) +
      clampInt(report.tiktok.contentMix.static),
    reels:
      clampInt(report.facebook.contentMix.reels) +
      clampInt(report.instagram.contentMix.reels) +
      clampInt(report.tiktok.contentMix.reels),
    covers:
      clampInt(report.facebook.contentMix.covers) +
      clampInt(report.instagram.contentMix.covers) +
      clampInt(report.tiktok.contentMix.covers),
    carousels:
      clampInt(report.facebook.contentMix.carousels) +
      clampInt(report.instagram.contentMix.carousels) +
      clampInt(report.tiktok.contentMix.carousels),
  };

  const totalContentPieces = computeContentMixTotal(contentMixTotals);

  const safePct = (part: number, whole: number) =>
    whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0;

  return {
    totalExposure,
    totalInteractions,
    totalVisits,
    totalFollowersAudience,
    tiktokNewFollowers: ttNewFollowers,
    totalContentPieces,
    contentMixTotals,
    engagementRateOverall: safePct(totalInteractions, totalExposure),
    perNetwork: [
      {
        key: 'facebook',
        label: 'Facebook',
        exposure: fbExposure,
        exposureLabel: 'Alcance',
        interactions: fbInteractions,
        interactionsLabel: 'Interacción',
        visits: fbVisits,
        audience: fbFollowers,
        audienceLabel: 'Seguidores',
        contentCount: computeContentMixTotal(report.facebook.contentMix),
        exposureSharePct: safePct(fbExposure, totalExposure),
        engagementRatePct: safePct(fbInteractions, fbExposure),
      },
      {
        key: 'instagram',
        label: 'Instagram',
        exposure: igExposure,
        exposureLabel: 'Alcance',
        interactions: igInteractions,
        interactionsLabel: 'Interacción',
        visits: igVisits,
        audience: igFollowers,
        audienceLabel: 'Seguidores',
        contentCount: computeContentMixTotal(report.instagram.contentMix),
        exposureSharePct: safePct(igExposure, totalExposure),
        engagementRatePct: safePct(igInteractions, igExposure),
      },
      {
        key: 'tiktok',
        label: 'TikTok',
        exposure: ttExposure,
        exposureLabel: 'Reproducciones',
        interactions: ttInteractions,
        interactionsLabel: 'Me gusta',
        visits: ttVisits,
        audience: ttNewFollowers,
        audienceLabel: 'Nuevos seguidores',
        contentCount: computeContentMixTotal(report.tiktok.contentMix),
        exposureSharePct: safePct(ttExposure, totalExposure),
        engagementRatePct: safePct(ttInteractions, ttExposure),
      },
    ],
  };
}

export function normalizeShares(fb: number, ig: number, tt: number): { fb: number; ig: number; tt: number } {
  const safeFb = Math.max(0, Number.isFinite(fb) ? fb : 0);
  const safeIg = Math.max(0, Number.isFinite(ig) ? ig : 0);
  const safeTt = Math.max(0, Number.isFinite(tt) ? tt : 0);
  const sum = safeFb + safeIg + safeTt;
  if (sum <= 0) {
    return { fb: 34, ig: 33, tt: 33 };
  }
  const fbPct = Math.round((safeFb / sum) * 1000) / 10;
  const igPct = Math.round((safeIg / sum) * 1000) / 10;
  const ttPct = Math.max(0, Math.round((100 - fbPct - igPct) * 10) / 10);
  return { fb: fbPct, ig: igPct, tt: ttPct };
}

export function simulatePaidMedia(input: SimulatorInput): SimulationSummary {
  const currencyMeta = CURRENCY_CONFIG[input.currency] ?? CURRENCY_CONFIG.USD;
  const objectiveMeta = OBJECTIVE_CONFIG[input.objective] ?? OBJECTIVE_CONFIG.awareness;

  const totalBudgetLocal = Math.max(0, Number.isFinite(input.monthlyBudget) ? input.monthlyBudget : 0);
  const totalBudgetUsd = totalBudgetLocal / currencyMeta.usdRate;
  const shares = normalizeShares(input.fbShare, input.igShare, input.ttShare);

  const specs: {
    key: NetworkKey;
    label: string;
    sharePct: number;
    baseCpmUsd: number;
    organicBaseline: number;
  }[] = [
    {
      key: 'facebook',
      label: 'Facebook',
      sharePct: shares.fb,
      baseCpmUsd: Math.max(0.5, input.fbCpm || 3.4),
      organicBaseline: clampInt(input.organicBaseline.facebook),
    },
    {
      key: 'instagram',
      label: 'Instagram',
      sharePct: shares.ig,
      baseCpmUsd: Math.max(0.5, input.igCpm || 4.6),
      organicBaseline: clampInt(input.organicBaseline.instagram),
    },
    {
      key: 'tiktok',
      label: 'TikTok',
      sharePct: shares.tt,
      baseCpmUsd: Math.max(0.5, input.ttCpm || 2.8),
      organicBaseline: clampInt(input.organicBaseline.tiktok),
    },
  ];

  const networks: NetworkSimulationResult[] = specs.map((spec) => {
    const budgetLocal = Math.round((totalBudgetLocal * (spec.sharePct / 100)) * 100) / 100;
    const budgetUsd = budgetLocal / currencyMeta.usdRate;
    const effectiveCpmUsd = Math.round(spec.baseCpmUsd * objectiveMeta.cpmMultiplier * 100) / 100;

    const impressions = budgetUsd > 0 ? Math.round((budgetUsd / effectiveCpmUsd) * 1000) : 0;
    const estimatedReach = impressions > 0 ? Math.round(impressions / objectiveMeta.frequencyFactor) : 0;
    const estimatedInteractions = Math.round(
      estimatedReach * objectiveMeta.engagementRate[spec.key]
    );
    const estimatedVisits = Math.round(
      estimatedReach * objectiveMeta.visitRate[spec.key]
    );
    const projectedTotalExposure = spec.organicBaseline + estimatedReach;
    const upliftPct =
      spec.organicBaseline > 0
        ? Math.round((estimatedReach / spec.organicBaseline) * 1000) / 10
        : estimatedReach > 0
          ? 100
          : 0;

    return {
      key: spec.key,
      label: spec.label,
      sharePct: spec.sharePct,
      budgetLocal,
      budgetUsd: Math.round(budgetUsd * 100) / 100,
      cpmUsd: effectiveCpmUsd,
      impressions,
      estimatedReach,
      estimatedInteractions,
      estimatedVisits,
      organicBaseline: spec.organicBaseline,
      projectedTotalExposure,
      upliftPct,
    };
  });

  const totalImpressions = networks.reduce((acc, n) => acc + n.impressions, 0);
  const totalEstimatedReach = networks.reduce((acc, n) => acc + n.estimatedReach, 0);
  const totalEstimatedInteractions = networks.reduce((acc, n) => acc + n.estimatedInteractions, 0);
  const totalEstimatedVisits = networks.reduce((acc, n) => acc + n.estimatedVisits, 0);
  const totalOrganicExposure = networks.reduce((acc, n) => acc + n.organicBaseline, 0);
  const totalCombinedExposure = totalOrganicExposure + totalEstimatedReach;
  const overallUpliftPct =
    totalOrganicExposure > 0
      ? Math.round((totalEstimatedReach / totalOrganicExposure) * 1000) / 10
      : totalEstimatedReach > 0
        ? 100
        : 0;

  return {
    currency: input.currency,
    totalBudgetLocal,
    totalBudgetUsd: Math.round(totalBudgetUsd * 100) / 100,
    objective: input.objective,
    totalImpressions,
    totalEstimatedReach,
    totalEstimatedInteractions,
    totalEstimatedVisits,
    totalOrganicExposure,
    totalCombinedExposure,
    overallUpliftPct,
    networks,
  };
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('es-MX', {
    useGrouping: true,
    maximumFractionDigits: 0,
  }).format(Math.round(Number.isFinite(n) ? n : 0));
}

export function formatCompact(n: number): string {
  const safe = Number.isFinite(n) ? n : 0;
  if (safe >= 1_000_000) {
    return `${(safe / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (safe >= 10_000) {
    return `${(safe / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  }
  return formatNumber(safe);
}

export function formatCurrency(amount: number, currency: CurrencyCode): string {
  const meta = CURRENCY_CONFIG[currency] ?? CURRENCY_CONFIG.USD;
  const formatted = new Intl.NumberFormat('es-MX', {
    useGrouping: true,
    maximumFractionDigits: 0,
  }).format(Math.round(Number.isFinite(amount) ? amount : 0));
  return `${meta.symbol}${formatted} ${currency}`;
}

export function slugifyClientKey(clientName: string): string {
  const slug = (clientName || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, FIELD_LIMITS.clientKey);
  return slug || 'cliente';
}

export function slugifyReportId(clientName: string, period: string): string {
  const raw = `${clientName}-${period}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  const suffix = Math.random().toString(36).slice(2, 6);
  return raw ? `${raw}-${suffix}` : `informe-${suffix}`;
}

const MONTHS_ES_LONG = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const MONTHS_ES_SHORT = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function parseIsoDateParts(isoDate: string): { year: number; month: number; day: number } | null {
  if (!ISO_DATE_PATTERN.test(isoDate)) return null;
  const [y, m, d] = isoDate.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const check = new Date(Date.UTC(y, m - 1, d));
  if (
    check.getUTCFullYear() !== y ||
    check.getUTCMonth() !== m - 1 ||
    check.getUTCDate() !== d
  ) {
    return null;
  }
  return { year: y, month: m, day: d };
}

export function getLastDayOfMonth(year: number, month1Based: number): number {
  return new Date(Date.UTC(year, month1Based, 0)).getUTCDate();
}

export function getMonthBounds(year: number, month1Based: number): { startDate: string; endDate: string } {
  const lastDay = getLastDayOfMonth(year, month1Based);
  return {
    startDate: `${year}-${pad2(month1Based)}-01`,
    endDate: `${year}-${pad2(month1Based)}-${pad2(lastDay)}`,
  };
}

export function formatShortDateEs(isoDate: string): string {
  const parts = parseIsoDateParts(isoDate);
  if (!parts) return isoDate;
  return `${pad2(parts.day)} ${MONTHS_ES_SHORT[parts.month - 1]} ${parts.year}`;
}

export function formatMonthKeyLabel(monthKey: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!match) return monthKey;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return monthKey;
  return `${MONTHS_ES_LONG[month - 1]} ${year}`;
}

export function formatIntervalLabel(startDate: string, endDate: string): string {
  const s = parseIsoDateParts(startDate);
  const e = parseIsoDateParts(endDate);
  if (!s || !e) return startDate && endDate ? `${startDate} – ${endDate}` : 'Período actual';

  const lastDay = getLastDayOfMonth(s.year, s.month);
  if (s.year === e.year && s.month === e.month && s.day === 1 && e.day === lastDay) {
    return `${MONTHS_ES_LONG[s.month - 1]} ${s.year}`;
  }
  if (s.year === e.year) {
    return `${pad2(s.day)} ${MONTHS_ES_SHORT[s.month - 1]} – ${pad2(e.day)} ${MONTHS_ES_SHORT[e.month - 1]} ${e.year}`;
  }
  return `${pad2(s.day)} ${MONTHS_ES_SHORT[s.month - 1]} ${s.year} – ${pad2(e.day)} ${MONTHS_ES_SHORT[e.month - 1]} ${e.year}`;
}

export function getReportMonthKey(report: Pick<ClientReport, 'startDate'>): string {
  if (ISO_DATE_PATTERN.test(report.startDate)) {
    return report.startDate.slice(0, 7);
  }
  return '2026-11';
}

export function sortReportsChronologically(reports: ClientReport[]): ClientReport[] {
  return [...reports].sort((a, b) => {
    const startCmp = a.startDate.localeCompare(b.startDate);
    if (startCmp !== 0) return startCmp;
    return a.endDate.localeCompare(b.endDate);
  });
}

export function filterReportsByDateRange(
  reports: ClientReport[],
  fromDate: string,
  toDate: string
): ClientReport[] {
  if (!ISO_DATE_PATTERN.test(fromDate) || !ISO_DATE_PATTERN.test(toDate)) {
    return sortReportsChronologically(reports);
  }
  if (fromDate > toDate) {
    return [];
  }
  return sortReportsChronologically(
    reports.filter((r) => r.startDate <= toDate && r.endDate >= fromDate)
  );
}

function mergeContentMixes(mixes: ContentMix[]): ContentMix {
  return mixes.reduce<ContentMix>(
    (acc, m) => ({
      static: acc.static + clampInt(m.static),
      reels: acc.reels + clampInt(m.reels),
      covers: acc.covers + clampInt(m.covers),
      carousels: acc.carousels + clampInt(m.carousels),
    }),
    { static: 0, reels: 0, covers: 0, carousels: 0 }
  );
}

function selectTopTwoPosts(postLists: TopPost[][]): TopPost[] {
  const flat = postLists.flat().filter((p) => p.title.trim() || p.primaryMetric > 0);
  const sorted = [...flat].sort((a, b) => b.primaryMetric - a.primaryMetric);
  const seen = new Set<string>();
  const picked: TopPost[] = [];
  for (const post of sorted) {
    const dedupeKey = `${post.title.trim().toLowerCase()}|${post.primaryMetric}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    picked.push(post);
    if (picked.length >= 2) break;
  }
  return picked;
}

export function aggregateReportsForRange(
  reports: ClientReport[],
  opts?: { fromDate?: string; toDate?: string; customPeriodLabel?: string }
): ClientReport | null {
  if (reports.length === 0) return null;
  const sorted = sortReportsChronologically(reports);
  if (sorted.length === 1) {
    return sorted[0];
  }

  const first = sorted[0];
  const latest = sorted[sorted.length - 1];
  const effectiveStart = opts?.fromDate && ISO_DATE_PATTERN.test(opts.fromDate)
    ? opts.fromDate
    : first.startDate;
  const effectiveEnd = opts?.toDate && ISO_DATE_PATTERN.test(opts.toDate)
    ? opts.toDate
    : latest.endDate;

  const periodLabels = sorted.map((r) => r.period).filter(Boolean);
  const combinedSummary = `Consolidado de ${sorted.length} intervalos (${periodLabels.join(', ')}). ${latest.executiveSummary || ''}`.trim();

  return {
    ...latest,
    id: `${latest.clientKey}-${effectiveStart}-${effectiveEnd}`,
    startDate: effectiveStart,
    endDate: effectiveEnd,
    period: opts?.customPeriodLabel || formatIntervalLabel(effectiveStart, effectiveEnd),
    executiveSummary: combinedSummary,
    facebook: {
      reach: sorted.reduce((s, r) => s + clampInt(r.facebook.reach), 0),
      engagement: sorted.reduce((s, r) => s + clampInt(r.facebook.engagement), 0),
      visits: sorted.reduce((s, r) => s + clampInt(r.facebook.visits), 0),
      // Follower count is a point-in-time snapshot -> take latest period in range
      followers: clampInt(latest.facebook.followers),
      contentMix: mergeContentMixes(sorted.map((r) => r.facebook.contentMix)),
      topPosts: selectTopTwoPosts(sorted.map((r) => r.facebook.topPosts)),
    },
    instagram: {
      reach: sorted.reduce((s, r) => s + clampInt(r.instagram.reach), 0),
      engagement: sorted.reduce((s, r) => s + clampInt(r.instagram.engagement), 0),
      visits: sorted.reduce((s, r) => s + clampInt(r.instagram.visits), 0),
      followers: clampInt(latest.instagram.followers),
      contentMix: mergeContentMixes(sorted.map((r) => r.instagram.contentMix)),
      topPosts: selectTopTwoPosts(sorted.map((r) => r.instagram.topPosts)),
    },
    tiktok: {
      views: sorted.reduce((s, r) => s + clampInt(r.tiktok.views), 0),
      likes: sorted.reduce((s, r) => s + clampInt(r.tiktok.likes), 0),
      visits: sorted.reduce((s, r) => s + clampInt(r.tiktok.visits), 0),
      // TikTok new followers are additive across intervals
      newFollowers: sorted.reduce((s, r) => s + clampInt(r.tiktok.newFollowers), 0),
      contentMix: mergeContentMixes(sorted.map((r) => r.tiktok.contentMix)),
      topPosts: selectTopTwoPosts(sorted.map((r) => r.tiktok.topPosts)),
    },
  };
}

export function sanitizeTopPost(post: TopPost, fallbackId: string): TopPost {
  const safeId = ID_PATTERN.test(post.id) ? post.id.slice(0, 128) : fallbackId;
  return {
    id: safeId,
    title: (post.title || '').trim().slice(0, FIELD_LIMITS.postTitle),
    contentType: ['static', 'reels', 'covers', 'carousels'].includes(post.contentType)
      ? post.contentType
      : 'reels',
    primaryMetric: clampInt(post.primaryMetric),
    secondaryMetric: clampInt(post.secondaryMetric),
    imageUrl: (post.imageUrl || '').slice(0, FIELD_LIMITS.postImageUrl),
    postUrl: (post.postUrl || '').trim().slice(0, FIELD_LIMITS.postUrl),
    publishedDate: (post.publishedDate || '').trim().slice(0, FIELD_LIMITS.publishedDate),
  };
}

export function sanitizeContentMix(mix: ContentMix): ContentMix {
  return {
    static: clampInt(mix.static),
    reels: clampInt(mix.reels),
    covers: clampInt(mix.covers),
    carousels: clampInt(mix.carousels),
  };
}

export function validateClientReport(report: ClientReport): string[] {
  const errors: string[] = [];
  if (!report.clientName.trim()) {
    errors.push('El nombre del cliente es obligatorio.');
  }
  if (!parseIsoDateParts(report.startDate)) {
    errors.push('Selecciona una fecha de inicio válida.');
  }
  if (!parseIsoDateParts(report.endDate)) {
    errors.push('Selecciona una fecha de fin válida.');
  }
  if (
    parseIsoDateParts(report.startDate) &&
    parseIsoDateParts(report.endDate) &&
    report.startDate > report.endDate
  ) {
    errors.push('La fecha de inicio no puede ser posterior a la fecha de fin.');
  }
  if (!report.period.trim()) {
    errors.push('El nombre del período es obligatorio.');
  }
  if (report.clientLogoDataUrl.length > FIELD_LIMITS.logoDataUrl) {
    errors.push('El logotipo del cliente excede el tamaño máximo permitido.');
  }
  return errors;
}

export function sanitizeReportPayload(report: ClientReport, ownerId: string) {
  const startDate = parseIsoDateParts(report.startDate) ? report.startDate : '2026-11-01';
  const rawEnd = parseIsoDateParts(report.endDate) ? report.endDate : startDate;
  const endDate = rawEnd >= startDate ? rawEnd : startDate;
  const clientName = report.clientName.trim().slice(0, FIELD_LIMITS.clientName) || 'Cliente';
  const clientKey = slugifyClientKey(report.clientKey || clientName);
  const period =
    report.period.trim().slice(0, FIELD_LIMITS.period) ||
    formatIntervalLabel(startDate, endDate);

  return {
    clientKey,
    clientName,
    clientIndustry: report.clientIndustry.trim().slice(0, FIELD_LIMITS.clientIndustry),
    startDate,
    endDate,
    period,
    currency: report.currency in CURRENCY_CONFIG ? report.currency : 'USD',
    executiveSummary: report.executiveSummary.trim().slice(0, FIELD_LIMITS.executiveSummary),
    clientLogoDataUrl: (report.clientLogoDataUrl || '').slice(0, FIELD_LIMITS.logoDataUrl),
    isPublished: Boolean(report.isPublished),
    facebook: {
      reach: clampInt(report.facebook.reach),
      engagement: clampInt(report.facebook.engagement),
      visits: clampInt(report.facebook.visits),
      followers: clampInt(report.facebook.followers),
      contentMix: sanitizeContentMix(report.facebook.contentMix),
      topPosts: report.facebook.topPosts
        .slice(0, FIELD_LIMITS.maxTopPosts)
        .map((p, idx) => sanitizeTopPost(p, `fb-post-${idx + 1}`)),
    },
    instagram: {
      reach: clampInt(report.instagram.reach),
      engagement: clampInt(report.instagram.engagement),
      visits: clampInt(report.instagram.visits),
      followers: clampInt(report.instagram.followers),
      contentMix: sanitizeContentMix(report.instagram.contentMix),
      topPosts: report.instagram.topPosts
        .slice(0, FIELD_LIMITS.maxTopPosts)
        .map((p, idx) => sanitizeTopPost(p, `ig-post-${idx + 1}`)),
    },
    tiktok: {
      views: clampInt(report.tiktok.views),
      likes: clampInt(report.tiktok.likes),
      visits: clampInt(report.tiktok.visits),
      newFollowers: clampInt(report.tiktok.newFollowers),
      contentMix: sanitizeContentMix(report.tiktok.contentMix),
      topPosts: report.tiktok.topPosts
        .slice(0, FIELD_LIMITS.maxTopPosts)
        .map((p, idx) => sanitizeTopPost(p, `tt-post-${idx + 1}`)),
    },
    simulatorDefaults: {
      monthlyBudget: clampNonNeg(report.simulatorDefaults.monthlyBudget),
      objective:
        report.simulatorDefaults.objective in OBJECTIVE_CONFIG
          ? report.simulatorDefaults.objective
          : 'awareness',
      fbShare: clampNonNeg(report.simulatorDefaults.fbShare, 100),
      igShare: clampNonNeg(report.simulatorDefaults.igShare, 100),
      ttShare: clampNonNeg(report.simulatorDefaults.ttShare, 100),
      fbCpm: Math.max(0.5, clampNonNeg(report.simulatorDefaults.fbCpm, 1000)),
      igCpm: Math.max(0.5, clampNonNeg(report.simulatorDefaults.igCpm, 1000)),
      ttCpm: Math.max(0.5, clampNonNeg(report.simulatorDefaults.ttCpm, 1000)),
    },
    ownerId: ownerId.slice(0, 128),
  };
}

export function sanitizeAgencySettingsPayload(settings: AgencySettings, ownerId: string) {
  return {
    agencyName: settings.agencyName.trim().slice(0, FIELD_LIMITS.agencyName) || 'Mi Agencia',
    agencyTagline: settings.agencyTagline.trim().slice(0, FIELD_LIMITS.agencyTagline),
    agencyLogoDataUrl: (settings.agencyLogoDataUrl || '').slice(0, FIELD_LIMITS.logoDataUrl),
    ownerId: ownerId.slice(0, 128),
  };
}
