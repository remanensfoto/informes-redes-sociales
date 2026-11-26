import test from 'node:test';
import assert from 'node:assert/strict';
import {
  aggregateReportsForRange,
  computeConsolidatedMetrics,
  computeContentMixTotal,
  filterReportsByDateRange,
  formatIntervalLabel,
  normalizeShares,
  sanitizeReportPayload,
  simulatePaidMedia,
  validateClientReport,
} from './analytics';
import type { ClientReport } from '../types/report';

const sampleReport: ClientReport = {
  id: 'cafe-origen-nov',
  clientKey: 'cafe-origen',
  clientName: 'Café Origen',
  clientIndustry: 'Cafetería de especialidad',
  startDate: '2026-11-01',
  endDate: '2026-11-30',
  period: 'Noviembre 2026',
  currency: 'USD',
  executiveSummary: 'Crecimiento sostenido en Reels y TikTok.',
  clientLogoDataUrl: '',
  isPublished: true,
  facebook: {
    reach: 40000,
    engagement: 2000,
    visits: 1500,
    followers: 8200,
    contentMix: { static: 6, reels: 4, covers: 2, carousels: 3 },
    topPosts: [
      {
        id: 'fb-1',
        title: 'Post Nov 1',
        contentType: 'reels',
        primaryMetric: 12000,
        secondaryMetric: 800,
        imageUrl: '',
        postUrl: '',
        publishedDate: '12 Nov',
      },
    ],
  },
  instagram: {
    reach: 60000,
    engagement: 4500,
    visits: 3200,
    followers: 14500,
    contentMix: { static: 4, reels: 8, covers: 2, carousels: 6 },
    topPosts: [],
  },
  tiktok: {
    views: 100000,
    likes: 8500,
    visits: 2300,
    newFollowers: 1300,
    contentMix: { static: 0, reels: 12, covers: 1, carousels: 2 },
    topPosts: [],
  },
  simulatorDefaults: {
    monthlyBudget: 1000,
    objective: 'awareness',
    fbShare: 30,
    igShare: 40,
    ttShare: 30,
    fbCpm: 3.5,
    igCpm: 4.5,
    ttCpm: 2.5,
  },
};

const octoberReport: ClientReport = {
  ...sampleReport,
  id: 'cafe-origen-oct',
  startDate: '2026-10-01',
  endDate: '2026-10-31',
  period: 'Octubre 2026',
  facebook: {
    ...sampleReport.facebook,
    reach: 30000,
    engagement: 1500,
    visits: 1000,
    followers: 7900,
    contentMix: { static: 5, reels: 3, covers: 1, carousels: 2 },
    topPosts: [
      {
        id: 'fb-oct-1',
        title: 'Post Oct Viral',
        contentType: 'reels',
        primaryMetric: 18000,
        secondaryMetric: 1200,
        imageUrl: '',
        postUrl: '',
        publishedDate: '15 Oct',
      },
      {
        id: 'fb-oct-2',
        title: 'Post Oct Menor',
        contentType: 'static',
        primaryMetric: 5000,
        secondaryMetric: 300,
        imageUrl: '',
        postUrl: '',
        publishedDate: '04 Oct',
      },
    ],
  },
  instagram: {
    ...sampleReport.instagram,
    reach: 50000,
    engagement: 3500,
    visits: 2200,
    followers: 13900,
  },
  tiktok: {
    ...sampleReport.tiktok,
    views: 80000,
    likes: 6500,
    visits: 1700,
    newFollowers: 900,
  },
};

test('computeContentMixTotal sums all four content types accurately', () => {
  assert.equal(computeContentMixTotal({ static: 6, reels: 4, covers: 2, carousels: 3 }), 15);
  assert.equal(computeContentMixTotal({ static: -2, reels: 5, covers: 0, carousels: 1 }), 6);
});

test('computeConsolidatedMetrics aggregates all three platforms accurately', () => {
  const result = computeConsolidatedMetrics(sampleReport);
  assert.equal(result.totalExposure, 200000);
  assert.equal(result.totalInteractions, 15000);
  assert.equal(result.totalVisits, 7000);
  assert.equal(result.totalFollowersAudience, 24000);
  assert.equal(result.tiktokNewFollowers, 1300);
  assert.equal(result.totalContentPieces, 50);
  assert.deepEqual(result.contentMixTotals, {
    static: 10,
    reels: 24,
    covers: 5,
    carousels: 11,
  });
  assert.equal(result.engagementRateOverall, 7.5);
});

test('normalizeShares always totals 100%', () => {
  const norm = normalizeShares(1, 2, 1);
  assert.equal(norm.fb, 25);
  assert.equal(norm.ig, 50);
  assert.equal(norm.tt, 25);

  const fallback = normalizeShares(0, 0, 0);
  assert.equal(fallback.fb + fallback.ig + fallback.tt, 100);
});

