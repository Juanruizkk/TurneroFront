import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Auth
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

// Public
import { Login } from './pages/public/Login';
import { Register } from './pages/public/Register';
import { AceptarInvitacion } from './pages/public/AceptarInvitacion';
import  Landing  from './pages/public/Landing';
import { BookingFlow } from './pages/public/BookingFlow';
import { TurnoToken } from './pages/public/TurnoToken';
import { PagoExitoso } from './pages/public/PagoExitoso';
import { PagoFallido } from './pages/public/PagoFallido';
import { ForgotPassword } from './pages/public/ForgotPassword';
import { ResetPassword } from './pages/public/ResetPassword';
import { SucursalPage } from './pages/public/SucursalPage';

// Admin layout
import { AdminLayout } from './components/admin/AdminLayout';

// SuperAdmin layout + pages
import { SuperAdminLayout } from './components/superadmin/SuperAdminLayout';
import { SuperAdminDashboard } from './pages/superadmin/SuperAdminDashboard';
import { Sucursales as SuperAdminSucursales } from './pages/superadmin/Sucursales';
import { CrearSucursal } from './pages/superadmin/CrearSucursal';
import { DetalleSucursal } from './pages/superadmin/DetalleSucursal';
import { Planes } from './pages/superadmin/Planes';
import { Suscripciones } from './pages/superadmin/Suscripciones';
import { Herramientas } from './pages/superadmin/Herramientas';

// Admin pages
import { Dashboard } from './pages/admin/Dashboard';
import { Agenda } from './pages/admin/Agenda';
import { AppointmentDetail } from './pages/admin/AppointmentDetail';
import { Clientes } from './pages/admin/Clientes';
import { Servicios } from './pages/admin/Servicios';
import { Caja } from './pages/admin/Caja';
import { Usuarios } from './pages/admin/Usuarios';
import { Ajustes } from './pages/admin/Ajustes';
import { Reportes } from './pages/admin/Reportes';
import { SuscripcionPage } from './pages/admin/SuscripcionPage';
import { OnboardingWizard } from './pages/admin/OnboardingWizard';

function AdminRoute({ children }: { children: React.ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>;
}

function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  return <SuperAdminLayout>{children}</SuperAdminLayout>;
}

export function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Routes>
          {/* ── Públicas (sin auth) ── */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/reservar" element={<BookingFlow />} />
          <Route path="/reserva/pago/exitoso" element={<PagoExitoso />} />
          <Route path="/reserva/pago/fallido" element={<PagoFallido />} />
          <Route path="/reserva/pago/pendiente" element={<PagoExitoso />} />
          <Route path="/turno/:token" element={<TurnoToken />} />
          <Route path="/invitacion/:token" element={<AceptarInvitacion />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/s/:slug" element={<SucursalPage />} />

          {/* ── Admin (requiere auth, cualquier rol no-superadmin) ── */}
          <Route path="/admin" element={<ProtectedRoute><AdminRoute><Dashboard /></AdminRoute></ProtectedRoute>} />
          <Route path="/admin/agenda" element={<ProtectedRoute><AdminRoute><Agenda /></AdminRoute></ProtectedRoute>} />
          <Route
            path="/admin/turno/:id"
            element={
              <ProtectedRoute>
                <AdminRoute>
                  <Agenda />
                  <AppointmentDetail />
                </AdminRoute>
              </ProtectedRoute>
            }
          />
          <Route path="/admin/turnos"   element={<ProtectedRoute><AdminRoute><Agenda /></AdminRoute></ProtectedRoute>} />
          <Route path="/admin/clientes" element={<ProtectedRoute><AdminRoute><Clientes /></AdminRoute></ProtectedRoute>} />
          <Route path="/admin/servicios" element={<ProtectedRoute><AdminRoute><Servicios /></AdminRoute></ProtectedRoute>} />
          <Route path="/admin/caja"     element={<ProtectedRoute><AdminRoute><Caja /></AdminRoute></ProtectedRoute>} />
          <Route path="/admin/usuarios" element={<ProtectedRoute><AdminRoute><Usuarios /></AdminRoute></ProtectedRoute>} />
          <Route path="/admin/ajustes"   element={<ProtectedRoute><AdminRoute><Ajustes /></AdminRoute></ProtectedRoute>} />
          <Route path="/admin/reportes"     element={<ProtectedRoute><AdminRoute><Reportes /></AdminRoute></ProtectedRoute>} />
          <Route path="/admin/suscripcion" element={<ProtectedRoute><AdminRoute><SuscripcionPage /></AdminRoute></ProtectedRoute>} />
          <Route path="/admin/onboarding" element={<ProtectedRoute><OnboardingWizard /></ProtectedRoute>} />

          {/* ── Super Admin (requiere esSuperAdmin) ── */}
          <Route path="/superadmin" element={<ProtectedRoute soloSuperAdmin><SuperAdminRoute><SuperAdminDashboard /></SuperAdminRoute></ProtectedRoute>} />
          <Route path="/superadmin/sucursales" element={<ProtectedRoute soloSuperAdmin><SuperAdminRoute><SuperAdminSucursales /></SuperAdminRoute></ProtectedRoute>} />
          <Route path="/superadmin/sucursales/nueva" element={<ProtectedRoute soloSuperAdmin><SuperAdminRoute><CrearSucursal /></SuperAdminRoute></ProtectedRoute>} />
          <Route path="/superadmin/sucursales/:id" element={<ProtectedRoute soloSuperAdmin><SuperAdminRoute><DetalleSucursal /></SuperAdminRoute></ProtectedRoute>} />
          <Route path="/superadmin/planes" element={<ProtectedRoute soloSuperAdmin><SuperAdminRoute><Planes /></SuperAdminRoute></ProtectedRoute>} />
          <Route path="/superadmin/suscripciones" element={<ProtectedRoute soloSuperAdmin><SuperAdminRoute><Suscripciones /></SuperAdminRoute></ProtectedRoute>} />
          <Route path="/superadmin/herramientas" element={<ProtectedRoute soloSuperAdmin><SuperAdminRoute><Herramientas /></SuperAdminRoute></ProtectedRoute>} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
