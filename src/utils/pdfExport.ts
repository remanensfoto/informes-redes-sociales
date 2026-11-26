import { jsPDF } from 'jspdf';
import {
  CONTENT_FORMAT_LABELS,
  OBJECTIVE_CONFIG,
  type AgencySettings,
  type ClientReport,
  type ContentMix,
  type TopPost,
} from '../types/report';
import {
  computeConsolidatedMetrics,
  computeContentMixTotal,
  formatCurrency,
  formatNumber,
  type SimulationSummary,
} from './analytics';

interface LoadedImage {
  dataUrl: string;
  format: 'PNG' | 'JPEG';
  width: number;
  height: number;
}

async function loadImageForPdf(src: string): Promise<LoadedImage | null> {
  if (!src) return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        if (!w || !h) {
          resolve(null);
          return;
        }
        const canvas = document.createElement('canvas');
        const maxDim = 900;
        const scale = Math.min(1, maxDim / Math.max(w, h));
        canvas.width = Math.max(1, Math.round(w * scale));
        canvas.height = Math.max(1, Math.round(h * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        const isPng = src.startsWith('data:image/png');
        if (!isPng) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = isPng
          ? canvas.toDataURL('image/png')
          : canvas.toDataURL('image/jpeg', 0.86);
        resolve({
          dataUrl,
          format: isPng ? 'PNG' : 'JPEG',
          width: canvas.width,
          height: canvas.height,
        });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function drawFittedImage(
  pdf: jsPDF,
  img: LoadedImage,
  x: number,
  y: number,
  boxW: number,
  boxH: number,
  align: 'left' | 'right' | 'center' = 'left'
) {
  const ratio = Math.min(boxW / img.width, boxH / img.height);
  const drawW = img.width * ratio;
  const drawH = img.height * ratio;
  let drawX = x;
  if (align === 'right') drawX = x + boxW - drawW;
  if (align === 'center') drawX = x + (boxW - drawW) / 2;
  const drawY = y + (boxH - drawH) / 2;
  pdf.addImage(img.dataUrl, img.format, drawX, drawY, drawW, drawH);
}

function drawPageChrome(
  pdf: jsPDF,
  agency: AgencySettings,
  report: ClientReport,
  pageNumber: number,
  totalPages: number,
  agencyImg: LoadedImage | null,
  clientImg: LoadedImage | null
) {
  // Subtle top rule
  pdf.setDrawColor(226, 232, 240);
  pdf.setLineWidth(0.35);
  pdf.line(16, 22, 281, 22);

  // Top-left agency logo or text
  if (agencyImg) {
    drawFittedImage(pdf, agencyImg, 16, 7, 38, 12, 'left');
  } else {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(15, 23, 42);
    pdf.text(agency.agencyName || 'Pulso Social', 16, 15);
  }

  // Top-right client logo or name
  if (clientImg) {
    drawFittedImage(pdf, clientImg, 243, 7, 38, 12, 'right');
  } else {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9.5);
    pdf.setTextColor(71, 85, 105);
    pdf.text(`${report.clientName} · ${report.period}`, 281, 15, { align: 'right' });
  }

  // Footer
  pdf.setDrawColor(226, 232, 240);
  pdf.line(16, 198, 281, 198);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(100, 116, 139);
  pdf.text(
    `${agency.agencyName || 'Pulso Social'}  ·  Informe de Redes Sociales — ${report.clientName} (${report.period})`,
    16,
    203
  );
  pdf.text(`Página ${pageNumber} de ${totalPages}`, 281, 203, { align: 'right' });
}

function drawKpiRow(
  pdf: jsPDF,
  items: { label: string; value: string; sub?: string }[],
  y: number
) {
  const startX = 16;
  const totalW = 265;
  const gap = 5;
  const cardW = (totalW - gap * (items.length - 1)) / items.length;

  items.forEach((item, idx) => {
    const x = startX + idx * (cardW + gap);
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(x, y, cardW, 25, 2, 2, 'FD');

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(100, 116, 139);
    pdf.text(item.label, x + 5, y + 8);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.setTextColor(15, 23, 42);
    pdf.text(item.value, x + 5, y + 17.5);

    if (item.sub) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.5);
      pdf.setTextColor(71, 85, 105);
      pdf.text(item.sub, x + 5, y + 22.5);
    }
  });
}

