import { useState } from 'react';
import { Trash2, Upload } from 'lucide-react';
import {
  CONTENT_FORMAT_LABELS,
  type ContentFormatKey,
  type ContentMix,
  type TopPost,
} from '../types/report';
import { compressPostImage } from '../utils/imageUpload';

export interface MetricFieldDef {
  key: string;
  label: string;
  value: number;
}

interface NetworkEditorFormProps {
  networkName: string;
  metrics: MetricFieldDef[];
  onMetricChange: (key: string, value: number) => void;
  contentMix: ContentMix;
  onContentMixChange: (next: ContentMix) => void;
  topPosts: TopPost[];
  onTopPostsChange: (next: TopPost[]) => void;
  primaryPostMetricLabel: string;
  secondaryPostMetricLabel: string;
  idPrefix: string;
}

const FORMAT_KEYS: ContentFormatKey[] = ['static', 'reels', 'covers', 'carousels'];

export function NetworkEditorForm({
  networkName,
  metrics,
  onMetricChange,
  contentMix,
  onContentMixChange,
  topPosts,
  onTopPostsChange,
  primaryPostMetricLabel,
  secondaryPostMetricLabel,
  idPrefix,
}: NetworkEditorFormProps) {
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Always present 2 editable featured post slots
  const normalizedPosts: TopPost[] = [0, 1].map((idx) => {
    const existing = topPosts[idx];
    if (existing) return existing;
    return {
      id: `${idPrefix}-post-${idx + 1}`,
      title: '',
      contentType: idx === 0 ? 'reels' : 'static',
      primaryMetric: 0,
      secondaryMetric: 0,
      imageUrl: '',
      postUrl: '',
      publishedDate: '',
    };
  });

  const updatePost = (index: number, patch: Partial<TopPost>) => {
    const next = normalizedPosts.map((p, i) => (i === index ? { ...p, ...patch } : p));
    onTopPostsChange(next);
  };

  const handlePostImageUpload = async (index: number, file: File | null) => {
    if (!file) return;
    setUploadError(null);
    try {
      const dataUrl = await compressPostImage(file);
      updatePost(index, { imageUrl: dataUrl });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'No se pudo subir la imagen.');
    }
  };

  return (
    <div className="space-y-8">
      {/* Main KPIs */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="text-base font-semibold text-slate-900 mb-1">
          Estadísticas principales de {networkName}
        </h3>
        <p className="text-xs text-slate-500 mb-5">
          Ingresa las métricas acumuladas del período para esta red social.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((metric) => {
            const inputId = `${idPrefix}-metric-${metric.key}`;
            return (
              <div key={metric.key}>
                <label
                  htmlFor={inputId}
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  {metric.label}
                </label>
                <input
                  id={inputId}
                  type="number"
                  min={0}
                  value={metric.value}
                  onChange={(e) =>
                    onMetricChange(metric.key, Math.max(0, Number(e.target.value) || 0))
                  }
                  className="w-full px-3 py-2.5 font-mono tabular-nums text-sm font-medium text-slate-900 bg-white border border-slate-300 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Content Mix */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="text-base font-semibold text-slate-900 mb-1">
          Tipo de contenido publicado
        </h3>
        <p className="text-xs text-slate-500 mb-5">
          Cantidad de piezas publicadas en {networkName} por formato.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {FORMAT_KEYS.map((fmt) => {
            const inputId = `${idPrefix}-mix-${fmt}`;
            return (
              <div key={fmt}>
                <label
                  htmlFor={inputId}
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  {CONTENT_FORMAT_LABELS[fmt]}
                </label>
                <input
                  id={inputId}
                  type="number"
                  min={0}
                  value={contentMix[fmt]}
                  onChange={(e) =>
                    onContentMixChange({
                      ...contentMix,
                      [fmt]: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className="w-full px-3 py-2.5 font-mono tabular-nums text-sm font-medium text-slate-900 bg-white border border-slate-300 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Top 2 Featured Posts */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="mb-5">
          <h3 className="text-base font-semibold text-slate-900 mb-1">
            Posts destacados (2)
          </h3>
          <p className="text-xs text-slate-500">
            Carga las dos publicaciones con mejor rendimiento en {networkName}.
          </p>
        </div>

        {uploadError ? (
          <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
            {uploadError}
          </p>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {normalizedPosts.map((post, idx) => (
            <div
              key={post.id}
              className="border border-slate-200 rounded-lg p-5 space-y-4 bg-slate-50/40"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-900">
                  Post destacado {idx + 1}
                </h4>
                {post.imageUrl ? (
                  <button
                    type="button"
                    onClick={() => updatePost(idx, { imageUrl: '' })}
                    className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-red-700 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Quitar imagen</span>
                  </button>
                ) : null}
              </div>

              {/* Thumbnail Preview + Upload */}
              <div className="flex items-center gap-4">
                <div className="w-24 h-18 rounded-md bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                  {post.imageUrl ? (
                    <img
                      src={post.imageUrl}
                      alt={`Miniatura post ${idx + 1}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-[11px] text-slate-400 text-center px-1">Sin foto</span>
                  )}
                </div>

                <label className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Subir captura / portada</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={(e) => {
                      void handlePostImageUpload(idx, e.target.files?.[0] || null);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>

              <div>
                <label
                  htmlFor={`${idPrefix}-post-${idx}-title`}
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Título o descripción breve
                </label>
                <input
                  id={`${idPrefix}-post-${idx}-title`}
                  type="text"
                  maxLength={160}
                  value={post.title}
                  onChange={(e) => updatePost(idx, { title: e.target.value })}
                  placeholder="Ej. Reel de preparación V60"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor={`${idPrefix}-post-${idx}-type`}
                    className="block text-xs font-medium text-slate-700 mb-1"
                  >
                    Tipo de contenido
                  </label>
                  <select
                    id={`${idPrefix}-post-${idx}-type`}
                    value={post.contentType}
                    onChange={(e) =>
                      updatePost(idx, { contentType: e.target.value as ContentFormatKey })
                    }
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                  >
                    {FORMAT_KEYS.map((fmt) => (
                      <option key={fmt} value={fmt}>
                        {CONTENT_FORMAT_LABELS[fmt]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor={`${idPrefix}-post-${idx}-date`}
                    className="block text-xs font-medium text-slate-700 mb-1"
                  >
                    Fecha (opcional)
                  </label>
                  <input
                    id={`${idPrefix}-post-${idx}-date`}
                    type="text"
                    maxLength={40}
                    value={post.publishedDate}
                    onChange={(e) => updatePost(idx, { publishedDate: e.target.value })}
                    placeholder="Ej. 14 Nov 2026"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor={`${idPrefix}-post-${idx}-primary`}
                    className="block text-xs font-medium text-slate-700 mb-1"
                  >
                    {primaryPostMetricLabel}
                  </label>
                  <input
                    id={`${idPrefix}-post-${idx}-primary`}
                    type="number"
                    min={0}
                    value={post.primaryMetric}
                    onChange={(e) =>
                      updatePost(idx, {
                        primaryMetric: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="w-full px-3 py-2 font-mono tabular-nums text-sm bg-white border border-slate-300 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                  />
                </div>
                <div>
                  <label
                    htmlFor={`${idPrefix}-post-${idx}-secondary`}
                    className="block text-xs font-medium text-slate-700 mb-1"
                  >
                    {secondaryPostMetricLabel}
                  </label>
                  <input
                    id={`${idPrefix}-post-${idx}-secondary`}
                    type="number"
                    min={0}
                    value={post.secondaryMetric}
                    onChange={(e) =>
                      updatePost(idx, {
                        secondaryMetric: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="w-full px-3 py-2 font-mono tabular-nums text-sm bg-white border border-slate-300 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor={`${idPrefix}-post-${idx}-url`}
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Enlace a la publicación (opcional)
                </label>
                <input
                  id={`${idPrefix}-post-${idx}-url`}
                  type="url"
                  maxLength={500}
                  value={post.postUrl}
                  onChange={(e) => updatePost(idx, { postUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
