import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TopBar, type AdminTab, type AppMode } from './components/TopBar';
import { PresentationView } from './components/PresentationView';
import { BackendPanel } from './components/BackendPanel';
import type { SimulatorState } from './components/InvestmentSimulator';
import {
  createBlankReport,
  DEFAULT_AGENCY_SETTINGS,
  DEMO_REPORTS,
} from './data/demoData';
import {
  auth,
  checkIsAdmin,
  deleteClientReport,
  fetchAgencySettings,
  fetchAllReportsForAdmin,
  fetchPublishedReports,
  fetchSingleReport,
  saveAgencySettings,
  saveClientReport,
  signInWithGoogle,
  signOutAdmin,
} from './services/firebase';
import type { AgencySettings, ClientReport } from './types/report';
import {
  aggregateReportsForRange,
  filterReportsByDateRange,
  formatIntervalLabel,
  getMonthBounds,
  getReportMonthKey,
  parseIsoDateParts,
  simulatePaidMedia,
  slugifyClientKey,
  slugifyReportId,
  sortReportsChronologically,
  validateClientReport,
} from './utils/analytics';
import { exportPresentationToPdf } from './utils/pdfExport';

function parseUrlParams() {
  if (typeof window === 'undefined') {
    return {
      reportId: null as string | null,
      clientKey: null as string | null,
      isEmbed: false,
      initialMode: 'presentation' as AppMode,
    };
  }
  const params = new URLSearchParams(window.location.search);
  const reportId = params.get('report');
  const clientKey = params.get('client');
  const isEmbed = params.get('embed') === '1';
  const initialMode: AppMode =
    !isEmbed && params.get('view') === 'admin' ? 'admin' : 'presentation';
  return { reportId, clientKey, isEmbed, initialMode };
}

function buildSimulatorState(report: ClientReport): SimulatorState {
  return {
    monthlyBudget: report.simulatorDefaults.monthlyBudget,
    currency: report.currency,
    objective: report.simulatorDefaults.objective,
    fbShare: report.simulatorDefaults.fbShare,
    igShare: report.simulatorDefaults.igShare,
    ttShare: report.simulatorDefaults.ttShare,
    fbCpm: report.simulatorDefaults.fbCpm,
    igCpm: report.simulatorDefaults.igCpm,
    ttCpm: report.simulatorDefaults.ttCpm,
  };
}

function getLatestReport(list: ClientReport[]): ClientReport {
  const sorted = sortReportsChronologically(list);
  return sorted[sorted.length - 1] || DEMO_REPORTS[DEMO_REPORTS.length - 1];
}

