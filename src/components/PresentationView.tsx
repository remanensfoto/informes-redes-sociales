import { Calendar, RotateCcw } from 'lucide-react';
import type { AgencySettings, ClientReport } from '../types/report';
import {
  computeConsolidatedMetrics,
  formatMonthKeyLabel,
  formatNumber,
  formatShortDateEs,
  getReportMonthKey,
  sortReportsChronologically,
  type SimulationSummary,
} from '../utils/analytics';
import { ConsolidatedDashboard } from './ConsolidatedDashboard';
import { InvestmentSimulator, type SimulatorState } from './InvestmentSimulator';
import { NetworkReportSection } from './NetworkReportSection';

interface PresentationViewProps {
  agency: AgencySettings;
  clientMeta: {
    clientName: string;
    clientIndustry: string;
    clientLogoDataUrl: string;
  };
  clientReports: ClientReport[];
  report: ClientReport | null;
  matchedIntervalsCount: number;
  selectedMonthKey: string;
  filterFromDate: string;
  filterToDate: string;
  onSelectMonth: (monthKey: string) => void;
  onDateRangeChange: (fromDate: string, toDate: string) => void;
  onResetDateFilter: () => void;
  simulatorState: SimulatorState;
  simulation: SimulationSummary | null;
  onSimulatorChange: (next: SimulatorState) => void;
  onSimulatorReset: () => void;
}

function BrandMonogram({ name }: { name: string }) {
  const initials = (name || 'PS')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');

  return (
    <div
      aria-hidden="true"
      className="h-11 px-3.5 rounded-lg bg-slate-900 text-white font-display font-bold text-sm tracking-tight inline-flex items-center justify-center"
    >
      {initials || 'PS'}
    </div>
  );
}

