import { Download, Loader2, Save } from 'lucide-react';
import type { AgencySettings } from '../types/report';

export type AppMode = 'presentation' | 'admin';
export type AdminTab = 'identity' | 'facebook' | 'instagram' | 'tiktok' | 'share';

interface TopBarProps {
  mode: AppMode;
  agency: AgencySettings;
  activeAdminTab: AdminTab;
  onSelectAdminTab: (tab: AdminTab) => void;
  onExportPdf: () => void;
  isExportingPdf: boolean;
  onSaveBackend: () => void;
  isSavingBackend: boolean;
  canSaveBackend: boolean;
}

const PRESENTATION_LINKS = [
  { href: '#facebook', label: 'Facebook' },
  { href: '#instagram', label: 'Instagram' },
  { href: '#tiktok', label: 'TikTok' },
  { href: '#dashboard', label: 'Dashboard' },
  { href: '#simulador', label: 'Simulador' },
];

const ADMIN_LINKS: { id: AdminTab; label: string }[] = [
  { id: 'identity', label: 'Identidad' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'share', label: 'Google Sites' },
];

export function TopBar({
  mode,
  agency,
  activeAdminTab,
  onSelectAdminTab,
  onExportPdf,
  isExportingPdf,
  onSaveBackend,
  isSavingBackend,
  canSaveBackend,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 h-16 bg-white/95 backdrop-blur-sm border-b border-slate-200 no-print">
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand / Agency PNG Logo */}
        <a
          href={mode === 'presentation' ? '#portada' : '#panel-inicio'}
          className="flex items-center whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 rounded"
          aria-label={agency.agencyName || 'Pulso Social'}
        >
          {agency.agencyLogoDataUrl ? (
            <img
              src={agency.agencyLogoDataUrl}
              alt={agency.agencyName || 'Logotipo de la agencia'}
              referrerPolicy="no-referrer"
              className="h-8 w-auto max-w-[160px] object-contain"
            />
          ) : (
            <span className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
              {agency.agencyName || 'Pulso Social'}
            </span>
          )}
        </a>

        {/* Zone 2: 5 concise single-line navigation links */}
        <nav
          aria-label={mode === 'presentation' ? 'Secciones del informe' : 'Secciones del editor'}
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
        >
          {mode === 'presentation'
            ? PRESENTATION_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="py-1 text-slate-600 hover:text-slate-900 border-b-2 border-transparent hover:border-slate-900 transition-colors whitespace-nowrap shrink-0"
                >
                  {link.label}
                </a>
              ))
            : ADMIN_LINKS.map((tab) => {
                const active = activeAdminTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => onSelectAdminTab(tab.id)}
                    className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'text-slate-900 border-slate-900 font-semibold'
                        : 'text-slate-600 border-transparent hover:text-slate-900 hover:border-slate-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
        </nav>

        {/* Zone 3: Single Primary Action */}
        <div className="flex items-center shrink-0">
          {mode === 'presentation' ? (
            <button
              type="button"
              onClick={onExportPdf}
              disabled={isExportingPdf}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
            >
              {isExportingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Download className="w-4 h-4" aria-hidden="true" />
              )}
              <span>{isExportingPdf ? 'Generando PDF' : 'Descargar PDF'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onSaveBackend}
              disabled={isSavingBackend || !canSaveBackend}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
            >
              {isSavingBackend ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Save className="w-4 h-4" aria-hidden="true" />
              )}
              <span>{isSavingBackend ? 'Guardando' : 'Guardar cambios'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