async function drawNetworkPage(
  pdf: jsPDF,
  opts: {
    agency: AgencySettings;
    report: ClientReport;
    agencyImg: LoadedImage | null;
    clientImg: LoadedImage | null;
    pageNumber: number;
    totalPages: number;
    networkTitle: string;
    networkSubtitle: string;
    accentRgb: [number, number, number];
    kpis: { label: string; value: string; sub?: string }[];
    contentMix: ContentMix;
    topPosts: TopPost[];
    primaryMetricLabel: string;
    secondaryMetricLabel: string;
  }
) {
  pdf.addPage();
  drawPageChrome(
    pdf,
    opts.agency,
    opts.report,
    opts.pageNumber,
    opts.totalPages,
    opts.agencyImg,
    opts.clientImg
  );

  // Section header
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(19);
  pdf.setTextColor(15, 23, 42);
  pdf.text(opts.networkTitle, 16, 35);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9.5);
  pdf.setTextColor(100, 116, 139);
  pdf.text(opts.networkSubtitle, 16, 41.5);

  // KPI strip
  drawKpiRow(pdf, opts.kpis, 48);

  // Left block: Content Mix published
  const mixY = 82;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(15, 23, 42);
  pdf.text('Contenido publicado por formato', 16, mixY);

  const totalMix = computeContentMixTotal(opts.contentMix);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(100, 116, 139);
  pdf.text(`Total del período: ${totalMix} piezas`, 16, mixY + 5.5);

  const formats: { key: keyof ContentMix; label: string }[] = [
    { key: 'static', label: CONTENT_FORMAT_LABELS.static },
    { key: 'reels', label: CONTENT_FORMAT_LABELS.reels },
    { key: 'covers', label: CONTENT_FORMAT_LABELS.covers },
    { key: 'carousels', label: CONTENT_FORMAT_LABELS.carousels },
  ];

  formats.forEach((fmt, idx) => {
    const rowY = mixY + 15 + idx * 18;
    const count = opts.contentMix[fmt.key] || 0;
    const pct = totalMix > 0 ? Math.round((count / totalMix) * 100) : 0;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(30, 41, 59);
    pdf.text(fmt.label, 16, rowY);

    pdf.setFont('helvetica', 'bold');
    pdf.text(`${count} (${pct}%)`, 96, rowY, { align: 'right' });

    // Bar track
    pdf.setFillColor(241, 245, 249);
    pdf.roundedRect(16, rowY + 3, 80, 4, 1.2, 1.2, 'F');
    if (pct > 0) {
      pdf.setFillColor(...opts.accentRgb);
      pdf.roundedRect(16, rowY + 3, Math.max(2, (80 * pct) / 100), 4, 1.2, 1.2, 'F');
    }
  });

  // Right block: 2 Posts Destacados
  const postsX = 112;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(15, 23, 42);
  pdf.text('Posts destacados (Top 2)', postsX, mixY);

  const posts = opts.topPosts.slice(0, 2);
  const loadedPostImages = await Promise.all(posts.map((p) => loadImageForPdf(p.imageUrl)));

  if (posts.length === 0) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(100, 116, 139);
    pdf.text('Sin publicaciones destacadas registradas en este período.', postsX, mixY + 12);
    return;
  }

  const cardW = 81;
  const cardGap = 7;

  posts.forEach((post, idx) => {
    const cx = postsX + idx * (cardW + cardGap);
    const cy = mixY + 8;
    const cardH = 98;

    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.35);
    pdf.roundedRect(cx, cy, cardW, cardH, 2.5, 2.5, 'FD');

    const img = loadedPostImages[idx];
    if (img) {
      drawFittedImage(pdf, img, cx + 3, cy + 3, cardW - 6, 46, 'center');
    } else {
      pdf.setFillColor(241, 245, 249);
      pdf.roundedRect(cx + 3, cy + 3, cardW - 6, 46, 1.5, 1.5, 'F');
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      pdf.text('Vista previa', cx + cardW / 2, cy + 27, { align: 'center' });
    }

    const fmtLabel = CONTENT_FORMAT_LABELS[post.contentType] || 'Publicación';
    const metaText = post.publishedDate ? `${fmtLabel} · ${post.publishedDate}` : fmtLabel;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(100, 116, 139);
    pdf.text(metaText, cx + 4, cy + 56);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(15, 23, 42);
    const wrappedTitle = pdf.splitTextToSize(post.title || `Destacado ${idx + 1}`, cardW - 8);
    pdf.text(wrappedTitle.slice(0, 2), cx + 4, cy + 62.5);

    // Metrics divider
    pdf.setDrawColor(226, 232, 240);
    pdf.line(cx + 4, cy + 77, cx + cardW - 4, cy + 77);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(100, 116, 139);
    pdf.text(opts.primaryMetricLabel, cx + 4, cy + 83);
    pdf.text(opts.secondaryMetricLabel, cx + cardW / 2 + 2, cy + 83);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(15, 23, 42);
    pdf.text(formatNumber(post.primaryMetric), cx + 4, cy + 91);
    pdf.text(formatNumber(post.secondaryMetric), cx + cardW / 2 + 2, cy + 91);
  });
}

