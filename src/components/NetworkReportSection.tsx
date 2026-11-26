import { useState } from 'react';
import { ExternalLink, Image as ImageIcon } from 'lucide-react';
import {
  CONTENT_FORMAT_LABELS,
  type ContentMix,
  type TopPost,
} from '../types/report';
import { computeContentMixTotal, formatNumber } from '../utils/analytics';

interface KpiItem {
  label: string;
  value: number;
  helper?: string;
}

interface NetworkReportSectionProps {
  id: string;
  sectionIndex: string;
  networkName: string;
  period: string;
  accentHex: string;
  kpis: KpiItem[];
  contentMix: ContentMix;
  topPosts: TopPost[];
  primaryPostMetricLabel: string;
  secondaryPostMetricLabel: string;
}

function PostImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="w-full h-full bg-slate-100 flex flex-col items-center justify-center gap-2 text-slate-400 p-4">
        <ImageIcon className="w-7 h-7" aria-hidden="true" />
        <span className="text-xs text-slate-500 text-center">Sin vista previa cargada</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="w-full h-full object-cover"
    />
  );
}

export function NetworkReportSection({
  id,
  sectionIndex,
  networkName,
  period,
  accentHex,
  kpis,
  contentMix,
  topPosts,
  primaryPostMetricLabel,
  secondaryPostMetricLabel,
}: NetworkReportSectionProps) {
  const totalPieces = computeContentMixTotal(contentMix);
  const formats: { key: keyof ContentMix; label: string }[] = [
    { key: 'static', label: CONTENT_FORMAT_LABELS.static },
    { key: 'reels', label: CONTENT_FORMAT_LABELS.reels },
    { key: 'covers', label: CONTENT_FORMAT_LABELS.covers },
    { key: 'carousels', label: CONTENT_FORMAT_LABELS.carousels },
  ];

  const featuredPosts = topPosts.slice(0, 2);

  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="scroll-mt-24 py-12 sm:py-16 border-t border-slate-200"
    >
      {/* Section Heading */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1.5">
            {sectionIndex} · Informe por red · {period}
          </p>
          <h2
            id={`${id}-heading`}
            className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900"
          >
            {networkName}
          </h2>
        </div>
        <p className="text-sm text-slate-600 tabular-nums">
          {totalPieces} {totalPieces === 1 ? 'publicación registrada' : 'publicaciones registradas'}
        </p>
      </div>

      {/* 4-Column KPI Strip (single elevation, hairline dividers) */}
      <div className="bg-white border border-slate-200 rounded-xl grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 mb-10">
        {kpis.map((kpi, idx) => (
          <div
            key={kpi.label}
            className={`p-5 sm:p-6 ${idx % 2 === 1 ? 'border-l lg:border-l-0 border-slate-200' : ''}`}
          >
            <p className="text-xs font-medium text-slate-500 mb-2">{kpi.label}</p>
            <p className="font-mono tabular-nums text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
              {formatNumber(kpi.value)}
            </p>
            {kpi.helper && (
              <p className="text-xs text-slate-500 mt-1.5 tabular-nums">{kpi.helper}</p>
            )}
          </div>
        ))}
      </div>

      {/* Content Mix + Top 2 Featured Posts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Content Mix Published */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900 mb-1">
              Contenido publicado
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Desglose por formato durante {period}
            </p>

            <div className="space-y-5">
              {formats.map((fmt) => {
                const count = contentMix[fmt.key] || 0;
                const pct = totalPieces > 0 ? Math.round((count / totalPieces) * 100) : 0;
                return (
                  <div key={fmt.key}>
                    <div className="flex items-baseline justify-between text-sm mb-1.5">
                      <span className="text-slate-700 font-medium">{fmt.label}</span>
                      <span className="font-mono tabular-nums text-slate-900 font-medium">
                        {count}{' '}
                        <span className="text-xs text-slate-500 font-normal">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: accentHex,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-5 mt-6 border-t border-slate-100 space-y-2.5">
            {totalPieces > 0 ? (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Formato principal</span>
                <span className="font-medium text-slate-800">
                  {
                    formats.reduce((best, cur) =>
                      (contentMix[cur.key] || 0) > (contentMix[best.key] || 0) ? cur : best
                    ).label
                  }
                </span>
              </div>
            ) : null}
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Total de piezas</span>
              <span className="font-mono tabular-nums font-semibold text-slate-900">
                {formatNumber(totalPieces)}
              </span>
            </div>
          </div>
        </div>

        {/* 2 Featured Posts */}
        <div className="lg:col-span-8 flex flex-col">
          <div className="flex items-baseline justify-between mb-4">
            <h3 className="text-base font-semibold text-slate-900">
              Posts destacados
            </h3>
            <span className="text-xs text-slate-500">Top 2 de mayor rendimiento</span>
          </div>

          {featuredPosts.length === 0 ? (
            <div className="flex-1 bg-white border border-slate-200 rounded-xl p-8 flex items-center justify-center text-sm text-slate-500">
              Aún no se han cargado publicaciones destacadas para {networkName}.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 flex-1">
              {featuredPosts.map((post, idx) => (
                <article
                  key={post.id || `${id}-post-${idx}`}
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col"
                >
                  <div className="aspect-[4/3] w-full bg-slate-100 overflow-hidden border-b border-slate-200">
                    <PostImage
                      src={post.imageUrl}
                      alt={post.title || `Post destacado ${idx + 1} de ${networkName}`}
                    />
                  </div>
                  <div className="p-5 flex flex-col flex-1 justify-between gap-4">
                    <div>
                      <p className="text-xs text-slate-500 mb-1.5">
                        <span>{CONTENT_FORMAT_LABELS[post.contentType] || 'Publicación'}</span>
                        {post.publishedDate ? (
                          <>
                            <span aria-hidden="true"> · </span>
                            <span>{post.publishedDate}</span>
                          </>
                        ) : null}
                      </p>
                      <h4 className="text-sm font-semibold text-slate-900 leading-snug line-clamp-2">
                        {post.title || `Publicación destacada ${idx + 1}`}
                      </h4>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-end justify-between gap-4">
                      <div className="flex items-center gap-6">
                        <div>
                          <p className="text-[11px] text-slate-500">{primaryPostMetricLabel}</p>
                          <p className="font-mono tabular-nums text-base font-semibold text-slate-900">
                            {formatNumber(post.primaryMetric)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-500">{secondaryPostMetricLabel}</p>
                          <p className="font-mono tabular-nums text-base font-semibold text-slate-900">
                            {formatNumber(post.secondaryMetric)}
                          </p>
                        </div>
                      </div>

                      {post.postUrl ? (
                        <a
                          href={post.postUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Abrir publicación ${post.title || idx + 1}`}
                          className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
                        >
                          <ExternalLink className="w-4 h-4" aria-hidden="true" />
                        </a>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
