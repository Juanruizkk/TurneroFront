# Public Launch — Simplificar UI de Suscripción Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar toda la UI de upgrade/pago de suscripción del panel de admin y reemplazarla por una página informativa de uso que muestre los límites del plan gratuito.

**Architecture:** Dos archivos principales a modificar. `AdminLayout.tsx` pierde el banner de alerta y la llamada a la API de suscripción. `SuscripcionPage.tsx` se reescribe: conserva los `UsageBar` con las barras de uso (usuarios, turnos/mes) y el card del plan actual, elimina `PlanCard`, `AlertBanner`, historial de pagos y toda la lógica de `iniciarPago`.

**Tech Stack:** React 18, TypeScript, Framer Motion, Lucide React, Tailwind CSS. Frontend en `C:\JUAN RUIZ\TurneroAPP\frontend\turnero-ui\src`. No hay tests de componentes en este proyecto — verificar en browser navegando a `/admin/suscripcion`.

---

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/admin/AdminLayout.tsx` | Eliminar banner de suscripción + llamada a `suscripcionApi` |
| `src/pages/admin/SuscripcionPage.tsx` | Reescribir: solo info del plan + barras de uso |

---

## Task 1: Eliminar banner de suscripción de AdminLayout

**Files:**
- Modify: `src/components/admin/AdminLayout.tsx`

El banner está en las líneas 409–441. También hay que eliminar el estado `suscripcion` (línea 84), la llamada `suscripcionApi.getSuscripcion()` (líneas 156–159) y los imports que queden sin usar.

- [ ] **Step 1: Eliminar el import de `suscripcionApi` y el type `SuscripcionInfo`**

En `src/components/admin/AdminLayout.tsx`, remover las líneas:
```typescript
// Eliminar estas dos líneas:
import { suscripcionApi } from '../../api/suscripcion';
import type { SuscripcionInfo } from '../../types';
```

- [ ] **Step 2: Eliminar el estado de suscripción**

Remover la línea:
```typescript
// Eliminar esta línea (era línea 84):
const [suscripcion, setSuscripcion] = useState<SuscripcionInfo | null>(null);
```

- [ ] **Step 3: Eliminar la llamada a la API de suscripción dentro del useEffect**

El `useEffect` de la línea ~150 tiene dos llamadas: `publicoApi.perfil()` (conservar) y `suscripcionApi.getSuscripcion()` (eliminar). Debe quedar:

```typescript
useEffect(() => {
  if (user?.sucursalId) {
    publicoApi.perfil(user.sucursalId)
      .then((p) => setSucursalNombre(p.nombre))
      .catch(() => {});
  }
}, [user?.sucursalId]);
```

- [ ] **Step 4: Eliminar el banner de alerta de suscripción del JSX**

Buscar y eliminar el bloque completo (era líneas 409–441):
```typescript
{/* Subscription alert banner */}
{suscripcion && (suscripcion.estado === 'PruebActiva' || ...) && (
  <div ...>
    ...
    <Link to="/admin/suscripcion" ...>Ver suscripción</Link>
  </div>
)}
```
El bloque va desde `{/* Subscription alert banner */}` hasta su `)}` de cierre, justo antes de `{/* Content */}`.

- [ ] **Step 5: Verificar que `CreditCardIcon` sigue en uso**

`CreditCardIcon` se usa en `navSections` (línea 72 del array). No eliminarlo. Sí verificar que no queden otros imports sin usar (`AlertTriangleIcon` del banner, etc.). `AlertTriangleIcon` **sí** queda sin usar — eliminarlo del import de lucide-react:

```typescript
// Antes:
import {
  ...
  AlertTriangleIcon,
  CreditCardIcon,
  BookOpenIcon,
} from 'lucide-react';

// Después (sin AlertTriangleIcon):
import {
  ...
  CreditCardIcon,
  BookOpenIcon,
} from 'lucide-react';
```

- [ ] **Step 6: Commit**

```bash
cd "C:\JUAN RUIZ\TurneroAPP\frontend\turnero-ui"
git add src/components/admin/AdminLayout.tsx
git commit -m "feat: eliminar banner de alerta de suscripción del layout"
```

---

## Task 2: Reescribir SuscripcionPage como página informativa

**Files:**
- Modify: `src/pages/admin/SuscripcionPage.tsx`

Conservar: `UsageBar` (barras de progreso), helpers `pct`/`barColor`/`textColor`, estado actual del plan (nombre + "Gratuito").
Eliminar: `PlanCard`, `AlertBanner`, historial de pagos, lógica `iniciarPago`, parámetros de URL `?pago=`.
Simplificar: un solo `useEffect` que solo carga `suscripcionApi.getSuscripcion()`.

- [ ] **Step 1: Reemplazar el contenido completo del archivo**

Reemplazar `src/pages/admin/SuscripcionPage.tsx` con:

```typescript
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  SparklesIcon,
  UsersIcon,
  CalendarDaysIcon,
  BadgeCheckIcon,
  LockIcon,
  AlertTriangleIcon,
  CheckIcon,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { suscripcionApi } from '../../api/suscripcion';
import type { SuscripcionInfo } from '../../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pct(actual: number, max: number | null): number {
  if (max === null || max === 0) return 0;
  return Math.min(100, Math.round((actual / max) * 100));
}

function barColor(p: number): string {
  if (p >= 90) return 'bg-red-500';
  if (p >= 75) return 'bg-amber-400';
  return 'bg-primary';
}

function textColor(p: number): string {
  if (p >= 90) return 'text-red-600';
  if (p >= 75) return 'text-amber-600';
  return 'text-primary';
}

// ─── UsageBar ─────────────────────────────────────────────────────────────────