export async function exportPresentationToPdf(
  report: ClientReport,
  agency: AgencySettings,
  simulation: SimulationSummary
): Promise<string> {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const totalPages = 5;

  const [agencyImg, clientImg] = await Promise.all([
    loadImageForPdf(agency.agencyLogoDataUrl),
    loadImageForPdf(report.clientLogoDataUrl),
  ]);

  const consolidated = computeConsolidatedMetrics(report);

  // ==================== PAGE 1: COVER & CONSOLIDATED DASHBOARD ====================
  drawPageChrome(pdf, agency, report, 1, totalPages, agencyImg, clientImg);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(100, 116, 139);
  pdf.text(
    `Informe de Rendimiento Digital  ·  ${report.period}${report.clientIndustry ? `  ·  ${report.clientIndustry}` : ''}`,
    16,
    33
  );

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(22);
  pdf.setTextColor(15, 23, 42);
  pdf.text(report.clientName, 16, 43);

  if (report.executiveSummary) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9.5);
    pdf.setTextColor(71, 85, 105);
    const summaryLines = pdf.splitTextToSize(report.executiveSummary, 265);
    pdf.text(summaryLines.slice(0, 3), 16, 50.5);
  }

  // Consolidated KPI Strip
  drawKpiRow(
    pdf,
    [
      {
        label: 'Exposición total (Alcance + Reprod.)',
        value: formatNumber(consolidated.totalExposure),
        sub: 'Facebook + Instagram + TikTok',
      },
      {
        label: 'Interacciones totales',
        value: formatNumber(consolidated.totalInteractions),
        sub: `Tasa global: ${consolidated.engagementRateOverall}%`,
      },
      {
        label: 'Visitas al perfil',
        value: formatNumber(consolidated.totalVisits),
        sub: 'Suma de las 3 redes',
      },
      {
        label: 'Piezas publicadas',
        value: formatNumber(consolidated.totalContentPieces),
        sub: `${consolidated.contentMixTotals.reels} Reels · ${consolidated.contentMixTotals.carousels} Carruseles`,
      },
    ],
    68
  );

  // Comparative Table per Network
  const tableY = 104;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(15, 23, 42);
  pdf.text('Dashboard Consolidado por Red Social', 16, tableY);

  const cols = [16, 62, 108, 152, 194, 240];
  const headers = ['Red Social', 'Alcance / Reprod.', 'Interacción / Likes', 'Visitas', 'Seguidores / Nuevos', 'Piezas'];
  const headerY = tableY + 8;

  pdf.setFillColor(241, 245, 249);
  pdf.rect(16, headerY - 5, 265, 8, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(51, 65, 85);
  headers.forEach((h, i) => {
    pdf.text(h, cols[i] + 2, headerY);
  });

  consolidated.perNetwork.forEach((row, idx) => {
    const ry = headerY + 11 + idx * 12;
    pdf.setDrawColor(226, 232, 240);
    pdf.line(16, ry + 3.5, 281, ry + 3.5);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9.5);
    pdf.setTextColor(15, 23, 42);
    pdf.text(row.label, cols[0] + 2, ry);

    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(30, 41, 59);
    pdf.text(`${formatNumber(row.exposure)} (${row.exposureSharePct}%)`, cols[1] + 2, ry);
    pdf.text(formatNumber(row.interactions), cols[2] + 2, ry);
    pdf.text(formatNumber(row.visits), cols[3] + 2, ry);
    pdf.text(`${formatNumber(row.audience)} (${row.audienceLabel})`, cols[4] + 2, ry);
    pdf.text(formatNumber(row.contentCount), cols[5] + 2, ry);
  });

  // Consolidated Content Mix strip at bottom
  const mixSummaryY = 160;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10.5);
  pdf.setTextColor(15, 23, 42);
  pdf.text('Distribución total de contenido publicado', 16, mixSummaryY);

  const mixItems: { label: string; value: number }[] = [
    { label: 'Estáticos', value: consolidated.contentMixTotals.static },
    { label: 'Reels / Videos', value: consolidated.contentMixTotals.reels },
    { label: 'Portadas', value: consolidated.contentMixTotals.covers },
    { label: 'Carruseles', value: consolidated.contentMixTotals.carousels },
  ];

  drawKpiRow(
    pdf,
    mixItems.map((m) => ({
      label: m.label,
      value: formatNumber(m.value),
      sub:
        consolidated.totalContentPieces > 0
          ? `${Math.round((m.value / consolidated.totalContentPieces) * 100)}% del total`
          : '0% del total',
    })),
    mixSummaryY + 5
  );

  // ==================== PAGE 2: FACEBOOK ====================
  await drawNetworkPage(pdf, {
    agency,
    report,
    agencyImg,
    clientImg,
    pageNumber: 2,
    totalPages,
    networkTitle: 'Informe Facebook',
    networkSubtitle: `Desempeño orgánico y publicaciones destacadas · ${report.period}`,
    accentRgb: [24, 119, 242],
    kpis: [
      { label: 'Alcance', value: formatNumber(report.facebook.reach) },
      { label: 'Interacción', value: formatNumber(report.facebook.engagement) },
      { label: 'Visitas', value: formatNumber(report.facebook.visits) },
      { label: 'Seguidores', value: formatNumber(report.facebook.followers) },
    ],
    contentMix: report.facebook.contentMix,
    topPosts: report.facebook.topPosts,
    primaryMetricLabel: 'Alcance',
    secondaryMetricLabel: 'Interacción',
  });

  // ==================== PAGE 3: INSTAGRAM ====================
  await drawNetworkPage(pdf, {
    agency,
    report,
    agencyImg,
    clientImg,
    pageNumber: 3,
    totalPages,
    networkTitle: 'Informe Instagram',
    networkSubtitle: `Desempeño orgánico y publicaciones destacadas · ${report.period}`,
    accentRgb: [193, 53, 132],
    kpis: [
      { label: 'Alcance', value: formatNumber(report.instagram.reach) },
      { label: 'Interacción', value: formatNumber(report.instagram.engagement) },
      { label: 'Visitas', value: formatNumber(report.instagram.visits) },
      { label: 'Seguidores', value: formatNumber(report.instagram.followers) },
    ],
    contentMix: report.instagram.contentMix,
    topPosts: report.instagram.topPosts,
    primaryMetricLabel: 'Alcance',
    secondaryMetricLabel: 'Interacción',
  });

  // ==================== PAGE 4: TIKTOK ====================
  await drawNetworkPage(pdf, {
    agency,
    report,
    agencyImg,
    clientImg,
    pageNumber: 4,
    totalPages,
    networkTitle: 'Informe TikTok',
    networkSubtitle: `Reproducciones, comunidad y videos destacados · ${report.period}`,
    accentRgb: [15, 23, 42],
    kpis: [
      { label: 'Reproducciones', value: formatNumber(report.tiktok.views) },
      { label: 'Me gusta', value: formatNumber(report.tiktok.likes) },
      { label: 'Visitas', value: formatNumber(report.tiktok.visits) },
      { label: 'Nuevos seguidores', value: formatNumber(report.tiktok.newFollowers) },
    ],
    contentMix: report.tiktok.contentMix,
    topPosts: report.tiktok.topPosts,
    primaryMetricLabel: 'Reproducciones',
    secondaryMetricLabel: 'Me gusta',
  });

  // ==================== PAGE 5: INVESTMENT SIMULATOR ====================
  pdf.addPage();
  drawPageChrome(pdf, agency, report, 5, totalPages, agencyImg, clientImg);

  const objectiveLabel = OBJECTIVE_CONFIG[simulation.objective]?.label || 'Reconocimiento';
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(19);
  pdf.setTextColor(15, 23, 42);
  pdf.text('Proyección con Inversión en Pauta', 16, 35);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9.5);
  pdf.setTextColor(100, 116, 139);
  pdf.text(
    `Presupuesto mensual simulado: ${formatCurrency(simulation.totalBudgetLocal, simulation.currency)}  ·  Objetivo: ${objectiveLabel}`,
    16,
    41.5
  );

  drawKpiRow(
    pdf,
    [
      {
        label: 'Inversión mensual',
        value: formatCurrency(simulation.totalBudgetLocal, simulation.currency),
        sub: `Objetivo: ${objectiveLabel}`,
      },
      {
        label: 'Alcance pagado estimado',
        value: `+${formatNumber(simulation.totalEstimatedReach)}`,
        sub: `${formatNumber(simulation.totalImpressions)} impresiones est.`,
      },
      {
        label: 'Interacciones estimadas',
        value: `+${formatNumber(simulation.totalEstimatedInteractions)}`,
        sub: `+${formatNumber(simulation.totalEstimatedVisits)} visitas estimadas`,
      },
      {
        label: 'Exposición combinada',
        value: formatNumber(simulation.totalCombinedExposure),
        sub: `+${simulation.overallUpliftPct}% sobre orgánico actual`,
      },
    ],
    48
  );

  const simTableY = 86;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(15, 23, 42);
  pdf.text('Desglose proyectado por red social', 16, simTableY);

  const simCols = [16, 52, 92, 134, 174, 214, 248];
  const simHeaders = [
    'Red',
    'Inversión (%)',
    'Impresiones est.',
    'Alcance est.',
    'Interacciones',
    'Visitas est.',
    'Total (Org+Pauta)',
  ];
  const simHeaderY = simTableY + 9;
  pdf.setFillColor(241, 245, 249);
  pdf.rect(16, simHeaderY - 5, 265, 8, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.2);
  pdf.setTextColor(51, 65, 85);
  simHeaders.forEach((h, i) => {
    pdf.text(h, simCols[i] + 2, simHeaderY);
  });

  simulation.networks.forEach((net, idx) => {
    const ry = simHeaderY + 12 + idx * 14;
    pdf.setDrawColor(226, 232, 240);
    pdf.line(16, ry + 4, 281, ry + 4);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9.5);
    pdf.setTextColor(15, 23, 42);
    pdf.text(net.label, simCols[0] + 2, ry);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.8);
    pdf.setTextColor(30, 41, 59);
    pdf.text(
      `${formatCurrency(net.budgetLocal, simulation.currency)} (${net.sharePct}%)`,
      simCols[1] + 2,
      ry
    );
    pdf.text(formatNumber(net.impressions), simCols[2] + 2, ry);
    pdf.text(`+${formatNumber(net.estimatedReach)}`, simCols[3] + 2, ry);
    pdf.text(`+${formatNumber(net.estimatedInteractions)}`, simCols[4] + 2, ry);
    pdf.text(`+${formatNumber(net.estimatedVisits)}`, simCols[5] + 2, ry);
    pdf.text(formatNumber(net.projectedTotalExposure), simCols[6] + 2, ry);
  });

  // Methodology footnote
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(100, 116, 139);
  pdf.text(
    'Nota: Las estimaciones de alcance pagado se calculan según CPM de referencia por plataforma, frecuencia estimada y objetivo seleccionado. Los resultados reales pueden variar según segmentación y creatividad.',
    16,
    185
  );

  const safeClient = report.clientName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const safePeriod = report.period
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const fileName = `Informe_${safeClient || 'Cliente'}_${safePeriod || 'Redes'}.pdf`;

  pdf.save(fileName);
  return fileName;
}