function AppContent() {
  const {
    reportId: urlReportId,
    clientKey: urlClientKey,
    isEmbed,
    initialMode,
  } = useMemo(() => parseUrlParams(), []);

  const [mode, setMode] = useState<AppMode>(initialMode);
  const [activeAdminTab, setActiveAdminTab] = useState<AdminTab>('identity');

  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDemoAdmin, setIsDemoAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // Domain state
  const [agency, setAgency] = useState<AgencySettings>(DEFAULT_AGENCY_SETTINGS);
  const [reports, setReports] = useState<ClientReport[]>(DEMO_REPORTS);

  const initialLatest = useMemo(() => getLatestReport(DEMO_REPORTS), []);
  const [activeReportId, setActiveReportId] = useState<string>(
    urlReportId || initialLatest.id
  );
  const [dataLoading, setDataLoading] = useState(true);

  // Client presentation date/month filter state
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(() =>
    getReportMonthKey(initialLatest)
  );
  const [filterFromDate, setFilterFromDate] = useState<string>(initialLatest.startDate);
  const [filterToDate, setFilterToDate] = useState<string>(initialLatest.endDate);

  // Action states
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const activeReport = useMemo(() => {
    return (
      reports.find((r) => r.id === activeReportId) ||
      getLatestReport(reports)
    );
  }, [reports, activeReportId]);

  const activeClientKey = activeReport.clientKey || slugifyClientKey(activeReport.clientName);

  // Unique clients list for top workspace picker
  const clientGroups = useMemo(() => {
    const map = new Map<string, { clientKey: string; clientName: string; reports: ClientReport[] }>();
    for (const r of reports) {
      const k = r.clientKey || slugifyClientKey(r.clientName);
      const existing = map.get(k);
      if (existing) {
        existing.reports.push(r);
      } else {
        map.set(k, { clientKey: k, clientName: r.clientName, reports: [r] });
      }
    }
    return Array.from(map.values());
  }, [reports]);

  // All reports belonging to the active client (in presentation, only published if embedded)
  const activeClientReports = useMemo(() => {
    const matching = reports.filter(
      (r) => (r.clientKey || slugifyClientKey(r.clientName)) === activeClientKey
    );
    const visible = isEmbed ? matching.filter((r) => r.isPublished) : matching;
    return sortReportsChronologically(visible.length > 0 ? visible : matching);
  }, [reports, activeClientKey, isEmbed]);

  const latestClientReport = useMemo(
    () => getLatestReport(activeClientReports),
    [activeClientReports]
  );

  // Matched reports for the client's chosen month or custom date range
  const matchedClientReports = useMemo(() => {
    if (selectedMonthKey === 'all') {
      return activeClientReports;
    }
    return filterReportsByDateRange(activeClientReports, filterFromDate, filterToDate);
  }, [activeClientReports, selectedMonthKey, filterFromDate, filterToDate]);

  const presentationReport = useMemo(() => {
    if (matchedClientReports.length === 0) return null;
    if (matchedClientReports.length === 1) return matchedClientReports[0];
    return aggregateReportsForRange(matchedClientReports, {
      fromDate: filterFromDate,
      toDate: filterToDate,
    });
  }, [matchedClientReports, filterFromDate, filterToDate]);

  const [simulatorState, setSimulatorState] = useState<SimulatorState>(() =>
    buildSimulatorState(initialLatest)
  );

  // Sync simulator currency & defaults when active client changes
  useEffect(() => {
    setSimulatorState(buildSimulatorState(latestClientReport));
  }, [latestClientReport.clientKey, latestClientReport.currency]);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (nextUser) {
        const adminOk = await checkIsAdmin(nextUser);
        setIsAdmin(adminOk);
        if (adminOk) {
          setIsDemoAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Load Agency settings & reports from Firestore
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setDataLoading(true);
      try {
        const [cloudAgency, cloudReports] = await Promise.all([
          fetchAgencySettings().catch(() => null),
          isAdmin
            ? fetchAllReportsForAdmin().catch(() => [])
            : fetchPublishedReports().catch(() => []),
        ]);

        let specificReport: ClientReport | null = null;
        if (urlReportId && !cloudReports.some((r) => r.id === urlReportId)) {
          specificReport = await fetchSingleReport(urlReportId).catch(() => null);
        }

        if (cancelled) return;

        if (cloudAgency) {
          setAgency(cloudAgency);
        }

        const mergedCloud = specificReport
          ? [specificReport, ...cloudReports]
          : cloudReports;

        if (mergedCloud.length > 0) {
          setReports(mergedCloud);
          let target: ClientReport | undefined;

          if (urlReportId) {
            target = mergedCloud.find((r) => r.id === urlReportId);
          } else if (urlClientKey) {
            const clientMatches = mergedCloud.filter(
              (r) => (r.clientKey || slugifyClientKey(r.clientName)) === urlClientKey
            );
            if (clientMatches.length > 0) {
              target = getLatestReport(clientMatches);
            }
          }

          const chosen = target || getLatestReport(mergedCloud);
          setActiveReportId(chosen.id);
          setSelectedMonthKey(getReportMonthKey(chosen));
          setFilterFromDate(chosen.startDate);
          setFilterToDate(chosen.endDate);
        } else if (urlClientKey) {
          const demoMatches = DEMO_REPORTS.filter((r) => r.clientKey === urlClientKey);
          if (demoMatches.length > 0) {
            const chosen = getLatestReport(demoMatches);
            setActiveReportId(chosen.id);
            setSelectedMonthKey(getReportMonthKey(chosen));
            setFilterFromDate(chosen.startDate);
            setFilterToDate(chosen.endDate);
          }
        }
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    }

    if (!authLoading) {
      void loadData();
    }

    return () => {
      cancelled = true;
    };
  }, [authLoading, isAdmin, urlReportId, urlClientKey]);

  const simulation = useMemo(() => {
    if (!presentationReport) return null;
    return simulatePaidMedia({
      ...simulatorState,
      organicBaseline: {
        facebook: presentationReport.facebook.reach,
        instagram: presentationReport.instagram.reach,
        tiktok: presentationReport.tiktok.views,
      },
    });
  }, [simulatorState, presentationReport]);

  const selectMonthForClient = (monthKey: string, clientList = activeClientReports) => {
    if (monthKey === 'all') {
      const sorted = sortReportsChronologically(clientList);
      if (sorted.length > 0) {
        setSelectedMonthKey('all');
        setFilterFromDate(sorted[0].startDate);
        setFilterToDate(sorted[sorted.length - 1].endDate);
      }
      return;
    }

    const inMonth = clientList.filter((r) => getReportMonthKey(r) === monthKey);
    if (inMonth.length > 0) {
      const sorted = sortReportsChronologically(inMonth);
      setSelectedMonthKey(monthKey);
      setFilterFromDate(sorted[0].startDate);
      setFilterToDate(sorted[sorted.length - 1].endDate);
    } else {
      const parts = /^(\d{4})-(\d{2})$/.exec(monthKey);
      if (parts) {
        const bounds = getMonthBounds(Number(parts[1]), Number(parts[2]));
        setSelectedMonthKey(monthKey);
        setFilterFromDate(bounds.startDate);
        setFilterToDate(bounds.endDate);
      }
    }
  };

  const handleClientDateRangeChange = (fromDate: string, toDate: string) => {
    setFilterFromDate(fromDate);
    setFilterToDate(toDate);
    setSelectedMonthKey('custom');
  };

  const handleResetClientDateFilter = () => {
    const latest = getLatestReport(activeClientReports);
    setSelectedMonthKey(getReportMonthKey(latest));
    setFilterFromDate(latest.startDate);
    setFilterToDate(latest.endDate);
  };

  const handleSwitchClientInPresentation = (nextClientKey: string) => {
    const group = clientGroups.find((g) => g.clientKey === nextClientKey);
    if (!group || group.reports.length === 0) return;
    const latest = getLatestReport(group.reports);
    setActiveReportId(latest.id);
    setSelectedMonthKey(getReportMonthKey(latest));
    setFilterFromDate(latest.startDate);
    setFilterToDate(latest.endDate);
  };

  const handleUpdateActiveReport = (updated: ClientReport) => {
    setSaveFeedback(null);
    setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  };

  const handleCreateNewClient = () => {
    const id = slugifyReportId('nuevo-cliente', '2026');
    const blank = createBlankReport(id);
    setReports((prev) => [...prev, blank]);
    setActiveReportId(blank.id);
    setSelectedMonthKey(getReportMonthKey(blank));
    setFilterFromDate(blank.startDate);
    setFilterToDate(blank.endDate);
    setActiveAdminTab('identity');
    setSaveFeedback({
      type: 'success',
      text: 'Nuevo cliente creado. Define el intervalo de fechas, logotipos y estadísticas.',
    });
  };

  const handleCreateNewIntervalForClient = () => {
    // Advance to the month after the latest interval of this client
    const latest = getLatestReport(activeClientReports);
    const parts = parseIsoDateParts(latest.endDate) || { year: 2026, month: 11, day: 30 };
    const nextMonth = parts.month === 12 ? 1 : parts.month + 1;
    const nextYear = parts.month === 12 ? parts.year + 1 : parts.year;
    const nextBounds = getMonthBounds(nextYear, nextMonth);
    const nextPeriod = formatIntervalLabel(nextBounds.startDate, nextBounds.endDate);
    const id = slugifyReportId(latest.clientName, nextPeriod);

    const newInterval = createBlankReport(id, {
      clientKey: latest.clientKey || slugifyClientKey(latest.clientName),
      clientName: latest.clientName,
      clientIndustry: latest.clientIndustry,
      clientLogoDataUrl: latest.clientLogoDataUrl,
      currency: latest.currency,
      startDate: nextBounds.startDate,
      endDate: nextBounds.endDate,
    });
    // Carry forward latest followers as helpful starting baseline
    newInterval.facebook.followers = latest.facebook.followers;
    newInterval.instagram.followers = latest.instagram.followers;

    setReports((prev) => [...prev, newInterval]);
    setActiveReportId(newInterval.id);
    setActiveAdminTab('identity');
    setSaveFeedback({
      type: 'success',
      text: `Nuevo intervalo creado para ${latest.clientName} (${nextPeriod}). Puedes ajustar las fechas exactas o ingresar métricas.`,
    });
  };

  const handleDuplicateReport = () => {
    const id = slugifyReportId(activeReport.clientName, `${activeReport.startDate}-copia`);
    const copy: ClientReport = {
      ...structuredClone(activeReport),
      id,
      period: `${activeReport.period} (Copia)`,
      isLocalDemo: !isAdmin,
    };
    setReports((prev) => [...prev, copy]);
    setActiveReportId(copy.id);
    setSaveFeedback({
      type: 'success',
      text: 'Intervalo duplicado. Ajusta la fecha de inicio, fecha de fin y las nuevas métricas.',
    });
  };

  const handleDeleteReport = async (id: string) => {
    const target = reports.find((r) => r.id === id);
    const remaining = reports.filter((r) => r.id !== id);
    if (remaining.length === 0) return;

    try {
      if (isAdmin && target && !target.isLocalDemo) {
        await deleteClientReport(id);
      }
      setReports(remaining);
      const next = getLatestReport(remaining);
      setActiveReportId(next.id);
      setSelectedMonthKey(getReportMonthKey(next));
      setFilterFromDate(next.startDate);
      setFilterToDate(next.endDate);
      setSaveFeedback({
        type: 'success',
        text: 'Intervalo eliminado correctamente.',
      });
    } catch {
      setSaveFeedback({
        type: 'error',
        text: 'No se pudo eliminar el informe en Firebase.',
      });
    }
  };

  const handleSaveBackend = async () => {
    setSaveFeedback(null);
    const validationErrors = validateClientReport(activeReport);
    if (validationErrors.length > 0) {
      setSaveFeedback({
        type: 'error',
        text: validationErrors.join(' '),
      });
      return;
    }

    const reportToSave: ClientReport = {
      ...activeReport,
      clientKey: activeReport.clientKey || slugifyClientKey(activeReport.clientName),
      simulatorDefaults: {
        monthlyBudget: simulatorState.monthlyBudget,
        objective: simulatorState.objective,
        fbShare: simulatorState.fbShare,
        igShare: simulatorState.igShare,
        ttShare: simulatorState.ttShare,
        fbCpm: simulatorState.fbCpm,
        igCpm: simulatorState.igCpm,
        ttCpm: simulatorState.ttCpm,
      },
    };

    if (!isAdmin || !user) {
      handleUpdateActiveReport(reportToSave);
      setSaveFeedback({
        type: 'success',
        text: 'Cambios aplicados en la presentación local. Inicia sesión con Google para guardarlos en Firebase.',
      });
      return;
    }

    setIsSaving(true);
    try {
      await Promise.all([
        saveAgencySettings(agency, user.uid),
        saveClientReport(reportToSave, user.uid),
      ]);
      handleUpdateActiveReport({ ...reportToSave, isLocalDemo: false });
      setSaveFeedback({
        type: 'success',
        text: 'Intervalo y logotipos guardados en Firebase. Tu cliente ya puede consultarlo en línea y en Google Sites.',
      });
    } catch {
      setSaveFeedback({
        type: 'error',
        text: 'Error al guardar en Firebase. Verifica tu conexión y permisos de administrador.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreviewPresentation = () => {
    setSelectedMonthKey(getReportMonthKey(activeReport));
    setFilterFromDate(activeReport.startDate);
    setFilterToDate(activeReport.endDate);
    setMode('presentation');
  };

  const handleExportPdf = async () => {
    if (!presentationReport || !simulation) return;
    setIsExportingPdf(true);
    try {
      await exportPresentationToPdf(presentationReport, agency, simulation);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleSignInGoogle = async () => {
    setSaveFeedback(null);
    try {
      await signInWithGoogle();
    } catch {
      setSaveFeedback({
        type: 'error',
        text: 'No se completó el inicio de sesión con Google.',
      });
    }
  };

  const handleSignOut = async () => {
    await signOutAdmin();
    setIsDemoAdmin(false);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <TopBar
        mode={isEmbed ? 'presentation' : mode}
        agency={agency}
        activeAdminTab={activeAdminTab}
        onSelectAdminTab={setActiveAdminTab}
        onExportPdf={() => void handleExportPdf()}
        isExportingPdf={isExportingPdf}
        onSaveBackend={() => void handleSaveBackend()}
        isSavingBackend={isSaving}
        canSaveBackend={isAdmin || isDemoAdmin}
      />

      {/* Workspace Mode Toolbar (Below TopBar Contract; hidden in Google Sites embed mode) */}
      {!isEmbed && (
        <div className="bg-slate-50 border-b border-slate-200 no-print">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3">
            <div
              role="group"
              aria-label="Modo de vista"
              className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg"
            >
              <button
                type="button"
                onClick={() => setMode('presentation')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  mode === 'presentation'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Presentación cliente
              </button>
              <button
                type="button"
                onClick={() => setMode('admin')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  mode === 'admin'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Panel privado
              </button>
            </div>

            {mode === 'presentation' && clientGroups.length > 1 ? (
              <div className="flex items-center gap-2">
                <label
                  htmlFor="presentation-client-picker"
                  className="text-xs text-slate-500 whitespace-nowrap"
                >
                  Cliente:
                </label>
                <select
                  id="presentation-client-picker"
                  value={activeClientKey}
                  onChange={(e) => handleSwitchClientInPresentation(e.target.value)}
                  className="text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-md px-2.5 py-1.5"
                >
                  {clientGroups.map((g) => (
                    <option key={g.clientKey} value={g.clientKey}>
                      {g.clientName}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <span className="text-xs text-slate-500">
                {latestClientReport.clientName} · {presentationReport ? presentationReport.period : 'Rango personalizado'}
              </span>
            )}
          </div>
        </div>
      )}

      {dataLoading ? (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-6">
          <div className="h-10 w-64 bg-slate-200/70 rounded animate-pulse" />
          <div className="h-32 w-full bg-slate-200/60 rounded-xl animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-28 bg-slate-200/60 rounded-xl animate-pulse" />
            ))}
          </div>
        </main>
      ) : isEmbed || mode === 'presentation' ? (
        <PresentationView
          agency={agency}
          clientMeta={{
            clientName: latestClientReport.clientName,
            clientIndustry: latestClientReport.clientIndustry,
            clientLogoDataUrl: latestClientReport.clientLogoDataUrl,
          }}
          clientReports={activeClientReports}
          report={presentationReport}
          matchedIntervalsCount={matchedClientReports.length}
          selectedMonthKey={selectedMonthKey}
          filterFromDate={filterFromDate}
          filterToDate={filterToDate}
          onSelectMonth={(m) => selectMonthForClient(m)}
          onDateRangeChange={handleClientDateRangeChange}
          onResetDateFilter={handleResetClientDateFilter}
          simulatorState={simulatorState}
          simulation={simulation}
          onSimulatorChange={setSimulatorState}
          onSimulatorReset={() => setSimulatorState(buildSimulatorState(latestClientReport))}
        />
      ) : (
        <BackendPanel
          user={user}
          isAdmin={isAdmin}
          isDemoAdmin={isDemoAdmin}
          authLoading={authLoading}
          onSignInGoogle={() => void handleSignInGoogle()}
          onSignOut={() => void handleSignOut()}
          onEnterDemoAdmin={() => setIsDemoAdmin(true)}
          activeTab={activeAdminTab}
          onTabChange={setActiveAdminTab}
          agency={agency}
          onAgencyChange={setAgency}
          reports={reports}
          activeReport={activeReport}
          onSelectReport={setActiveReportId}
          onReportChange={handleUpdateActiveReport}
          onCreateNewClient={handleCreateNewClient}
          onCreateNewIntervalForClient={handleCreateNewIntervalForClient}
          onDuplicateReport={handleDuplicateReport}
          onDeleteReport={(id) => void handleDeleteReport(id)}
          onPreviewPresentation={handlePreviewPresentation}
          onSaveAll={() => void handleSaveBackend()}
          isSaving={isSaving}
          saveFeedback={saveFeedback}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
