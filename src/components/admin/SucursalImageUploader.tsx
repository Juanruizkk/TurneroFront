import React, { useRef, useState } from 'react';
import { ImageIcon, UploadIcon, Trash2Icon, Loader2Icon, AlertCircleIcon } from 'lucide-react';
import { ajustesApi } from '../../api/ajustes';

const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp,image/gif';
const MAX_MB = 5;

interface SucursalImageUploaderProps {
  tipo: 'logo' | 'background';
  sucursalId: string;
  currentUrl?: string;
  onUpdate: (url: string | null) => void;
}

export function SucursalImageUploader({
  tipo,
  sucursalId,
  currentUrl,
  onUpdate,
}: SucursalImageUploaderProps) {
  const inputRef           = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removing,  setRemoving]  = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const isBackground = tipo === 'background';

  // ─── Upload ──────────────────────────────────────────────────────────────

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`El archivo supera el límite de ${MAX_MB} MB.`);
      e.target.value = '';
      return;
    }

    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await ajustesApi.subirImagen(sucursalId, tipo, formData);
      onUpdate(result.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir la imagen.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // ─── Remove ──────────────────────────────────────────────────────────────

  const handleRemove = async () => {
    setError(null);
    setRemoving(true);
    try {
      await ajustesApi.eliminarImagen(sucursalId, tipo);
      onUpdate(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar la imagen.');
    } finally {
      setRemoving(false);
    }
  };

  const isLoading = uploading || removing;

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-2">
      {isBackground ? (
        /* ── Banner preview (background) ── */
        <div
          className="relative w-full h-32 rounded-xl border-2 border-dashed border-border bg-surface-background overflow-hidden flex items-center justify-center"
          style={currentUrl ? { backgroundImage: `url(${currentUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
        >
          {!currentUrl && (
            <div className="flex flex-col items-center gap-1 text-text-muted pointer-events-none">
              <ImageIcon className="w-8 h-8" />
              <span className="text-xs">Sin imagen de fondo</span>
            </div>
          )}

          {/* Overlay con acciones */}
          <div className={`absolute inset-0 flex items-center justify-center gap-2 transition-opacity duration-150 ${currentUrl ? 'opacity-0 hover:opacity-100 bg-black/40' : 'opacity-100'}`}>
            {isLoading ? (
              <Loader2Icon className="w-6 h-6 text-white animate-spin" />
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/90 hover:bg-white text-text-primary text-xs font-medium rounded-lg transition-colors shadow"
                >
                  <UploadIcon className="w-3.5 h-3.5" />
                  {currentUrl ? 'Cambiar' : 'Subir imagen'}
                </button>
                {currentUrl && (
                  <button
                    type="button"
                    onClick={handleRemove}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-error/90 hover:bg-error text-white text-xs font-medium rounded-lg transition-colors shadow"
                  >
                    <Trash2Icon className="w-3.5 h-3.5" />
                    Eliminar
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        /* ── Square preview (logo) ── */
        <div className="flex items-start gap-3">
          <div className="relative w-20 h-20 flex-shrink-0 rounded-xl border-2 border-dashed border-border bg-surface-background overflow-hidden flex items-center justify-center group">
            {currentUrl ? (
              <img src={currentUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="w-7 h-7 text-text-muted" />
            )}

            {/* Overlay en hover */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              {isLoading ? (
                <Loader2Icon className="w-5 h-5 text-white animate-spin" />
              ) : (
                <UploadIcon
                  className="w-5 h-5 text-white cursor-pointer"
                  onClick={() => inputRef.current?.click()}
                />
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-border bg-surface hover:bg-surface-background text-text-primary text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <Loader2Icon className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <UploadIcon className="w-3.5 h-3.5" />
              )}
              {uploading ? 'Subiendo…' : currentUrl ? 'Cambiar logo' : 'Subir logo'}
            </button>

            {currentUrl && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-error/30 bg-error/5 hover:bg-error/10 text-error text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {removing ? (
                  <Loader2Icon className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2Icon className="w-3.5 h-3.5" />
                )}
                {removing ? 'Eliminando…' : 'Eliminar logo'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-error">
          <AlertCircleIcon className="w-3.5 h-3.5 flex-shrink-0" />
          {error}
        </p>
      )}

      {/* Hint */}
      <p className="text-xs text-text-muted">
        JPG, PNG o WebP · Máx. {MAX_MB} MB
        {isBackground && ' · Recomendado: 1200 × 400 px'}
      </p>

      {/* Input oculto */}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        onChange={handleFileChange}
        className="hidden"
        disabled={isLoading}
      />
    </div>
  );
}