export function PresentationView({
  agency,
  clientMeta,
  clientReports,
  report,
  matchedIntervalsCount,
  selectedMonthKey,
  filterFromDate,
  filterToDate,
  onSelectMonth,
  onDateRangeChange,
  onResetDateFilter,
  simulatorState,
  simulation,
  onSimulatorChange,
  onSimulatorReset,
}: PresentationViewProps) {
  const sortedClientReports = sortReportsChronologically(clientReports);
  const availableMonths = Array.from(
    new Set(sortedClientReports.map((r) => getReportMonthKey(r)))
  );

  const consolidated = report ? computeConsolidatedMetrics(report) : null;

  const fbEngagementRate =
    report && report.facebook.reach > 0
      ? `${((report.facebook.engagement / report.facebook.reach) * 100).toFixed(1)}% sobre alcance`
      : undefined;
  const igEngagementRate =
    report && report.instagram.reach > 0
      ? `${((report.instagram.engagement / report.instagram.reach) * 100).toFixed(1)}% sobre alcance`
      : undefined;
  const ttLikeRate =
    report && report.tiktok.views > 0
      ? `${((report.tiktok.likes / report.tiktok.views) * 100).toFixed(1)}% sobre reproducciones`
      : undefined;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
      {/* Executive Cover Header */}
      <section id="portada" className="pt-10 pb-10 sm:pt-14 sm:pb-12">
        {/* Dual Logo Lockup: Agency PNG + Client PNG */}
        <div className="flex flex-wrap items-center justify-between gap-6 pb-8 mb-8 border-b border-slate-200">
          <div className="flex items-center gap-4">
            {agency.agencyLogoDataUrl ? (
              <img
                src={agency.agencyLogoDataUrl}
                alt={`Logotipo de ${agency.agencyName}`}
                referrerPolicy="no-referrer"
                className="h-12 w-auto max-w-[180px] object-contain"
              />
            ) : (
              <div className="flex items-center gap-3">
                <BrandMonogram name={agency.agencyName} />
                <div>
                  <p className="font-display text-sm font-bold text-slate-900">
                    {agency.agencyName}
                  </p>
                  {agency.agencyTagline ? (
                    <p className="text-xs text-slate-500">{agency.agencyTagline}</p>
                  ) : null}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-400">Preparado para</span>
            {clientMeta.clientLogoDataUrl ? (
              <img
                src={clientMeta.clientLogoDataUrl}
                alt={`Logotipo de ${clientMeta.clientName}`}
                referrerPolicy="no-referrer"
                className="h-12 w-auto max-w-[180px] object-contain"
              />
            ) : (
              <span className="font-display text-base font-bold text-slate-900">
                {clientMeta.clientName}
              </span>
            )}
          </div>
        </div>

        {/* Client Month Selector & Custom Date Range Filter */}
        <div
          aria-label="Selector de período y fechas"
          className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 mb-10 no-print"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Month quick buttons */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Ver informe por mes</span>
              </div>
              <div
                role="group"
                aria-label="Meses disponibles"
                className="flex flex-wrap items-center gap-1.5"
              >
                {availableMonths.map((monthKey) => {
                  const active = selectedMonthKey === monthKey;
                  return (
                    <button
                      key={monthKey}
                      type="button"
                      onClick={() => onSelectMonth(monthKey)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                        active
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                      }`}
                    >
                      {formatMonthKeyLabel(monthKey)}
                    </button>
                  );
                })}
                {sortedClientReports.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => onSelectMonth('all')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                      selectedMonthKey === 'all'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                    }`}
                  >
                    Todo el historial
                  </button>
                ) : null}
              </div>
            </div>

            {/* Custom date-to-date range */}
            <div className="flex flex-wrap items-end gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
              <div>
                <label
                  htmlFor="client-filter-from"
                  className="block text-[11px] font-medium text-slate-500 mb-1"
                >
                  Desde
                </label>
                <input
                  id="client-filter-from"
                  type="date"
                  value={filterFromDate}
                  onChange={(e) => onDateRangeChange(e.target.value, filterToDate)}
                  className="px-2.5 py-1.5 font-mono text-xs text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                />
              </div>

              <div>
                <label
                  htmlFor="client-filter-to"
                  className="block text-[11px] font-medium text-slate-500 mb-1"
                >
                  Hasta
                </label>
                <input
                  id="client-filter-to"
                  type="date"
                  value={filterToDate}
                  onChange={(e) => onDateRangeChange(filterFromDate, e.target.value)}
                  className="px-2.5 py-1.5 font-mono text-xs text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                />
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span data-testid="active-range-summary">
              {filterFromDate && filterToDate
                ? `Rango activo: ${formatShortDateEs(filterFromDate)} – ${formatShortDateEs(filterToDate)}`
                : 'Selecciona un rango de fechas'}
              {matchedIntervalsCount > 0 ? (
                <>
                  <span aria-hidden="true"> · </span>
                  <span>
                    {matchedIntervalsCount}{' '}
                    {matchedIntervalsCount === 1
                      ? 'informe incluido'
                      : 'informes consolidados'}
                  </span>
                </>
              ) : null}
            </span>

            {selectedMonthKey === 'custom' ? (
              <button
                type="button"
                onClick={onResetDateFilter}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-slate-900 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" aria-hidden="true" />
                <span>Volver al último mes</span>
              </button>
            ) : null}
          </div>
        </div>

        {/* Empty State if custom range has no matching intervals */}
        {!report || !consolidated ? (
          <div
            data-testid="empty-date-range"
            className="bg-white border border-slate-200 rounded-xl p-10 text-center max-w-2xl mx-auto my-8"
          >
            <h1 className="text-xl font-bold text-slate-900 mb-2">
              Sin informes en el rango seleccionado
            </h1>
            <p className="text-sm text-slate-600 mb-6">
              {filterFromDate > filterToDate
                ? 'La fecha inicial no puede ser posterior a la fecha final. Ajusta las fechas o selecciona uno de los meses disponibles.'
                : `No hay estadísticas registradas para ${clientMeta.clientName} entre ${formatShortDateEs(filterFromDate)} y ${formatShortDateEs(filterToDate)}.`}
            </p>
            <button
              type="button"
              onClick={onResetDateFilter}
              className="px-4 py-2.5 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Ver todo el historial disponible
            </button>
          </div>
        ) : (
          <>
            {/* Title & Executive Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
              <div className="lg:col-span-8">
                <p className="text-xs font-medium text-slate-500 mb-3">
                  <span>Informe de Redes Sociales</span>
                  <span aria-hidden="true"> · </span>
                  <span data-testid="active-period-label">{report.period}</span>
                  {report.clientIndustry ? (
                    <>
                      <span aria-hidden="true"> · </span>
                      <span>{report.clientIndustry}</span>
                    </>
                  ) : null}
                </p>
                <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-slate-900 leading-[1.1] mb-4">
                  {report.clientName}
                </h1>
                <p className="text-base text-slate-600 leading-relaxed max-w-2xl">
                  {report.executiveSummary ||
                    'Presentación de resultados en Facebook, Instagram y TikTok, acompañada del consolidado general y el simulador de inversión.'}
                </p>
              </div>

              <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5">
                <p className="text-xs font-medium text-slate-500 mb-3">
                  Panorama rápido del período
                </p>
                <dl className="space-y-2.5 text-sm">
                  <div className="flex items-baseline justify-between">
                    <dt className="text-slate-600">Exposición combinada</dt>
                    <dd
                      data-testid="cover-total-exposure"
                      className="font-mono tabular-nums font-semibold text-slate-900"
                    >
                      {formatNumber(consolidated.totalExposure)}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <dt className="text-slate-600">Interacciones y Me gusta</dt>
                    <dd className="font-mono tabular-nums font-semibold text-slate-900">
                      {formatNumber(consolidated.totalInteractions)}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <dt className="text-slate-600">Visitas totales</dt>
                    <dd className="font-mono tabular-nums font-semibold text-slate-900">
                      {formatNumber(consolidated.totalVisits)}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between pt-2 border-t border-slate-100">
                    <dt className="text-slate-600">Piezas publicadas</dt>
                    <dd className="font-mono tabular-nums font-semibold text-slate-900">
                      {formatNumber(consolidated.totalContentPieces)}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Mobile quick section navigation (non-sticky so mobile sticky height stays minimal) */}
            <nav
              aria-label="Ir a sección"
              className="flex md:hidden items-center gap-2 overflow-x-auto pt-8 -mx-1 px-1"
            >
              {[
                { href: '#facebook', label: 'Facebook' },
                { href: '#instagram', label: 'Instagram' },
                { href: '#tiktok', label: 'TikTok' },
                { href: '#dashboard', label: 'Dashboard' },
                { href: '#simulador', label: 'Simulador' },
              ].map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg whitespace-nowrap shrink-0 hover:bg-slate-50"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </>
        )}
      </section>

      {report && simulation ? (
        <>
          {/* 01. Facebook Report */}
          <NetworkReportSection
            id="facebook"
            sectionIndex="01"
            networkName="Facebook"
            period={report.period}
            accentHex="#1877F2"
            kpis={[
              { label: 'Alcance', value: report.facebook.reach },
              {
                label: 'Interacción',
                value: report.facebook.engagement,
                helper: fbEngagementRate,
              },
              { label: 'Visitas', value: report.facebook.visits },
              { label: 'Seguidores', value: report.facebook.followers },
            ]}
            contentMix={report.facebook.contentMix}
            topPosts={report.facebook.topPosts}
            primaryPostMetricLabel="Alcance"
            secondaryPostMetricLabel="Interacción"
          />

          {/* 02. Instagram Report */}
          <NetworkReportSection
            id="instagram"
            sectionIndex="02"
            networkName="Instagram"
            period={report.period}
            accentHex="#C13584"
            kpis={[
              { label: 'Alcance', value: report.instagram.reach },
              {
                label: 'Interacción',
                value: report.instagram.engagement,
                helper: igEngagementRate,
              },
              { label: 'Visitas', value: report.instagram.visits },
              { label: 'Seguidores', value: report.instagram.followers },
            ]}
            contentMix={report.instagram.contentMix}
            topPosts={report.instagram.topPosts}
            primaryPostMetricLabel="Alcance"
            secondaryPostMetricLabel="Interacción"
          />

          {/* 03. TikTok Report */}
          <NetworkReportSection
            id="tiktok"
            sectionIndex="03"
            networkName="TikTok"
            period={report.period}
            accentHex="#0F172A"
            kpis={[
              { label: 'Reproducciones', value: report.tiktok.views },
              {
                label: 'Me gusta',
                value: report.tiktok.likes,
                helper: ttLikeRate,
              },
              { label: 'Visitas', value: report.tiktok.visits },
              { label: 'Nuevos seguidores', value: report.tiktok.newFollowers },
            ]}
            contentMix={report.tiktok.contentMix}
            topPosts={report.tiktok.topPosts}
            primaryPostMetricLabel="Reproducciones"
            secondaryPostMetricLabel="Me gusta"
          />

          {/* 04. Consolidated Final Dashboard */}
          <ConsolidatedDashboard report={report} />

          {/* 05. Paid Media Investment Simulator */}
          <InvestmentSimulator
            state={simulatorState}
            simulation={simulation}
            onChange={onSimulatorChange}
            onReset={onSimulatorReset}
          />
        </>
      ) : null}

      {/* Quiet Editorial Footer */}
      <footer className="pt-10 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <span>
          {agency.agencyName} · Informe preparado para {clientMeta.clientName}
        </span>
        <span>{report ? report.period : `${filterFromDate} – ${filterToDate}`}</span>
      </footer>
    </main>
  );
}