test('simulatePaidMedia scales reach linearly with budget and reflects objective multipliers', () => {
  const base = simulatePaidMedia({
    monthlyBudget: 500,
    currency: 'USD',
    objective: 'awareness',
    fbShare: 30,
    igShare: 40,
    ttShare: 30,
    fbCpm: 3.5,
    igCpm: 4.5,
    ttCpm: 2.5,
    organicBaseline: { facebook: 40000, instagram: 60000, tiktok: 100000 },
  });

  const doubled = simulatePaidMedia({
    monthlyBudget: 1000,
    currency: 'USD',
    objective: 'awareness',
    fbShare: 30,
    igShare: 40,
    ttShare: 30,
    fbCpm: 3.5,
    igCpm: 4.5,
    ttCpm: 2.5,
    organicBaseline: { facebook: 40000, instagram: 60000, tiktok: 100000 },
  });

  assert.ok(base.totalEstimatedReach > 0);
  assert.ok(Math.abs(doubled.totalEstimatedReach - base.totalEstimatedReach * 2) <= 3);
  assert.equal(base.totalCombinedExposure, base.totalOrganicExposure + base.totalEstimatedReach);
});

test('formatIntervalLabel formats full months and custom date intervals cleanly', () => {
  assert.equal(formatIntervalLabel('2026-11-01', '2026-11-30'), 'Noviembre 2026');
  assert.equal(formatIntervalLabel('2026-10-01', '2026-10-31'), 'Octubre 2026');
  assert.equal(formatIntervalLabel('2026-11-01', '2026-11-15'), '01 Nov – 15 Nov 2026');
  assert.equal(formatIntervalLabel('2025-12-15', '2026-01-15'), '15 Dic 2025 – 15 Ene 2026');
});

test('filterReportsByDateRange filters overlapping intervals and rejects inverted ranges', () => {
  const all = [sampleReport, octoberReport];
  const onlyOct = filterReportsByDateRange(all, '2026-10-01', '2026-10-31');
  assert.equal(onlyOct.length, 1);
  assert.equal(onlyOct[0].id, 'cafe-origen-oct');

  const both = filterReportsByDateRange(all, '2026-10-15', '2026-11-10');
  assert.equal(both.length, 2);
  assert.equal(both[0].id, 'cafe-origen-oct');
  assert.equal(both[1].id, 'cafe-origen-nov');

  const empty = filterReportsByDateRange(all, '2026-12-01', '2026-10-01');
  assert.equal(empty.length, 0);
});

test('aggregateReportsForRange sums additive metrics, keeps latest followers snapshot, and selects top 2 posts', () => {
  const aggregated = aggregateReportsForRange([sampleReport, octoberReport], {
    fromDate: '2026-10-01',
    toDate: '2026-11-30',
  });
  assert.ok(aggregated);
  // Additive reach/engagement/visits
  assert.equal(aggregated.facebook.reach, 70000);
  assert.equal(aggregated.facebook.engagement, 3500);
  assert.equal(aggregated.facebook.visits, 2500);
  // Latest snapshot for followers (November 8200, NOT 8200+7900)
  assert.equal(aggregated.facebook.followers, 8200);
  assert.equal(aggregated.instagram.followers, 14500);
  // Additive TikTok new followers (1300 + 900)
  assert.equal(aggregated.tiktok.newFollowers, 2200);
  // Content mix summed
  assert.deepEqual(aggregated.facebook.contentMix, {
    static: 11,
    reels: 7,
    covers: 3,
    carousels: 5,
  });
  // Top 2 posts ordered by primaryMetric descending
  assert.equal(aggregated.facebook.topPosts.length, 2);
  assert.equal(aggregated.facebook.topPosts[0].title, 'Post Oct Viral');
  assert.equal(aggregated.facebook.topPosts[1].title, 'Post Nov 1');
});

test('validateClientReport catches invalid or inverted dates and sanitizeReportPayload enforces bounds', () => {
  const invalid: ClientReport = {
    ...sampleReport,
    clientName: '   ',
    period: '',
    startDate: '2026-11-20',
    endDate: '2026-11-05',
  };
  const errors = validateClientReport(invalid);
  assert.ok(errors.some((e) => e.includes('nombre del cliente')));
  assert.ok(errors.some((e) => e.includes('fecha de inicio no puede ser posterior')));

  const sanitized = sanitizeReportPayload(
    {
      ...sampleReport,
      startDate: '2026-11-20',
      endDate: '2026-11-05',
      facebook: { ...sampleReport.facebook, reach: -50 },
    },
    'owner-uid-123'
  );
  assert.equal(sanitized.facebook.reach, 0);
  assert.equal(sanitized.endDate, '2026-11-20');
  assert.equal(sanitized.clientKey, 'cafe-origen');
});
