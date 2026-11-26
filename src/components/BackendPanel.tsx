import { useState } from 'react';
import {
  CalendarPlus,
  Check,
  Copy,
  Eye,
  Lock,
  LogOut,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import {
  CURRENCY_CONFIG,
  FIELD_LIMITS,
  type AgencySettings,
  type ClientReport,
  type CurrencyCode,
} from '../types/report';
import {
  formatIntervalLabel,
  formatShortDateEs,
  getLastDayOfMonth,
  getMonthBounds,
  parseIsoDateParts,
  slugifyClientKey,
  sortReportsChronologically,
} from '../utils/analytics';
import { compressLogoPng } from '../utils/imageUpload';
import { ADMIN_EMAIL } from '../services/firebase';
import type { AdminTab } from './TopBar';
import { NetworkEditorForm } from './NetworkEditorForm';

interface BackendPanelProps {
  user: User | null;
  isAdmin: boolean;
  isDemoAdmin: boolean;
  authLoading: boolean;
  onSignInGoogle: () => void;
  onSignOut: () => void;
  onEnterDemoAdmin: () => void;
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  agency: AgencySettings;
  onAgencyChange: (next: AgencySettings) => void;
  reports: ClientReport[];
  activeReport: ClientReport;
  onSelectReport: (id: string) => void;
  onReportChange: (next: ClientReport) => void;
  onCreateNewClient: () => void;
  onCreateNewIntervalForClient: () => void;
  onDuplicateReport: () => void;
  onDeleteReport: (id: string) => void;
  onPreviewPresentation: () => void;
  onSaveAll: () => void;
  isSaving: boolean;
  saveFeedback: { type: 'success' | 'error'; text: string } | null;
}

const MOBILE_TABS: { id: AdminTab; label: string }[] = [
  { id: 'identity', label: 'Identidad' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'share', label: 'Google Sites' },
];

export function BackendPanel({
  user,
  isAdmin,
  isDemoAdmin,
  authLoading,
  onSignInGoogle,
  onSignOut,
  onEnterDemoAdmin,
  activeTab,
  onTabChange,
  agency,
  onAgencyChange,
  reports,
  activeReport,
  onSelectReport,
  onReportChange,
  onCreateNewClient,
  onCreateNewIntervalForClient,
  onDuplicateReport,
  onDeleteReport,
  onPreviewPresentation,
  onSaveAll,
  isSaving,
  saveFeedback,
}: BackendPanelProps) {
  const [logoError, setLogoError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const hasAccess = isAdmin || isDemoAdmin;

  // Group clients cleanly for Client + Interval two-step selector
  const clientsMap = new Map<string, { clientKey: string; clientName: string; reports: ClientReport[] }>();
  for (const r of reports) {
    const key = r.clientKey || slugifyClientKey(r.clientName);
    const existing = clientsMap.get(key);
    if (existing) {
      existing.reports.push(r);
    } else {
      clientsMap.set(key, { clientKey: key, clientName: r.clientName, reports: [r] });
    }
  }
  const clientGroups = Array.from(clientsMap.values());
  const currentClientGroup =
    clientsMap.get(activeReport.clientKey) || clientGroups[0];
  const currentClientIntervals = sortReportsChronologically(
    currentClientGroup ? currentClientGroup.reports : [activeReport]
  ).reverse();

  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    const nextStart = field === 'startDate' ? value : activeReport.startDate;
    const nextEnd = field === 'endDate' ? value : activeReport.endDate;
    const autoPeriod =
      parseIsoDateParts(nextStart) && parseIsoDateParts(nextEnd) && nextStart <= nextEnd
        ? formatIntervalLabel(nextStart, nextEnd)
        : activeReport.period;

    onReportChange({
      ...activeReport,
      startDate: nextStart,
      endDate: nextEnd,
      period: autoPeriod,
    });
  };

  const applyDatePreset = (preset: 'full-month' | 'first-half' | 'second-half') => {
    const base = parseIsoDateParts(activeReport.startDate) || { year: 2026, month: 11, day: 1 };
    const pad2 = (n: number) => String(n).padStart(2, '0');
    const lastDay = getLastDayOfMonth(base.year, base.month);
    let startDate: string;
    let endDate: string;

    if (preset === 'full-month') {
      const bounds = getMonthBounds(base.year, base.month);
      startDate = bounds.startDate;
      endDate = bounds.endDate;
    } else if (preset === 'first-half') {
      startDate = `${base.year}-${pad2(base.month)}-01`;
      endDate = `${base.year}-${pad2(base.month)}-15`;
    } else {
      startDate = `${base.year}-${pad2(base.month)}-16`;
      endDate = `${base.year}-${pad2(base.month)}-${pad2(lastDay)}`;
    }

    onReportChange({
      ...activeReport,
      startDate,
      endDate,
      period: formatIntervalLabel(startDate, endDate),
    });
  };

  const handleLogoUpload = async (
    target: 'agency' | 'client',
    file: File | null
  ) => {
    if (!file) return;
    setLogoError(null);
    try {
      const dataUrl = await compressLogoPng(file);
      if (target === 'agency') {
        onAgencyChange({ ...agency, agencyLogoDataUrl: dataUrl });
      } else {
        onReportChange({ ...activeReport, clientLogoDataUrl: dataUrl });
      }
    } catch (err) {
      setLogoError(
        err instanceof Error ? err.message : 'No se pudo procesar el logotipo.'
      );
    }
  };

  const copyText = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // Clipboard fallback ignored cleanly
    }
  };

  if (authLoading) {
    return (
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-20 text-center text-sm text-slate-500">
        Verificando credenciales de acceso...
      </main>
    );
  }

  // Private Admin Gate
  if (!hasAccess) {
    return (
      <main className="max-w-lg mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="bg-white border border-slate-200 rounded-xl p-8">
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-900 flex items-center justify-center mb-5">
            <Lock className="w-5 h-5" aria-hidden="true" />
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Panel Privado de Gestión
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed mb-6">
            Acceso exclusivo para cargar estadísticas por mes o intervalo de fechas de
            Facebook, Instagram y TikTok, subir logotipos PNG y publicar presentaciones
            para tus clientes o incrustarlas en Google Sites.
          </p>

          {user && !isAdmin ? (
            <div
              role="alert"
              className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-2"
            >
              <p className="font-semibold">Sesión iniciada como {user.email}</p>
              <p>
                Esta cuenta no tiene permisos de edición. Inicia sesión con la cuenta
                administradora autorizada ({ADMIN_EMAIL}) para guardar cambios en la nube.
              </p>
              <button
                type="button"
                onClick={onSignOut}
                className="inline-flex items-center gap-1.5 font-medium text-amber-950 underline cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Cambiar de cuenta</span>
              </button>
            </div>
          ) : null}

          <div className="space-y-3">
            <button
              type="button"
              onClick={onSignInGoogle}
              className="w-full px-4 py-3 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Iniciar sesión con Google
            </button>

            <button
              type="button"
              onClick={onEnterDemoAdmin}
              className="w-full px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Probar editor en modo demostración
            </button>
          </div>
        </div>
      </main>
    );
  }

  const originUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}`
      : 'https://tu-app.web.app/';
  const clientSlug = activeReport.clientKey || slugifyClientKey(activeReport.clientName);
  const directClientUrl = `${originUrl}?client=${encodeURIComponent(clientSlug)}`;
  const googleSitesEmbedUrl = `${originUrl}?client=${encodeURIComponent(clientSlug)}&embed=1`;
  const iframeSnippet = `<iframe src="${googleSitesEmbedUrl}" width="100%" height="980" style="border:0;border-radius:12px;" loading="lazy" title="Informes ${activeReport.clientName}"></iframe>`;

  return (
    <main
      id="panel-inicio"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20"
    >
      {/* Top Backend Workspace Context Row: Client Selector + Month/Interval Selector */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6 space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
          <div className="flex flex-wrap items-end gap-3">
            {/* Client selector */}
            <div>
              <label
                htmlFor="admin-client-select"
                className="block text-[11px] font-medium text-slate-500 mb-1"
              >
                Cliente
              </label>
              <select
                id="admin-client-select"
                value={currentClientGroup?.clientKey || activeReport.clientKey}
                onChange={(e) => {
                  const chosen = clientsMap.get(e.target.value);
                  if (chosen && chosen.reports.length > 0) {
                    const latest = sortReportsChronologically(chosen.reports).slice(-1)[0];
                    onSelectReport(latest.id);
                  }
                }}
                className="min-w-[190px] px-3 py-2 text-sm font-medium text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              >
                {clientGroups.map((group) => (
                  <option key={group.clientKey} value={group.clientKey}>
                    {group.clientName} ({group.reports.length})
                  </option>
                ))}
              </select>
            </div>

            {/* Month / Interval selector for current client */}
            <div>
              <label
                htmlFor="admin-report-select"
                className="block text-[11px] font-medium text-slate-500 mb-1"
              >
                Mes / intervalo editado
              </label>
              <select
                id="admin-report-select"
                value={activeReport.id}
                onChange={(e) => onSelectReport(e.target.value)}
                className="min-w-[260px] px-3 py-2 text-sm font-medium text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              >
                {currentClientIntervals.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.period} ({formatShortDateEs(r.startDate)} – {formatShortDateEs(r.endDate)})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onCreateNewIntervalForClient}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
              >
                <CalendarPlus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Nuevo mes / intervalo</span>
              </button>
              <button
                type="button"
                onClick={onDuplicateReport}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Duplicar</span>
              </button>
              <button
                type="button"
                onClick={onCreateNewClient}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Nuevo cliente</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isDemoAdmin && !isAdmin ? (
              <button
                type="button"
                onClick={onSignInGoogle}
                className="text-xs font-medium text-blue-700 hover:text-blue-900 underline cursor-pointer"
              >
                Modo demo local · Conectar Google para guardar en la nube
              </button>
            ) : user ? (
              <div className="flex items-center gap-3 text-xs text-slate-600">
                <span>{user.email}</span>
                <button
                  type="button"
                  onClick={onSignOut}
                  className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Salir</span>
                </button>
              </div>
            ) : null}

            <button
              type="button"
              onClick={onPreviewPresentation}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Ver presentación</span>
            </button>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {saveFeedback ? (
        <div
          role={saveFeedback.type === 'error' ? 'alert' : 'status'}
          className={`mb-6 px-4 py-3 rounded-lg border text-sm ${
            saveFeedback.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}
        >
          {saveFeedback.text}
        </div>
      ) : null}

      {/* Mobile Tab Selector (Desktop uses TopBar nav) */}
      <div className="flex md:hidden items-center gap-1.5 overflow-x-auto pb-3 mb-5">
        {MOBILE_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onTabChange(t.id)}
            className={`px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === t.id
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: IDENTITY, DATE INTERVAL & PNG LOGOS */}
      {activeTab === 'identity' && (
        <div className="space-y-8">
          {logoError ? (
            <p
              role="alert"
              className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3"
            >
              {logoError}
            </p>
          ) : null}

          {/* Dedicated Date Interval Picker for this Report */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="text-base font-semibold text-slate-900 mb-0.5">
                  Intervalo de fechas del informe
                </h2>
                <p className="text-xs text-slate-500">
                  Define el rango exacto que cubren las métricas (un mes completo, una
                  quincena o fechas personalizadas). Tu cliente podrá elegir por mes o
                  filtrar entre fechas.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => applyDatePreset('full-month')}
                  className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md whitespace-nowrap cursor-pointer"
                >
                  Mes completo
                </button>
                <button
                  type="button"
                  onClick={() => applyDatePreset('first-half')}
                  className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md whitespace-nowrap cursor-pointer"
                >
                  1ra quincena
                </button>
                <button
                  type="button"
                  onClick={() => applyDatePreset('second-half')}
                  className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md whitespace-nowrap cursor-pointer"
                >
                  2da quincena
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="report-start-date"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Fecha de inicio
                </label>
                <input
                  id="report-start-date"
                  type="date"
                  required
                  value={activeReport.startDate}
                  onChange={(e) => handleDateChange('startDate', e.target.value)}
                  className="w-full px-3 py-2 font-mono text-sm bg-white border border-slate-300 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                />
              </div>

              <div>
                <label
                  htmlFor="report-end-date"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Fecha de fin
                </label>
                <input
                  id="report-end-date"
                  type="date"
                  required
                  min={activeReport.startDate}
                  value={activeReport.endDate}
                  onChange={(e) => handleDateChange('endDate', e.target.value)}
                  className="w-full px-3 py-2 font-mono text-sm bg-white border border-slate-300 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                />
              </div>

              <div>
                <label
                  htmlFor="client-period"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Etiqueta visible del período
                </label>
                <input
                  id="client-period"
                  type="text"
                  required
                  maxLength={FIELD_LIMITS.period}
                  value={activeReport.period}
                  onChange={(e) =>
                    onReportChange({ ...activeReport, period: e.target.value })
                  }
                  placeholder="Ej. Noviembre 2026"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                />
              </div>
            </div>

            {activeReport.startDate &&
            activeReport.endDate &&
            activeReport.startDate > activeReport.endDate ? (
              <p role="alert" className="text-xs text-red-700 mt-3">
                La fecha de inicio no puede ser posterior a la fecha de fin.
              </p>
            ) : null}
          </div>

          {/* Two PNG Logo Uploaders */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Agency Logo PNG */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h2 className="text-base font-semibold text-slate-900 mb-1">
                Tu logotipo (Agencia / Marca personal)
              </h2>
              <p className="text-xs text-slate-500 mb-5">
                Sube tu logotipo en formato PNG con fondo transparente. Se mostrará en la
                barra superior, la portada y el PDF.
              </p>

              <div className="h-28 rounded-lg border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center p-4 mb-4">
                {agency.agencyLogoDataUrl ? (
                  <img
                    src={agency.agencyLogoDataUrl}
                    alt="Vista previa logotipo de agencia"
                    referrerPolicy="no-referrer"
                    className="max-h-20 max-w-full object-contain"
                  />
                ) : (
                  <span className="text-xs text-slate-400">
                    Sin logotipo PNG cargado (se usará el nombre de agencia)
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 mb-5">
                <label className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Subir logotipo PNG</span>
                  <input
                    type="file"
                    accept="image/png,image/webp,image/jpeg"
                    className="sr-only"
                    onChange={(e) => {
                      void handleLogoUpload('agency', e.target.files?.[0] || null);
                      e.target.value = '';
                    }}
                  />
                </label>

                {agency.agencyLogoDataUrl ? (
                  <button
                    type="button"
                    onClick={() => onAgencyChange({ ...agency, agencyLogoDataUrl: '' })}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-red-700 border border-slate-200 rounded-lg cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Quitar</span>
                  </button>
                ) : null}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="agency-name"
                    className="block text-xs font-medium text-slate-700 mb-1"
                  >
                    Nombre de tu agencia
                  </label>
                  <input
                    id="agency-name"
                    type="text"
                    maxLength={FIELD_LIMITS.agencyName}
                    value={agency.agencyName}
                    onChange={(e) =>
                      onAgencyChange({ ...agency, agencyName: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                  />
                </div>
                <div>
                  <label
                    htmlFor="agency-tagline"
                    className="block text-xs font-medium text-slate-700 mb-1"
                  >
                    Subtítulo (opcional)
                  </label>
                  <input
                    id="agency-tagline"
                    type="text"
                    maxLength={FIELD_LIMITS.agencyTagline}
                    value={agency.agencyTagline}
                    onChange={(e) =>
                      onAgencyChange({ ...agency, agencyTagline: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* Client Logo PNG */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h2 className="text-base font-semibold text-slate-900 mb-1">
                Logotipo del cliente (PNG)
              </h2>
              <p className="text-xs text-slate-500 mb-5">
                Personaliza la presentación y el PDF con el logotipo oficial del cliente.
              </p>

              <div className="h-28 rounded-lg border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center p-4 mb-4">
                {activeReport.clientLogoDataUrl ? (
                  <img
                    src={activeReport.clientLogoDataUrl}
                    alt="Vista previa logotipo del cliente"
                    referrerPolicy="no-referrer"
                    className="max-h-20 max-w-full object-contain"
                  />
                ) : (
                  <span className="text-xs text-slate-400">
                    Sin logotipo de cliente cargado (se mostrará el nombre del cliente)
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 mb-5">
                <label className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Subir logotipo cliente PNG</span>
                  <input
                    type="file"
                    accept="image/png,image/webp,image/jpeg"
                    className="sr-only"
                    onChange={(e) => {
                      void handleLogoUpload('client', e.target.files?.[0] || null);
                      e.target.value = '';
                    }}
                  />
                </label>

                {activeReport.clientLogoDataUrl ? (
                  <button
                    type="button"
                    onClick={() =>
                      onReportChange({ ...activeReport, clientLogoDataUrl: '' })
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-red-700 border border-slate-200 rounded-lg cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Quitar</span>
                  </button>
                ) : null}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="client-name"
                    className="block text-xs font-medium text-slate-700 mb-1"
                  >
                    Nombre del cliente
                  </label>
                  <input
                    id="client-name"
                    type="text"
                    required
                    maxLength={FIELD_LIMITS.clientName}
                    value={activeReport.clientName}
                    onChange={(e) =>
                      onReportChange({ ...activeReport, clientName: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                  />
                </div>
                <div>
                  <label
                    htmlFor="client-industry"
                    className="block text-xs font-medium text-slate-700 mb-1"
                  >
                    Industria o rubro
                  </label>
                  <input
                    id="client-industry"
                    type="text"
                    maxLength={FIELD_LIMITS.clientIndustry}
                    value={activeReport.clientIndustry}
                    onChange={(e) =>
                      onReportChange({ ...activeReport, clientIndustry: e.target.value })
                    }
                    placeholder="Ej. Gastronomía / Retail"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* General Client Metadata & Executive Summary */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <h2 className="text-base font-semibold text-slate-900">
              Configuración general y conclusiones
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="client-currency"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Moneda del simulador
                </label>
                <select
                  id="client-currency"
                  value={activeReport.currency}
                  onChange={(e) =>
                    onReportChange({
                      ...activeReport,
                      currency: e.target.value as CurrencyCode,
                    })
                  }
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                >
                  {(Object.keys(CURRENCY_CONFIG) as CurrencyCode[]).map((code) => (
                    <option key={code} value={code}>
                      {CURRENCY_CONFIG[code].label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end pb-1">
                <label className="inline-flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeReport.isPublished}
                    onChange={(e) =>
                      onReportChange({ ...activeReport, isPublished: e.target.checked })
                    }
                    className="w-4 h-4 accent-slate-900 rounded cursor-pointer"
                  />
                  <span>Visible para cliente y Google Sites</span>
                </label>
              </div>
            </div>

            <div>
              <label
                htmlFor="executive-summary"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Resumen ejecutivo / conclusiones del intervalo
              </label>
              <textarea
                id="executive-summary"
                rows={4}
                maxLength={FIELD_LIMITS.executiveSummary}
                value={activeReport.executiveSummary}
                onChange={(e) =>
                  onReportChange({ ...activeReport, executiveSummary: e.target.value })
                }
                placeholder="Destaca los logros clave, aprendizajes y próximos pasos recomendados..."
                className="w-full px-3 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              />
            </div>

            {reports.length > 1 ? (
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                {confirmDeleteId === activeReport.id ? (
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-red-700 font-medium">
                      ¿Eliminar el intervalo {activeReport.period} de {activeReport.clientName}?
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteReport(activeReport.id);
                        setConfirmDeleteId(null);
                      }}
                      className="px-3 py-1.5 font-medium text-white bg-red-600 rounded-md hover:bg-red-700 cursor-pointer"
                    >
                      Confirmar eliminación
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="px-3 py-1.5 font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(activeReport.id)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-red-700 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Eliminar este intervalo</span>
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* TAB 2: FACEBOOK */}
      {activeTab === 'facebook' && (
        <NetworkEditorForm
          networkName="Facebook"
          idPrefix="fb"
          metrics={[
            { key: 'reach', label: 'Alcance', value: activeReport.facebook.reach },
            {
              key: 'engagement',
              label: 'Interacción',
              value: activeReport.facebook.engagement,
            },
            { key: 'visits', label: 'Visitas', value: activeReport.facebook.visits },
            {
              key: 'followers',
              label: 'Seguidores',
              value: activeReport.facebook.followers,
            },
          ]}
          onMetricChange={(key, value) =>
            onReportChange({
              ...activeReport,
              facebook: { ...activeReport.facebook, [key]: value },
            })
          }
          contentMix={activeReport.facebook.contentMix}
          onContentMixChange={(contentMix) =>
            onReportChange({
              ...activeReport,
              facebook: { ...activeReport.facebook, contentMix },
            })
          }
          topPosts={activeReport.facebook.topPosts}
          onTopPostsChange={(topPosts) =>
            onReportChange({
              ...activeReport,
              facebook: { ...activeReport.facebook, topPosts },
            })
          }
          primaryPostMetricLabel="Alcance"
          secondaryPostMetricLabel="Interacción"
        />
      )}

      {/* TAB 3: INSTAGRAM */}
      {activeTab === 'instagram' && (
        <NetworkEditorForm
          networkName="Instagram"
          idPrefix="ig"
          metrics={[
            { key: 'reach', label: 'Alcance', value: activeReport.instagram.reach },
            {
              key: 'engagement',
              label: 'Interacción',
              value: activeReport.instagram.engagement,
            },
            { key: 'visits', label: 'Visitas', value: activeReport.instagram.visits },
            {
              key: 'followers',
              label: 'Seguidores',
              value: activeReport.instagram.followers,
            },
          ]}
          onMetricChange={(key, value) =>
            onReportChange({
              ...activeReport,
              instagram: { ...activeReport.instagram, [key]: value },
            })
          }
          contentMix={activeReport.instagram.contentMix}
          onContentMixChange={(contentMix) =>
            onReportChange({
              ...activeReport,
              instagram: { ...activeReport.instagram, contentMix },
            })
          }
          topPosts={activeReport.instagram.topPosts}
          onTopPostsChange={(topPosts) =>
            onReportChange({
              ...activeReport,
              instagram: { ...activeReport.instagram, topPosts },
            })
          }
          primaryPostMetricLabel="Alcance"
          secondaryPostMetricLabel="Interacción"
        />
      )}

      {/* TAB 4: TIKTOK */}
      {activeTab === 'tiktok' && (
        <NetworkEditorForm
          networkName="TikTok"
          idPrefix="tt"
          metrics={[
            { key: 'views', label: 'Reproducciones', value: activeReport.tiktok.views },
            { key: 'likes', label: 'Me gusta', value: activeReport.tiktok.likes },
            { key: 'visits', label: 'Visitas', value: activeReport.tiktok.visits },
            {
              key: 'newFollowers',
              label: 'Nuevos seguidores',
              value: activeReport.tiktok.newFollowers,
            },
          ]}
          onMetricChange={(key, value) =>
            onReportChange({
              ...activeReport,
              tiktok: { ...activeReport.tiktok, [key]: value },
            })
          }
          contentMix={activeReport.tiktok.contentMix}
          onContentMixChange={(contentMix) =>
            onReportChange({
              ...activeReport,
              tiktok: { ...activeReport.tiktok, contentMix },
            })
          }
          topPosts={activeReport.tiktok.topPosts}
          onTopPostsChange={(topPosts) =>
            onReportChange({
              ...activeReport,
              tiktok: { ...activeReport.tiktok, topPosts },
            })
          }
          primaryPostMetricLabel="Reproducciones"
          secondaryPostMetricLabel="Me gusta"
        />
      )}

      {/* TAB 5: GOOGLE SITES & CLIENT SHARING */}
      {activeTab === 'share' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">
              Insertar portal del cliente en Google Sites
            </h2>
            <p className="text-sm text-slate-600 max-w-2xl">
              Este enlace muestra únicamente los informes publicados de{' '}
              <strong>{activeReport.clientName}</strong> dentro de Google Sites (sin el
              panel privado), permitiendo al cliente cambiar de mes o elegir un rango de
              fechas directamente.
            </p>
          </div>

          {!isAdmin ? (
            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
              Estás en modo demostración local. Para que el cliente vea tus datos reales en
              Google Sites, inicia sesión con tu cuenta de Google y presiona{' '}
              <strong>Guardar cambios</strong>.
            </div>
          ) : null}

          {/* Embed URL */}
          <div>
            <label
              htmlFor="gsites-embed-url"
              className="block text-xs font-semibold text-slate-800 mb-1.5"
            >
              URL para Google Sites (Insertar → Por URL)
            </label>
            <div className="flex gap-2">
              <input
                id="gsites-embed-url"
                type="text"
                readOnly
                value={googleSitesEmbedUrl}
                className="flex-1 px-3 py-2.5 font-mono text-xs text-slate-700 bg-slate-50 border border-slate-300 rounded-lg"
              />
              <button
                type="button"
                onClick={() => void copyText('embed', googleSitesEmbedUrl)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 whitespace-nowrap cursor-pointer"
              >
                {copiedKey === 'embed' ? (
                  <>
                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Copiar URL</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Direct Client Link */}
          <div>
            <label
              htmlFor="direct-client-url"
              className="block text-xs font-semibold text-slate-800 mb-1.5"
            >
              Enlace directo para enviar por WhatsApp o correo
            </label>
            <div className="flex gap-2">
              <input
                id="direct-client-url"
                type="text"
                readOnly
                value={directClientUrl}
                className="flex-1 px-3 py-2.5 font-mono text-xs text-slate-700 bg-slate-50 border border-slate-300 rounded-lg"
              />
              <button
                type="button"
                onClick={() => void copyText('direct', directClientUrl)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap cursor-pointer"
              >
                {copiedKey === 'direct' ? (
                  <>
                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* HTML Iframe Code */}
          <div>
            <label
              htmlFor="gsites-iframe-code"
              className="block text-xs font-semibold text-slate-800 mb-1.5"
            >
              Código HTML (Insertar → Insertar código en Google Sites)
            </label>
            <div className="space-y-2">
              <textarea
                id="gsites-iframe-code"
                readOnly
                rows={3}
                value={iframeSnippet}
                className="w-full px-3 py-2.5 font-mono text-xs text-slate-700 bg-slate-50 border border-slate-300 rounded-lg"
              />
              <button
                type="button"
                onClick={() => void copyText('iframe', iframeSnippet)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                {copiedKey === 'iframe' ? (
                  <>
                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Código copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Copiar código iframe</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Steps */}
          <div className="pt-5 border-t border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">
              Cómo integrarlo en Google Sites en 3 pasos
            </h3>
            <ol className="space-y-2 text-sm text-slate-600 list-decimal list-inside">
              <li>Abre tu sitio en Google Sites y ve a la página del cliente.</li>
              <li>
                En el panel derecho selecciona <strong>Insertar → Incorporar</strong> y pega
                la URL de Google Sites o el código HTML.
              </li>
              <li>
                Cada vez que cargues un nuevo mes o intervalo aquí, tu cliente lo verá
                automáticamente en su selector mensual y de fechas dentro de Google Sites.
              </li>
            </ol>
          </div>
        </div>
      )}

      {/* Bottom Save Action Bar */}
      <div className="mt-8 pt-6 border-t border-slate-200 flex items-center justify-between gap-4">
        <p className="text-xs text-slate-500">
          {isAdmin
            ? 'Los cambios se guardan directamente en tu base de datos privada de Firebase.'
            : 'Los cambios se aplican en vivo a la vista de presentación local.'}
        </p>
        <button
          type="button"
          onClick={onSaveAll}
          disabled={isSaving}
          className="px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors cursor-pointer"
        >
          {isSaving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </main>
  );
}