function UsageBar({
  label,
  icon: Icon,
  actual,
  max,
}: {
  label: string;
  icon: React.ElementType;
  actual: number;
  max: number | null;
}) {
  const p = pct(actual, max);
  const ilimitado = max === null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-text-secondary font-medium">
          <Icon className="w-4 h-4" />
          {label}
        </span>
        <span className={`font-semibold ${ilimitado ? 'text-text-secondary' : textColor(p)}`}>
          {ilimitado ? `${actual} / ∞` : `${actual} / ${max}`}
        </span>
      </div>
      {!ilimitado && (
        <div className="h-2 bg-border rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${p}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={`h-full rounded-full ${barColor(p)}`}
          />
        </div>
      )}
      {ilimitado && (
        <div className="h-2 bg-border rounded-full overflow-hidden">
          <div className="h-full w-full bg-primary/20 rounded-full" />
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function SuscripcionPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [suscripcion, setSuscripcion] = useState<SuscripcionInfo | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  useEffect(() => {
    if (!user?.sucursalId) return;
    suscripcionApi.getSuscripcion(user.sucursalId)
      .then(setSuscripcion)
      .catch(() => setError('No se pudo cargar la información del plan.'))
      .finally(() => setLoading(false));
  }, [user?.sucursalId]);

  // ── Guards ────────────────────────────────────────────────────────────────
  if (!user?.esOwner) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <LockIcon className="w-12 h-12 text-text-muted" />
        <h2 className="text-xl font-heading font-bold text-text-primary">Acceso restringido</h2>
        <p className="text-text-muted max-w-sm">
          Solo el propietario de la cuenta puede ver esta información.
        </p>
        <button
          onClick={() => navigate('/admin')}
          className="mt-2 px-4 py-2 bg-primary text-white rounded-button text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Volver al panel
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !suscripcion) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center">
        <AlertTriangleIcon className="w-10 h-10 text-error" />
        <p className="text-text-muted">{error ?? 'Error inesperado.'}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-white rounded-button text-sm hover:bg-primary/90 transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* ── Plan actual ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-surface rounded-2xl border border-border p-6 space-y-6"
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <SparklesIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-heading font-bold text-text-primary">
                Plan {suscripcion.planNombre}
              </h2>
              <p className="text-sm text-text-muted">Gratuito</p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-success/10 text-success">
            <BadgeCheckIcon className="w-3 h-3" /> Activa
          </span>
        </div>

        {/* Usage bars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          <UsageBar
            label="Usuarios"
            icon={UsersIcon}
            actual={suscripcion.usuariosActuales}
            max={suscripcion.maxUsuarios < 999 ? suscripcion.maxUsuarios : null}
          />
          <UsageBar
            label="Turnos este mes"
            icon={CalendarDaysIcon}
            actual={suscripcion.turnosMesActual}
            max={suscripcion.maxTurnosMes}
          />
        </div>
      </motion.div>

      {/* ── Qué incluye el plan ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-surface rounded-2xl border border-border p-6"
      >
        <h3 className="font-heading font-semibold text-text-primary mb-4">¿Qué incluye?</h3>
        <ul className="space-y-3">
          {[
            `Hasta ${suscripcion.maxUsuarios < 999 ? suscripcion.maxUsuarios : '∞'} usuarios`,
            suscripcion.maxTurnosMes
              ? `Hasta ${suscripcion.maxTurnosMes} turnos por mes`
              : 'Turnos ilimitados',
            'Reportes y estadísticas',
            'Gestión de clientes, servicios y caja',
            'Notificaciones en tiempo real',
          ].map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-sm text-text-secondary">
              <CheckIcon className="w-4 h-4 text-success flex-shrink-0" />
              {feature}
            </li>
          ))}
        </ul>
      </motion.div>

    </div>
  );
}
```

- [ ] **Step 2: Verificar que el archivo compila correctamente**

```bash
cd "C:\JUAN RUIZ\TurneroAPP\frontend\turnero-ui"
npx tsc --noEmit
```

Esperado: sin errores de tipo. Warnings de otros archivos son ignorables.

- [ ] **Step 3: Verificar en browser**

Con el frontend corriendo (`npm run dev` desde `turnero-ui/`), navegar a `/admin/suscripcion`. Verificar:
- Se muestra "Plan Base Gratuito" con badge "Activa"
- Se ven las barras de uso (usuarios y turnos)
- Se ve la sección "¿Qué incluye?"
- NO aparecen tarjetas de planes ni botones de pago
- NO aparece historial de pagos
- En el layout NO aparece ningún banner de suscripción en la topbar

- [ ] **Step 4: Commit**

```bash
git add src/pages/admin/SuscripcionPage.tsx
git commit -m "feat: simplificar SuscripcionPage — solo uso del plan, sin upgrade ni pagos"
```

---

## Verificación final

- [ ] Navegar a `/admin` — sin banner de suscripción en ningún estado
- [ ] Navegar a `/admin/suscripcion` — solo muestra uso (barras) + features del plan
- [ ] Navegar como usuario no-Owner — muestra pantalla de "Acceso restringido"
- [ ] Verificar que las páginas SuperAdmin (`/superadmin/planes`, `/superadmin/suscripciones`) siguen funcionando sin cambios

---

## Notas

- `ConectarMercadoPagoButton` en `/admin/ajustes` **se conserva** — es para que las sucursales conecten su cuenta MP para recibir señas de turnos (independiente del sistema de suscripción).
- Las páginas `/superadmin/planes` y `/superadmin/suscripciones` **se conservan** — son herramientas de admin interno, no UI de usuario.
- El código de `suscripcionApi.iniciarPago()` queda en `src/api/suscripcion.ts` pero sin consumidores — dormant, como acordado.
