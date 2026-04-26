# Gestión de sesiones y autenticación

## Contexto

MetaTurnos es una plataforma multi-tenant donde un mismo usuario puede pertenecer a varias sucursales con roles distintos. Además existe un rol especial **SuperAdmin** que gestiona toda la plataforma sin pertenecer a ninguna sucursal en particular.

Esta documentación describe cómo se gestionan las sesiones, el aislamiento entre sucursales y el comportamiento de autenticación por rol.

---

## Almacenamiento de sesión — `sessionStorage`

### Por qué sessionStorage y no localStorage

La sesión se guarda exclusivamente en `sessionStorage` bajo la clave `turnero_session`.

| | `localStorage` (descartado) | `sessionStorage` (actual) |
|---|---|---|
| Alcance | Compartido entre todas las tabs | Exclusivo por tab |
| Persistencia | Sobrevive al cierre del browser | Se pierde al cerrar la tab |
| Multi-sucursal | Tab2 sobreescribe la sesión de Tab1 | Cada tab es completamente independiente |

### Consecuencia práctica

Un usuario con dos sucursales puede tener **Tab1 → SucursalA** y **Tab2 → SucursalB** al mismo tiempo sin que las sesiones interfieran. Los datos, el token JWT y el contexto de cada tab son 100% aislados.

Al abrir una nueva tab no se recupera la sesión automáticamente — es necesario loguearse de nuevo. Esto es intencional: garantiza que la nueva tab arranque limpia, sin asumir ningún contexto de sucursal.

### Estructura de la sesión guardada

```typescript
interface SessionUser {
  token: string;          // JWT Bearer
  rol: RolSession;        // 'SuperAdmin' | 'Administrativo' | 'Profesional' | 'Caja'
  nombre: string;
  apellido: string;
  email: string;
  esSuperAdmin: boolean;  // true solo para el SuperAdmin global
  esOwner: boolean;       // true si es dueño de la sucursal
  userId?: string;        // null para SuperAdmin
  sucursalId?: string;    // null para SuperAdmin
  permisos: PermisoSistema[];
}
```

### Archivos involucrados

| Archivo | Rol |
|---|---|
| `src/contexts/AuthContext.tsx` | Lee y escribe la sesión en `sessionStorage` |
| `src/api/client.ts` | Lee el token de `sessionStorage` para inyectarlo en cada request HTTP |

---

## Flujo de login

```
Usuario ingresa email + password
        ↓
POST /api/auth/login
        ↓
┌─────────────────────────────────────┐
│  ¿requiereSeleccion?                │
│  (usuario tiene 2+ sucursales)      │
└─────────────────────────────────────┘
       NO ↓                    SÍ ↓
  Guardar sesión          Mostrar SucursalSelector
  en sessionStorage              ↓
        ↓             Usuario elige sucursal
  Redirigir según rol            ↓
                       POST /api/auth/seleccionar-sucursal
                               ↓
                         Guardar sesión en sessionStorage
                               ↓
                         Redirigir según rol
```

### Lógica de redirección post-login

```typescript
// src/contexts/AuthContext.tsx → getHomeRoute()
export function getHomeRoute(user: SessionUser): string {
  if (user.esSuperAdmin) return '/superadmin';
  if (user.rol === 'Caja')  return '/admin/caja';
  return '/admin';
}
```

**Importante:** si el usuario es SuperAdmin, siempre se redirige a `/superadmin` sin importar si había un redirect pendiente (`from`) de una sesión anterior. Esto evita que el SA termine en el panel de una sucursal por un redirect stale.

```typescript
// src/pages/public/Login.tsx
const destination = result.user.esSuperAdmin
  ? '/superadmin'
  : (from ?? getHomeRoute(result.user));
navigate(destination, { replace: true });
```

---

## Roles y permisos

### Roles disponibles

| Rol | Descripción |
|---|---|
| `SuperAdmin` | Acceso global a toda la plataforma. No pertenece a ninguna sucursal. |
| `Administrativo` | Gestión completa de la sucursal (turnos, usuarios, caja, ajustes). |
| `Profesional` | Acceso limitado a su agenda y servicios asignados. |
| `Caja` | Acceso exclusivo al módulo de caja y cobranzas. |

### Permisos granulares

Los roles `Profesional` y `Caja` pueden tener permisos adicionales configurados por el owner:

| Permiso | Descripción |
|---|---|
| `AgendarTurnos` | Crear y gestionar turnos |
| `EditarTurnos` | Modificar turnos existentes |
| `CargarCobranzas` | Registrar pagos en caja |
| `VerTelefonoClientes` | Ver el número de teléfono de los clientes |
| `GestionarAjustes` | Acceder a la configuración de la sucursal |

Los roles `Administrativo` y `SuperAdmin` tienen todos los permisos automáticamente. El `esOwner` también.

### Helper de verificación

```typescript
// src/contexts/AuthContext.tsx
export function tienePermiso(user: SessionUser | null, permiso: PermisoSistema): boolean {
  if (!user) return false;
  if (user.esSuperAdmin || user.esOwner || user.rol === 'Administrativo') return true;
  return (user.permisos ?? []).includes(permiso);
}
```

---

## Protección de rutas

### `ProtectedRoute`

Componente que envuelve las rutas privadas. Aplica tres validaciones en orden:

```typescript
// src/components/auth/ProtectedRoute.tsx

// 1. Si no está autenticado → login (guarda la ruta actual como `from`)
if (!isAuthenticated) {
  return <Navigate to="/login" state={{ from: location.pathname }} replace />;
}

// 2. Si la ruta requiere soloSuperAdmin y el usuario no lo es → /admin
if (soloSuperAdmin && !user.esSuperAdmin) {
  return <Navigate to="/admin" replace />;
}

// 3. Si el SA intenta acceder a una ruta de sucursal → /superadmin
if (user.esSuperAdmin && !soloSuperAdmin) {
  return <Navigate to="/superadmin" replace />;
}
```

La validación 3 es la segunda línea de defensa contra el bug de routing del SA: aunque el redirect `from` o una URL manual lleve al SA a `/admin/...`, el guard lo devuelve a `/superadmin`.

### Uso en el router

```typescript
// Ruta de SuperAdmin — solo SA puede acceder
<Route path="/superadmin/*"
  element={
    <ProtectedRoute soloSuperAdmin>
      <SuperAdminLayout />
    </ProtectedRoute>
  }
/>

// Rutas de sucursal — cualquier rol autenticado excepto SA
<Route path="/admin/*"
  element={
    <ProtectedRoute>
      <AdminLayout />
    </ProtectedRoute>
  }
/>
```

---

## JWT y claims

El backend emite un JWT con los siguientes claims para cada tipo de usuario:

### Usuario regular (Administrativo / Profesional / Caja)
```json
{
  "sub": "<userId>",
  "email": "usuario@negocio.com",
  "role": "Administrativo",
  "esSuperAdmin": "false",
  "esOwner": "true",
  "nombre": "Juan",
  "apellido": "Pérez",
  "sucursalId": "<guid>",
  "userId": "<guid>",
  "permiso": ["AgendarTurnos", "EditarTurnos"]
}
```

### SuperAdmin
```json
{
  "sub": "superadmin",
  "email": "superadmin@turneroapp.com",
  "role": "SuperAdmin",
  "esSuperAdmin": "true",
  "esOwner": "false",
  "nombre": "Super",
  "apellido": "Admin"
}
```

El SA **no tiene** `sucursalId` ni `userId` en el token. El backend usa este claim para aplicar los filtros multi-tenant en cada query — la ausencia de `sucursalId` asegura que el SA no acceda accidentalmente a datos de una sucursal específica.

---

## Escenarios multi-sucursal

### Escenario 1: usuario con una sucursal

```
Login → backend devuelve token directo → sesión guardada → /admin
```

### Escenario 2: usuario con múltiples sucursales

```
Login → backend devuelve { requiereSeleccion: true, opciones: [...] }
     → frontend muestra SucursalSelector
     → usuario elige SucursalA
     → POST /auth/seleccionar-sucursal con { seleccionToken, sucursalId }
     → backend devuelve token con sucursalId de SucursalA
     → sesión guardada en sessionStorage de esta tab
     → /admin (con contexto de SucursalA)
```

Para acceder a SucursalB simultáneamente, el usuario abre **una nueva tab** y repite el proceso. Cada tab tiene su propia sesión independiente.

### Escenario 3: SuperAdmin

```
Login → backend devuelve token sin sucursalId, esSuperAdmin: true
     → sesión guardada → /superadmin (siempre, sin excepciones)
```

---

## Logout

Al hacer logout se limpia la sesión de la tab actual:

```typescript
const logout = useCallback(() => {
  sessionStorage.removeItem(STORAGE_KEY);
  setUser(null);
}, []);
```

Solo afecta la tab actual. Las otras tabs mantienen sus sesiones intactas.
