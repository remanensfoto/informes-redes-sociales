import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CONTENT_FORMAT_LABELS, type ClientReport } from '../types/report';
import {
  computeConsolidatedMetrics,
  formatCompact,
  formatNumber,
} from '../utils/analytics';

interface ConsolidatedDashboardProps {
  report: ClientReport;
}

const NETWORK_COLORS: Record<string, string> = {
  facebook: '#1877F2',
  instagram: '#C13584',
  tiktok: '#0F172A',
};

export function ConsolidatedDashboard({ report }: ConsolidatedDashboardProps) {
  const metrics = computeConsolidatedMetrics(report);

  const exposureChartData = metrics.perNetwork.map((net) => ({
    name: net.label,
    key: net.key,
    exposicion: net.exposure,
    interacciones: net.interactions,
    visitas: net.visits,
  }));

  const formatRows = [
    { label: CONTENT_FORMAT_LABELS.static, count: metrics.contentMixTotals.static },
    { label: CONTENT_FORMAT_LABELS.reels, count: metrics.contentMixTotals.reels },
    { label: CONTENT_FORMAT_LABELS.covers, count: metrics.contentMixTotals.covers },
    { label: CONTENT_FORMAT_LABELS.carousels, count: metrics.contentMixTotals.carousels },
  ];

  return (
    <section
      id="dashboard"
      aria-labelledby="dashboard-heading"
      className="scroll-mt-24 py-12 sm:py-16 border-t border-slate-200"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1.5">
            04 · Resumen global · {report.period}
          </p>
          <h2
            id="dashboard-heading"
            className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900"
          >
            Dashboard Final Consolidado
          </h2>
        </div>
        <p className="text-sm text-slate-600 tabular-nums">
          Tasa de interacción global: <span className="font-mono font-semibold text-slate-900">{metrics.engagementRateOverall}%</span>
        </p>
      </div>

      {/* Unified Top KPIs */}
      <div className="bg-white border border-slate-200 rounded-xl grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 mb-8">
        <div className="p-5 sm:p-6">
          <p className="text-xs font-medium text-slate-500 mb-2">
            Exposición total
          </p>
          <p className="font-mono tabular-nums text-2xl sm:text-3xl font-semibold text-slate-900">
            {formatNumber(metrics.totalExposure)}
          </p>
          <p className="text-xs text-slate-500 mt-1.5">Alcance FB/IG + Reprod. TikTok</p>
        </div>

        <div className="p-5 sm:p-6 border-l lg:border-l-0 border-slate-200">
          <p className="text-xs font-medium text-slate-500 mb-2">
            Interacciones totales
          </p>
          <p className="font-mono tabular-nums text-2xl sm:text-3xl font-semibold text-slate-900">
            {formatNumber(metrics.totalInteractions)}
          </p>
          <p className="text-xs text-slate-500 mt-1.5">Interacciones + Me gusta</p>
        </div>

        <div className="p-5 sm:p-6">
          <p className="text-xs font-medium text-slate-500 mb-2">
            Visitas totales
          </p>
          <p className="font-mono tabular-nums text-2xl sm:text-3xl font-semibold text-slate-900">
            {formatNumber(metrics.totalVisits)}
          </p>
          <p className="text-xs text-slate-500 mt-1.5">Tráfico a perfiles en 3 redes</p>
        </div>

        <div className="p-5 sm:p-6 border-l lg:border-l-0 border-slate-200">
          <p className="text-xs font-medium text-slate-500 mb-2">
            Contenido publicado
          </p>
          <p className="font-mono tabular-nums text-2xl sm:text-3xl font-semibold text-slate-900">
            {formatNumber(metrics.totalContentPieces)}
          </p>
          <p className="text-xs text-slate-500 mt-1.5">Piezas totales en el mes</p>
        </div>
      </div>

      {/* Charts + Comparative Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
        {/* Comparative Bar Chart */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-baseline justify-between mb-6">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Comparativa de exposición por red
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Alcance en Facebook e Instagram frente a reproducciones en TikTok
              </p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={exposureChartData}
                margin={{ top: 10, right: 16, left: 0, bottom: 8 }}
                barCategoryGap="28%"
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#334155', fontSize: 13, fontWeight: 500 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatCompact(Number(v))}
                  tick={{ fill: '#64748B', fontSize: 12 }}
                  width={54}
                />
                <Tooltip
                  cursor={{ fill: '#F8FAFC' }}
                  formatter={(value: unknown) => [formatNumber(Number(value)), 'Exposición']}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E2E8F0',
                    borderRadius: '8px',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
                  }}
                />
                <Bar dataKey="exposicion" radius={[6, 6, 0, 0]} maxBarSize={72}>
                  {exposureChartData.map((entry) => (
                    <Cell
                      key={entry.key}
                      fill={NETWORK_COLORS[entry.key] || '#0F172A'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Consolidated Content Mix */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900 mb-1">
              Producción total por formato
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Suma de piezas publicadas en Facebook, Instagram y TikTok
            </p>

            <div className="space-y-5">
              {formatRows.map((row) => {
                const pct =
                  metrics.totalContentPieces > 0
                    ? Math.round((row.count / metrics.totalContentPieces) * 100)
                    : 0;
                return (
                  <div key={row.label}>
                    <div className="flex items-baseline justify-between text-sm mb-1.5">
                      <span className="font-medium text-slate-700">{row.label}</span>
                      <span className="font-mono tabular-nums text-slate-900 font-medium">
                        {formatNumber(row.count)}{' '}
                        <span className="text-xs text-slate-500 font-normal">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-slate-900 rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-5 mt-6 border-t border-slate-100 flex items-center justify-between text-sm">
            <span className="text-slate-500">Comunidad + nuevos seguidores</span>
            <span className="font-mono tabular-nums font-semibold text-slate-900">
              {formatNumber(metrics.totalFollowersAudience)}
            </span>
          </div>
        </div>
      </div>

      {/* High-density Comparative Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">
            Tabla comparativa por plataforma
          </h3>
          <span className="text-xs text-slate-500">Cifras consolidadas del período</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                <th className="py-3 px-6">Red social</th>
                <th className="py-3 px-4 text-right">Alcance / Reprod.</th>
                <th className="py-3 px-4 text-right">Cuota</th>
                <th className="py-3 px-4 text-right">Interacción / Likes</th>
                <th className="py-3 px-4 text-right">Visitas</th>
                <th className="py-3 px-4 text-right">Seguidores / Nuevos</th>
                <th className="py-3 px-6 text-right">Piezas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {metrics.perNetwork.map((row) => (
                <tr key={row.key} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-6 font-semibold text-slate-900 whitespace-nowrap">
                    {row.label}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-900 whitespace-nowrap">
                    {formatNumber(row.exposure)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-600 whitespace-nowrap">
                    {row.exposureSharePct}%
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-900 whitespace-nowrap">
                    {formatNumber(row.interactions)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-900 whitespace-nowrap">
                    {formatNumber(row.visits)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-900 whitespace-nowrap">
                    {formatNumber(row.audience)}{' '}
                    <span className="font-sans text-xs text-slate-500">
                      ({row.audienceLabel === 'Nuevos seguidores' ? 'nuevos' : 'total'})
                    </span>
                  </td>
                  <td className="py-3.5 px-6 text-right font-mono tabular-nums text-slate-900 whitespace-nowrap">
                    {formatNumber(row.contentCount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Executive Summary */}
      {report.executiveSummary ? (
        <div className="mt-8 bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
          <h3 className="text-sm font-semibold text-slate-900 mb-2">
            Conclusiones ejecutivas del período
          </h3>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-4xl">
            {report.executiveSummary}
          </p>
        </div>
      ) : null}
    </section>
  );
}
