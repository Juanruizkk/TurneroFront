# TurneroApp — Frontend (React + Vite)

Interfaz web del sistema de gestión de turnos **MetaTurnos**: reserva pública sin cuenta y panel de administración para estéticas y peluquerías.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green)

> Proyecto open source. Parte de un ecosistema de 3 repos:
> [TurneroBack](https://github.com/Juanruizkk/TurneroBack) · **[TurneroFront](https://github.com/Juanruizkk/TurneroFront)** (este) · [turnero-devops](https://github.com/Juanruizkk/turnero-devops)

---

## ¿Qué incluye?

**Parte pública**
- **Landing** con la propuesta del negocio.
- **Reserva online** (`/reservar`) — flujo de 4-6 pasos sin necesidad de crear cuenta.
- **Gestión por token** (`/turno/:token`) — el cliente ve y gestiona su turno con un link.

**Panel de administración**
- **Dashboard** con métricas del día.
- **Agenda** en grilla por profesional, con drawer de detalle del turno.
- **Clientes**, **Servicios** y **Caja** (CRUD + movimientos).
- Actualizaciones en **tiempo real** vía SignalR.
- Exportación a **PDF/Excel** de reportes.

## Stack

| Área | Tecnología |
|------|-----------|
| Framework | React 18 + TypeScript |
| Build | Vite 5 |
| Estilos | Tailwind CSS 3 |
| Animaciones | Framer Motion |
| Íconos | lucide-react |
| Routing | React Router 7 |
| Gráficos | Recharts |
| Tiempo real | @microsoft/signalr |
| Export | jsPDF · xlsx · html2canvas |

## Cómo correrlo

Requisitos: [Node 20+](https://nodejs.org/) y el [backend](https://github.com/Juanruizkk/TurneroBack) corriendo en `http://localhost:5000`.

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
#   VITE_API_URL=/api
#   VITE_SUCURSAL_ID=<id de tu sucursal>

# 3. Levantar el dev server
npm run dev
```

La app queda en **http://localhost:5173**. El proxy de Vite redirige `/api` → `http://localhost:5000`.

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Dev server con HMR |
| `npm run build` | Type-check + build de producción |
| `npm run preview` | Previsualizar el build |
| `npm run lint` | ESLint |

## Estructura

```
src/
  api/          # Llamadas a la API por entidad (fetch-based)
  components/
    admin/      # AdminLayout (sidebar + topbar)
    ui/         # StatusBadge, PaymentBadge, StatCard, TimeSlot, Toast
  hooks/        # useToast, ...
  pages/
    public/     # Landing, BookingFlow, TurnoToken
    admin/      # Dashboard, Agenda, AppointmentDetail, Clientes, Servicios, Caja
  types/        # Tipos + helpers (formatMoneda, formatHora, ...)
```

## CI/CD

Cada push dispara el pipeline de GitHub Actions (4 jobs): build + ESLint + TypeScript → SBOM CycloneDX → Snyk (npm + Docker) → deploy. Ver [turnero-devops](https://github.com/Juanruizkk/turnero-devops).

## Licencia

MIT.
