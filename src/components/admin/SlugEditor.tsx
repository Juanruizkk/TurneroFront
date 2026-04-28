import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircleIcon, XCircleIcon, Loader2Icon, LinkIcon, SaveIcon, CheckIcon, ExternalLinkIcon, CopyIcon } from 'lucide-react';
import { ajustesApi } from '../../api/ajustes';

// ─── Constantes ───────────────────────────────────────────────────────────────

const MAX_LEN = 30;
const MIN_LEN = 3;
const DEBOUNCE_MS = 600;

const PALABRAS_PROHIBIDAS = new Set([
  'admin', 'api', 'login', 'register', 'dashboard', 'app',
  'planes', 'pricing', 'soporte', 'www', 'superadmin', 'publico',
  'auth', 'reset', 'forgot', 'invitacion', 'turno', 'reservar', 'pago',
]);

const PUBLIC_BASE =
  (typeof import.meta !== 'undefined' &&
    (import.meta as { env?: Record<string, string> }).env?.VITE_PUBLIC_URL) ??
  'https://metaturnos.com';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizarSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // elimina diacríticos
    .replace(/[^a-z0-9\s-]/g, '')      // solo letras, números, espacios y guiones
    .replace(/\s+/g, '-')              // espacios → guión
    .replace(/-+/g, '-')               // colapsar guiones múltiples
    .slice(0, MAX_LEN);
}

type ValidationError =
  | 'empty'
  | 'too-short'
  | 'too-long'
  | 'invalid-chars'
  | 'leading-trailing-hyphen'
  | 'forbidden';

function validarSlug(slug: string): ValidationError | null {
  if (!slug) return 'empty';
  if (slug.length < MIN_LEN) return 'too-short';
  if (slug.length > MAX_LEN) return 'too-long';
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) && !/^[a-z0-9]$/.test(slug))
    return 'leading-trailing-hyphen';
  if (!/^[a-z0-9-]+$/.test(slug)) return 'invalid-chars';
  if (PALABRAS_PROHIBIDAS.has(slug)) return 'forbidden';
  return null;
}

const ERROR_MESSAGES: Record<ValidationError, string> = {
  'empty':                  'El slug no puede estar vacío.',
  'too-short':              `Mínimo ${MIN_LEN} caracteres.`,
  'too-long':               `Máximo ${MAX_LEN} caracteres.`,
  'invalid-chars':          'Solo letras minúsculas, números y guiones.',
  'leading-trailing-hyphen':'No puede empezar ni terminar con guión.',
  'forbidden':              'Esta palabra está reservada y no puede usarse como slug.',
};

// ─── Tipos de estado ─────────────────────────────────────────────────────────

type CheckStatus = 'idle' | 'unchanged' | 'checking' | 'available' | 'taken' | 'invalid';

// ─── Componente ───────────────────────────────────────────────────────────────

interface SlugEditorProps {
  sucursalId: string;
}

