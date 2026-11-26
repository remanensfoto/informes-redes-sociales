import { useState } from 'react';
import { ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  CURRENCY_CONFIG,
  OBJECTIVE_CONFIG,
  type CampaignObjective,
  type CurrencyCode,
} from '../types/report';
import {
  formatCompact,
  formatCurrency,
  formatNumber,
  type SimulationSummary,
} from '../utils/analytics';

export interface SimulatorState {
  monthlyBudget: number;
  currency: CurrencyCode;
  objective: CampaignObjective;
  fbShare: number;
  igShare: number;
  ttShare: number;
  fbCpm: number;
  igCpm: number;
  ttCpm: number;
}

interface InvestmentSimulatorProps {
  state: SimulatorState;
  simulation: SimulationSummary;
  onChange: (next: SimulatorState) => void;
  onReset: () => void;
}

const ALLOCATION_PRESETS = [
  { label: 'Equilibrado', fb: 34, ig: 33, tt: 33 },
  { label: 'Prioridad Instagram', fb: 25, ig: 50, tt: 25 },
  { label: 'Impulso TikTok', fb: 20, ig: 30, tt: 50 },
];

export function InvestmentSimulator({
  state,
  simulation,
  onChange,
  onReset,
}: InvestmentSimulatorProps) {
  const [showCpmSettings, setShowCpmSettings] = useState(false);
  const currencyMeta = CURRENCY_CONFIG[state.currency] ?? CURRENCY_CONFIG.USD;

  const comparisonData = simulation.networks.map((net) => ({
    name: net.label,
    'Orgánico actual': net.organicBaseline,
    'Alcance pagado est.': net.estimatedReach,
  }));

  const update = (patch: Partial<SimulatorState>) => {
    onChange({ ...state, ...patch });
  };

  return (
    <section
      id="simulador"
      aria-labelledby="simulador-heading"
      className="scroll-mt-24 py-12 sm:py-16 border-t border-slate-200"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1.5">
            05 · Proyección de crecimiento · Pauta digital
          </p>
          <h2
            id="simulador-heading"
            className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900"
          >
            Simulador de Inversión por Red
          </h2>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors self-start sm:self-auto cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Restablecer escenario</span>
        </button>
      </div>

      {/* Main Split: Controls (5 cols) + Results Summary & Chart (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-8">
        {/* Controls Panel */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          {/* Budget & Currency */}
          <div>
            <div className="flex items-center justify-between gap-3 mb-2">
              <label
                htmlFor="sim-budget-number"
                className="text-sm font-semibold text-slate-900"
              >
                Presupuesto mensual
              </label>
              <select
                aria-label="Moneda del simulador"
                value={state.currency}
                onChange={(e) => {
                  const nextCurrency = e.target.value as CurrencyCode;
                  const nextMeta = CURRENCY_CONFIG[nextCurrency];
                  update({
                    currency: nextCurrency,
                    monthlyBudget: nextMeta.defaultBudget,
                  });
                }}
                className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              >
                {(Object.keys(CURRENCY_CONFIG) as CurrencyCode[]).map((code) => (
                  <option key={code} value={code}>
                    {CURRENCY_CONFIG[code].label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 mb-3">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-slate-500">
                  {currencyMeta.symbol}
                </span>
                <input
                  id="sim-budget-number"
                  type="number"
                  min={0}
                  step={currencyMeta.step}
                  value={state.monthlyBudget}
                  onChange={(e) =>
                    update({ monthlyBudget: Math.max(0, Number(e.target.value) || 0) })
                  }
                  className="w-full pl-8 pr-14 py-2.5 font-mono tabular-nums text-base font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
                  {state.currency}
                </span>
              </div>
            </div>

            <input
              aria-label="Deslizador de presupuesto mensual"
              type="range"
              min={0}
              max={currencyMeta.maxBudget}
              step={currencyMeta.step}
              value={Math.min(state.monthlyBudget, currencyMeta.maxBudget)}
              onChange={(e) => update({ monthlyBudget: Number(e.target.value) })}
              className="w-full accent-slate-900 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] font-mono tabular-nums text-slate-400 mt-1">
              <span>{formatCurrency(0, state.currency)}</span>
              <span>{formatCurrency(currencyMeta.maxBudget, state.currency)}</span>
            </div>
          </div>

          {/* Objective Segmented Selector */}
          <div className="pt-5 border-t border-slate-100">
            <p className="text-sm font-semibold text-slate-900 mb-2">
              Objetivo de campaña
            </p>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-lg">
              {(Object.keys(OBJECTIVE_CONFIG) as CampaignObjective[]).map((objKey) => {
                const active = state.objective === objKey;
                return (
                  <button
                    key={objKey}
                    type="button"
                    onClick={() => update({ objective: objKey })}
                    className={`px-2.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                      active
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {OBJECTIVE_CONFIG[objKey].label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {OBJECTIVE_CONFIG[state.objective].description}
            </p>
          </div>

          {/* Budget Allocation Across 3 Networks */}
          <div className="pt-5 border-t border-slate-100">
            <div className="mb-3.5 space-y-2">
              <p className="text-sm font-semibold text-slate-900">
                Distribución por red
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                {ALLOCATION_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() =>
                      update({ fbShare: preset.fb, igShare: preset.ig, ttShare: preset.tt })
                    }
                    className="px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {[
                {
                  id: 'sim-share-fb',
                  label: 'Facebook',
                  rawValue: state.fbShare,
                  normalized: simulation.networks[0].sharePct,
                  color: '#1877F2',
                  field: 'fbShare' as const,
                },
                {
                  id: 'sim-share-ig',
                  label: 'Instagram',
                  rawValue: state.igShare,
                  normalized: simulation.networks[1].sharePct,
                  color: '#C13584',
                  field: 'igShare' as const,
                },
                {
                  id: 'sim-share-tt',
                  label: 'TikTok',
                  rawValue: state.ttShare,
                  normalized: simulation.networks[2].sharePct,
                  color: '#0F172A',
                  field: 'ttShare' as const,
                },
              ].map((item) => (
                <div key={item.id}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <label htmlFor={item.id} className="font-medium text-slate-700">
                      {item.label}
                    </label>
                    <span className="font-mono tabular-nums text-slate-900 font-medium">
                      {item.normalized}%
                    </span>
                  </div>
                  <input
                    id={item.id}
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={item.rawValue}
                    onChange={(e) => update({ [item.field]: Number(e.target.value) })}
                    className="w-full cursor-pointer"
                    style={{ accentColor: item.color }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Optional CPM Calibration Disclosure */}
          <div className="pt-4 border-t border-slate-100">
            <button
              type="button"
              aria-expanded={showCpmSettings}
              onClick={() => setShowCpmSettings((v) => !v)}
              className="w-full flex items-center justify-between text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              <span>Calibrar CPM de referencia (USD)</span>
              {showCpmSettings ? (
                <ChevronUp className="w-4 h-4" aria-hidden="true" />
              ) : (
                <ChevronDown className="w-4 h-4" aria-hidden="true" />
              )}
            </button>

            {showCpmSettings && (
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div>
                  <label htmlFor="cpm-fb" className="block text-[11px] text-slate-500 mb-1">
                    CPM Facebook
                  </label>
                  <input
                    id="cpm-fb"
                    type="number"
                    min={0.5}
                    step={0.2}
                    value={state.fbCpm}
                    onChange={(e) => update({ fbCpm: Math.max(0.5, Number(e.target.value) || 0.5) })}
                    className="w-full px-2.5 py-1.5 font-mono text-xs border border-slate-200 rounded-md"
                  />
                </div>
                <div>
                  <label htmlFor="cpm-ig" className="block text-[11px] text-slate-500 mb-1">
                    CPM Instagram
                  </label>
                  <input
                    id="cpm-ig"
                    type="number"
                    min={0.5}
                    step={0.2}
                    value={state.igCpm}
                    onChange={(e) => update({ igCpm: Math.max(0.5, Number(e.target.value) || 0.5) })}
                    className="w-full px-2.5 py-1.5 font-mono text-xs border border-slate-200 rounded-md"
                  />
                </div>
                <div>
                  <label htmlFor="cpm-tt" className="block text-[11px] text-slate-500 mb-1">
                    CPM TikTok
                  </label>
                  <input
                    id="cpm-tt"
                    type="number"
                    min={0.5}
                    step={0.2}
                    value={state.ttCpm}
                    onChange={(e) => update({ ttCpm: Math.max(0.5, Number(e.target.value) || 0.5) })}
                    className="w-full px-2.5 py-1.5 font-mono text-xs border border-slate-200 rounded-md"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Projected KPIs + Chart */}
        <div className="lg:col-span-7 space-y-6">
          {/* Projected Aggregate Strip */}
          <div className="bg-slate-900 text-white rounded-xl p-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <p className="text-xs text-slate-300 mb-1.5">Alcance pagado adicional</p>
              <p
                data-testid="sim-total-reach"
                className="font-mono tabular-nums text-2xl sm:text-3xl font-semibold text-white"
              >
                +{formatNumber(simulation.totalEstimatedReach)}
              </p>
              <p className="text-xs text-slate-400 mt-1 tabular-nums">
                {formatNumber(simulation.totalImpressions)} impresiones est.
              </p>
            </div>
            <div className="sm:border-l sm:border-slate-800 sm:pl-6">
              <p className="text-xs text-slate-300 mb-1.5">Interacciones y visitas est.</p>
              <p className="font-mono tabular-nums text-2xl sm:text-3xl font-semibold text-white">
                +{formatNumber(simulation.totalEstimatedInteractions)}
              </p>
              <p className="text-xs text-slate-400 mt-1 tabular-nums">
                +{formatNumber(simulation.totalEstimatedVisits)} visitas al perfil
              </p>
            </div>
            <div className="sm:border-l sm:border-slate-800 sm:pl-6">
              <p className="text-xs text-slate-300 mb-1.5">Exposición combinada</p>
              <p className="font-mono tabular-nums text-2xl sm:text-3xl font-semibold text-white">
                {formatNumber(simulation.totalCombinedExposure)}
              </p>
              <p className="text-xs text-emerald-400 mt-1 tabular-nums">
                +{simulation.overallUpliftPct}% sobre orgánico actual
              </p>
            </div>
          </div>

          {/* Organic vs Paid Stacked Chart */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h3 className="text-base font-semibold text-slate-900 mb-1">
              Orgánico actual vs. Alcance proyectado con pauta
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Impacto estimado por red social con una inversión de{' '}
              <span className="font-mono font-medium text-slate-800">
                {formatCurrency(simulation.totalBudgetLocal, simulation.currency)}
              </span>
            </p>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={comparisonData}
                  margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
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
                    formatter={(value: unknown, name: unknown) => [
                      formatNumber(Number(value)),
                      String(name),
                    ]}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#E2E8F0',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                  <Bar
                    dataKey="Orgánico actual"
                    stackId="a"
                    fill="#CBD5E1"
                    radius={[0, 0, 0, 0]}
                    maxBarSize={68}
                  />
                  <Bar
                    dataKey="Alcance pagado est."
                    stackId="a"
                    fill="#2563EB"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={68}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Per-Network Breakdown Cards */}
      <div className="bg-white border border-slate-200 rounded-xl grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200">
        {simulation.networks.map((net) => (
          <div key={net.key} className="p-6">
            <div className="flex items-baseline justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-900">{net.label}</h3>
              <span className="font-mono tabular-nums text-xs text-slate-500">
                {formatCurrency(net.budgetLocal, simulation.currency)} ({net.sharePct}%)
              </span>
            </div>

            <div className="mb-4">
              <p className="text-xs text-slate-500 mb-1">Alcance pagado estimado</p>
              <p className="font-mono tabular-nums text-2xl font-semibold text-slate-900">
                +{formatNumber(net.estimatedReach)}
              </p>
              <p className="text-xs text-emerald-700 font-medium mt-1 tabular-nums">
                +{net.upliftPct}% incremento vs. orgánico
              </p>
            </div>

            <dl className="pt-4 border-t border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between">
                <dt className="text-slate-500">Impresiones est.</dt>
                <dd className="font-mono tabular-nums text-slate-800">
                  {formatNumber(net.impressions)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Interacciones est.</dt>
                <dd className="font-mono tabular-nums text-slate-800">
                  +{formatNumber(net.estimatedInteractions)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Visitas al perfil est.</dt>
                <dd className="font-mono tabular-nums text-slate-800">
                  +{formatNumber(net.estimatedVisits)}
                </dd>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-100">
                <dt className="font-medium text-slate-700">Total combinado</dt>
                <dd className="font-mono tabular-nums font-semibold text-slate-900">
                  {formatNumber(net.projectedTotalExposure)}
                </dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}