export function SlugEditor({ sucursalId }: SlugEditorProps) {
  const [originalSlug, setOriginalSlug] = useState<string>('');
  const [slug, setSlug]                 = useState<string>('');
  const [loadingSlug, setLoadingSlug]   = useState(true);

  const [validationError, setValidationError] = useState<ValidationError | null>(null);
  const [checkStatus, setCheckStatus]         = useState<CheckStatus>('idle');

  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [copied, setCopied]   = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Cargar slug inicial ────────────────────────────────────────────────────

  useEffect(() => {
    ajustesApi.obtenerSlug(sucursalId)
      .then(({ slug: s }) => {
        setOriginalSlug(s);
        setSlug(s);
        setCheckStatus('unchanged');
      })
      .catch(() => {/* sigue con vacío */})
      .finally(() => setLoadingSlug(false));
  }, [sucursalId]);

  // ─── Validación + debounce de disponibilidad ────────────────────────────────

  const runCheck = useCallback((value: string, original: string) => {
    const err = validarSlug(value);
    setValidationError(err);

    if (err) {
      setCheckStatus('invalid');
      return;
    }

    if (value === original) {
      setCheckStatus('unchanged');
      return;
    }

    setCheckStatus('checking');

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const { disponible } = await ajustesApi.checkSlugDisponible(sucursalId, value);
        setCheckStatus(disponible ? 'available' : 'taken');
      } catch {
        setCheckStatus('idle');
      }
    }, DEBOUNCE_MS);
  }, [sucursalId]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const normalized = normalizarSlug(e.target.value);
    setSlug(normalized);
    setSaved(false);
    setSaveError(null);
    runCheck(normalized, originalSlug);
  };

  const handleSave = async () => {
    const err = validarSlug(slug);
    if (err || checkStatus === 'taken' || checkStatus === 'checking') return;

    setSaving(true);
    setSaveError(null);
    try {
      const result = await ajustesApi.actualizarSlug(sucursalId, slug);
      setOriginalSlug(result.slug);
      setSlug(result.slug);
      setCheckStatus('unchanged');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Error al guardar el slug.');
    } finally {
      setSaving(false);
    }
  };

  // ─── Render helpers ──────────────────────────────────────────────────────────

  const canSave =
    !validationError &&
    checkStatus === 'available' &&
    slug !== originalSlug &&
    !saving;

  const statusIcon = (() => {
    if (checkStatus === 'checking') return <Loader2Icon className="w-4 h-4 text-text-muted animate-spin" />;
    if (checkStatus === 'available') return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
    if (checkStatus === 'taken') return <XCircleIcon className="w-4 h-4 text-error" />;
    if (checkStatus === 'invalid') return <XCircleIcon className="w-4 h-4 text-error" />;
    return null;
  })();

  const statusMessage = (() => {
    if (validationError) return { text: ERROR_MESSAGES[validationError], color: 'text-error' };
    if (checkStatus === 'checking') return { text: 'Verificando disponibilidad…', color: 'text-text-muted' };
    if (checkStatus === 'available') return { text: 'Disponible.', color: 'text-green-600' };
    if (checkStatus === 'taken') return { text: 'Este slug ya está en uso por otra sucursal.', color: 'text-error' };
    if (checkStatus === 'unchanged') return { text: 'Este es tu slug actual.', color: 'text-text-muted' };
    return null;
  })();

  const publicUrl = `${PUBLIC_BASE}/s/${slug || '…'}`;

  if (loadingSlug) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-10 bg-surface-background rounded-lg" />
        <div className="h-8 w-64 bg-surface-background rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Input + ícono de estado */}
      <div>
        <div className="relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <LinkIcon className="w-4 h-4 text-text-muted" />
          </div>
          <input
            type="text"
            value={slug}
            onChange={handleChange}
            maxLength={MAX_LEN}
            placeholder="mi-negocio"
            className="w-full pl-9 pr-10 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-text-muted"
          />
          {statusIcon && (
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
              {statusIcon}
            </div>
          )}
        </div>

        {/* Contador de caracteres */}
        <div className="flex items-center justify-between mt-1">
          {statusMessage ? (
            <p className={`text-xs ${statusMessage.color}`}>{statusMessage.text}</p>
          ) : (
            <span />
          )}
          <span className={`text-xs tabular-nums ${slug.length >= MAX_LEN ? 'text-error' : 'text-text-muted'}`}>
            {slug.length}/{MAX_LEN}
          </span>
        </div>
      </div>

      {/* Vista previa URL */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-surface-background border border-border rounded-lg">
        <ExternalLinkIcon className="w-4 h-4 text-text-muted flex-shrink-0" />
        <span className="text-xs text-text-muted flex-shrink-0">URL pública:</span>
        <span className="text-xs font-mono text-text-primary truncate flex-1">
          <span className="text-text-muted">{PUBLIC_BASE}/s/</span>
          <span className={slug ? 'text-primary font-semibold' : 'text-text-muted italic'}>
            {slug || '…'}
          </span>
        </span>
        {slug && (
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(publicUrl);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            title="Copiar URL"
            className="flex-shrink-0 text-text-muted hover:text-primary transition-colors"
          >
            {copied ? (
              <CheckIcon className="w-4 h-4 text-green-500" />
            ) : (
              <CopyIcon className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* Error de guardado */}
      {saveError && (
        <p className="text-xs text-error flex items-center gap-1.5">
          <XCircleIcon className="w-3.5 h-3.5 flex-shrink-0" />
          {saveError}
        </p>
      )}

      {/* Botón guardar */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className="flex items-center gap-2 bg-primary text-white hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed rounded-button px-4 py-2 text-sm font-medium transition-all"
        >
          {saving ? (
            <Loader2Icon className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <CheckIcon className="w-4 h-4" />
          ) : (
            <SaveIcon className="w-4 h-4" />
          )}
          {saving ? 'Guardando…' : saved ? 'Slug actualizado' : 'Guardar slug'}
        </button>

        {slug !== originalSlug && !saving && (
          <button
            type="button"
            onClick={() => {
              setSlug(originalSlug);
              setCheckStatus('unchanged');
              setValidationError(null);
              setSaveError(null);
            }}
            className="text-sm text-text-muted hover:text-text-primary transition-colors"
          >
            Cancelar
          </button>
        )}
      </div>

      {/* Nota informativa */}
      <p className="text-xs text-text-muted leading-relaxed">
        El slug identifica tu negocio en la URL pública. Si lo cambiás, los links anteriores
        dejarán de funcionar. Usá solo letras, números y guiones.
      </p>
    </div>
  );
}
