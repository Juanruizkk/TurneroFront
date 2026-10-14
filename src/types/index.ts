// ─── Enums (string-based, matching backend) ──────────────────────────────────

export type EstadoTurno =
  | 'Pendiente'
  | 'Confirmado'
  | 'CanceladoCliente'
  | 'CanceladoStaff'
  | 'Completado'
  | 'NoShow'
  | 'Reprogramado'
  | 'PendientePago'
  | 'PagoRechazado';

export type OrigenTurno = 'Web' | 'Administrativo' | 'Profesional' | 'Caja' | 'Manual';

export type MedioPago = 'Efectivo' | 'MercadoPago' | 'Transferencia' | 'Tarjeta' | 'Otro';

export type ConceptoPagoTurno = 'Sena' | 'PagoParcial' | 'PagoTotal' | 'SaldoFinal' | 'Ajuste';

export type TipoSena = 'Fija' | 'Porcentaje';

export type ModalidadPrestacion = 'Presencial' | 'Maquina' | 'Tratamiento' | 'Otro' | 'Domicilio' | 'Online';

export type TipoServicio = 'Regular' | 'Variable';

export type ModoConfirmacionTurnos = 'Automatico' | 'Manual';

export type TipoMovimientoCaja =
  | 'CobroTurno'
  | 'Gasto'
  | 'Retiro'
  | 'Ajuste'
  | 'IngresoManual';

export type RolUsuario = 'Administrativo' | 'Profesional' | 'Caja';

export type PermisoSistema =
  | 'AgendarTurnos'
  | 'EditarTurnos'
  | 'CargarCobranzas'
  | 'VerTelefonoClientes'
  | 'GestionarAjustes';

export type EstadoUsuario = 'Activo' | 'Inactivo' | 'PendienteInvitacion';

// ─── Ajustes Sucursal ─────────────────────────────────────────────────────────

export type DiaSemana = 'Lunes' | 'Martes' | 'Miercoles' | 'Jueves' | 'Viernes' | 'Sabado' | 'Domingo';

export const DIAS_SEMANA: DiaSemana[] = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];

export const DIAS_LABELS: Record<DiaSemana, string> = {
  Lunes: 'Lunes', Martes: 'Martes', Miercoles: 'Miércoles',
  Jueves: 'Jueves', Viernes: 'Viernes', Sabado: 'Sábado', Domingo: 'Domingo',
};

export interface FranjaHoraria {
  apertura: string;
  cierre: string;
}

export interface HorarioDia {
  abierto: boolean;
  franjas: FranjaHoraria[];
}

export type HorariosAtencion = Record<DiaSemana, HorarioDia>;

export const RUBROS_DISPONIBLES = [
  'Masajes', 'Depilación', 'Tatuajes', 'Peluquería', 'Barbería',
  'Spa', 'Cejas y Pestañas', 'Uñas', 'Maquillaje', 'Tratamientos Faciales',
  'Bronceado', 'Podología', 'Kinesiología', 'Estética Corporal', 'Micropigmentación', 'Otro',
] as const;

export interface MonedaOpcion {
  codigo: string;
  simbolo: string;
  nombre: string;
}

export const MONEDAS: MonedaOpcion[] = [
  { codigo: 'ARS', simbolo: '$', nombre: 'Peso Argentino' },
  { codigo: 'USD', simbolo: 'U$D', nombre: 'Dólar Estadounidense' },
  { codigo: 'UYU', simbolo: '$U', nombre: 'Peso Uruguayo' },
  { codigo: 'CLP', simbolo: 'CLP$', nombre: 'Peso Chileno' },
  { codigo: 'BRL', simbolo: 'R$', nombre: 'Real Brasileño' },
  { codigo: 'EUR', simbolo: '€', nombre: 'Euro' },
];

export interface AjustesSucursal {
  nombre: string;
  slogan?: string;
  fotoUrl?: string;
  backgroundUrl?: string;
  rubros: string[];
  moneda: string;
  direccion: string;
  googleMapsUrl?: string;
  telefono: string;
  email: string;
  horariosAtencion: HorariosAtencion;
  minutosAnticipacionMinimaReserva: number;
  diasMaximosReservaFutura: number;
  minutosBufferEntreTurnos: number;
  permiteCancelacionCliente: boolean;
  horasMinimasCancelacion: number;
  enviaRecordatorioEmail: boolean;
  enviaRecordatorioWhatsapp: boolean;
  modoConfirmacionTurnos: ModoConfirmacionTurnos;
  mensajeWhatsApp24h?: string;
  mensajeWhatsApp3h?: string;
  // Integración bot de WhatsApp (add-on)
  botWhatsappHabilitado: boolean;   // solo lectura: lo habilita la plataforma
  chatwootInboxId?: number | null;  // editable si el add-on está habilitado
}

// ─── Públicos (booking online) ────────────────────────────────────────────────

export interface PerfilPublico {
  sucursalId: string;
  slug: string;
  nombre: string;
  slogan?: string;
  fotoUrl?: string;
  backgroundUrl?: string;
  rubros: string[];
  moneda: string;
  direccion: string;
  googleMapsUrl?: string;
  telefono: string;
  email: string;
  diasMaximosReservaFutura: number;
  horariosAtencion: HorariosAtencion;
}

export interface SlotDisponible {
  hora: string;
  profesionalId: string;
  profesionalNombre: string;
}

export interface ComentarioTurno {
  id: string;
  turnoId: string;
  autorUsuarioId: string;
  autorNombre: string;
  texto: string;
  fecha: string; // ISO 8601
}

export interface AdjuntoTurno {
  id: string;
  turnoId: string;
  url: string;
  publicId: string;
  nombreArchivo: string;
  tipoRecurso: 'image' | 'raw';
  fecha: string; // ISO 8601
}

// ─── API Entities (match backend responses) ───────────────────────────────────

export interface Sucursal {
  id: string;
  nombre: string;
  direccion: string;
  telefono: string;
  email: string;
  activa: boolean;
}

export interface Servicio {
  id: string;
  sucursalId: string;
  nombre: string;
  descripcion: string;
  aclaraciones: string;
  precio: number;
  duracionClienteMin: number;
  duracionAgendaMin: number;
  requiereSena: boolean;
  tipoSena: TipoSena | null;
  valorSena: number | null;
  modalidadPrestacion: ModalidadPrestacion;
  tipoServicio: TipoServicio;
  activo: boolean;
  /** Días de la semana habilitados (0=Dom … 6=Sáb). Vacío = todos los días. */
  diasDisponibles: number[];
}

export interface Cliente {
  id: string;
  sucursalId: string;
  nombre: string;
  apellido: string;
  telefono: string;
  email?: string;
  observaciones?: string;
  activo: boolean;
  fechaArchivado?: string;
  esFrecuente: boolean;
  tieneNoShow: boolean;
  totalTurnos: number;
  ultimaVisita?: string;
}

export interface ClienteFicha {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string;
  email?: string;
  observaciones?: string;
  activo: boolean;
  fechaArchivado?: string;
  totalTurnos: number;
  cantidadNoShow: number;
  cantidadCancelaciones: number;
  ultimoTurno?: string;
  proximoTurno?: string;
  totalCobrado: number;
  esFrecuente: boolean;
  tieneNoShow: boolean;
  historial: ClienteTurnoHistorial[];
  proximosTurnos: ClienteProximoTurno[];
}

export interface ClienteTurnoHistorial {
  turnoId: string;
  fecha: string;
  servicio: string;
  profesional: string;
  estado: string;
  precioServicio: number;
  totalCobrado: number;
  tuvoSena: boolean;
  tokenGestion?: string;
}

export interface ClienteProximoTurno {
  turnoId: string;
  fecha: string;
  servicio: string;
  profesional: string;
  estado: string;
}

/** Turno response from GET /api/turnos or POST /api/turnos */
export interface Turno {
  id: string;
  sucursalId: string;
  clienteId: string;
  clienteNombre: string;
  clienteTelefono: string;
  servicioId: string;
  servicioNombre: string;
  profesionalId: string;
  profesionalNombre: string;
  fechaHoraInicio: string; // ISO 8601: "2025-06-15T10:00:00"
  fechaHoraFin: string;
  estado: EstadoTurno;
  origen: OrigenTurno;
  observaciones?: string;
  tokenGestion: string;
  precioServicio: number;
  montoSena?: number;
  totalCobrado: number;
}

// ─── SuperAdmin ───────────────────────────────────────────────────────────────

export interface OwnerInfo {
  id: string;
  nombre: string;
  apellido: string;
  nombreCompleto: string;
  email: string;
  telefono: string;
  estado: string;
}

export interface SucursalSuperAdmin {
  id: string;
  nombre: string;
  direccion: string;
  telefono: string;
  email: string;
  activa: boolean;
  fechaCreacion: string; // ISO 8601
  owner?: OwnerInfo;
}

export interface OpcionSucursal {
  usuarioId: string;
  sucursalId: string;
  sucursalNombre: string;
  rol: string;
  esOwner: boolean;
}

export interface LoginResponseDto {
  // Caso 1: login directo (1 sucursal)
  token?: string;
  rol?: string;
  nombre?: string;
  apellido?: string;
  email?: string;
  esSuperAdmin?: boolean;
  esOwner?: boolean;
  userId?: string;
  sucursalId?: string;
  permisos?: PermisoSistema[];

  // Caso 2: múltiples sucursales — requiere selección
  requiereSeleccion?: boolean;
  seleccionToken?: string;
  opciones?: OpcionSucursal[];
}

export interface CrearSucursalConOwnerDto {
  nombre: string;
  direccion: string;
  telefono: string;
  email: string;
  ownerNombre: string;
  ownerApellido: string;
  ownerEmail: string;
  ownerTelefono: string;
  ownerPassword: string;
}

export interface ActualizarSucursalSuperAdminDto {
  nombre: string;
  direccion: string;
  telefono: string;
  email: string;
}

export interface HorarioLaboral {
  diaSemana: number; // DayOfWeek: 0=Domingo … 6=Sabado
  horaDesde: string; // "HH:mm"
  horaHasta: string;
  activo: boolean;
}

export interface Usuario {
  id: string;       // UsuarioSucursalRol.Id — para gestión de usuarios
  usuarioId: string; // Usuario.Id — para ProfesionalId en turnos y slots
  sucursalId: string;
  nombre: string;
  apellido: string;
  nombreCompleto: string;
  email: string;
  telefono: string;
  rol: RolUsuario;
  estado: EstadoUsuario;
  esOwner?: boolean;
  permisos: PermisoSistema[];
  horariosLaborales: HorarioLaboral[];
  serviciosIds: string[];
  invitacionLink?: string;
}

export interface CajaInfo {
  id: string;
  sucursalId: string;
  nombre: string;
  activa: boolean;
}

export interface TurnoResumenCaja {
  id: string;
  clienteNombre: string;
  servicioNombre: string;
  profesionalNombre: string;
  fechaHoraInicio: string; // ISO 8601
  precioServicio: number;
  totalCobrado: number;
}

export interface PagoTurnoResponse {
  id: string;
  concepto: ConceptoPagoTurno;
  monto: number;
  fecha: string; // ISO 8601
}

export interface MovimientoCaja {
  id: string;
  cajaId: string;
  usuarioId: string;
  turnoId?: string;
  tipoMovimiento: TipoMovimientoCaja;
  medioPago: MedioPago;
  monto: number;
  observaciones?: string;
  fecha: string; // ISO 8601
  conceptoPago?: ConceptoPagoTurno;
  turno?: TurnoResumenCaja;
}

export interface CajaSesion {
  id: string;
  cajaId: string;
  fechaApertura: string;
  fechaCierre?: string;
  montoInicial: number;
  montoFinalEsperado?: number;
  montoFinalReal?: number;
  diferencia?: number;
  estado: 'Abierta' | 'Cerrada';
  usuarioAperturaNombre?: string;
  usuarioCierreNombre?: string;
  observacionesApertura?: string;
  observacionesCierre?: string;
}

export interface AbrirSesionDto {
  montoInicial: number;
  observaciones?: string;
}

export interface CerrarSesionDto {
  montoFinalReal: number;
  observaciones?: string;
}

// ─── Request DTOs ─────────────────────────────────────────────────────────────

export interface CrearSucursalDto {
  nombre: string;
  direccion: string;
  telefono: string;
  email: string;
}

export interface CrearServicioDto {
  sucursalId: string;
  nombre: string;
  descripcion: string;
  aclaraciones: string;
  precio: number;
  duracionClienteMin: number;
  duracionAgendaMin: number;
  requiereSena: boolean;
  tipoSena: TipoSena | null;
  valorSena: number | null;
  modalidadPrestacion: ModalidadPrestacion;
  tipoServicio: TipoServicio;
  /** Días habilitados (0=Dom … 6=Sáb). Vacío = todos los días. */
  diasDisponibles: number[];
}

export interface CrearClienteDto {
  sucursalId: string;
  nombre: string;
  apellido: string;
  telefono: string;
  email?: string;
  observaciones?: string;
}

export interface CrearTurnoDto {
  sucursalId: string;
  clienteId: string;
  servicioId: string;
  profesionalId: string;
  fechaHoraInicio: string;
  origen: OrigenTurno;
  observaciones?: string;
}

export interface ActualizarTurnoDto {
  estado: EstadoTurno;
  observaciones?: string;
  fechaHoraInicio?: string;
  profesionalId?: string;
}

export interface CrearUsuarioDto {
  sucursalId: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  rol: RolUsuario;
  permisos: PermisoSistema[];
}

export interface ActualizarUsuarioDto {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  /** Dejar vacío para no cambiar la contraseña */
  passwordHash: string;
  rol: RolUsuario;
  estado: EstadoUsuario;
  permisos: PermisoSistema[];
}

export interface CrearMovimientoDto {
  cajaId: string;
  usuarioId: string;
  turnoId?: string;
  tipoMovimiento: TipoMovimientoCaja;
  medioPago: MedioPago;
  monto: number;
  observaciones?: string;
}

export interface RegistrarMovimientoDto {
  turnoId?: string;
  tipoMovimiento: TipoMovimientoCaja;
  medioPago: MedioPago;
  monto: number;
  conceptoPago?: ConceptoPagoTurno;
  observaciones?: string;
}

// ─── Suscripción ──────────────────────────────────────────────────────────────

export interface SuscripcionInfo {
  id: string;
  planNombre: string;
  planPrecio: number;
  maxUsuarios: number;
  maxTurnosMes: number | null;
  estado: 'PruebActiva' | 'Activa' | 'Vencida' | 'Cancelada' | 'PruebVencida' | 'SinSuscripcion';
  enPeriodoPrueba: boolean;
  fechaVencimiento: string; // ISO
  diasRestantes: number;
  usuariosActuales: number;
  turnosMesActual: number;
}

// ─── SuperAdmin — Planes ──────────────────────────────────────────────────────

export interface Plan {
  id: string;
  nombre: string;
  descripcion?: string;
  maxUsuarios: number;
  maxTurnosMes: number | null;
  precioMensual: number;
  esActivo: boolean;
  ordenDisplay: number;
  duracionTrialDias: number;
  tieneReportes: boolean;
}

export interface CrearPlanDto {
  nombre: string;
  descripcion?: string;
  maxUsuarios: number;
  maxTurnosMes: number | null;
  precioMensual: number;
  esActivo: boolean;
  ordenDisplay: number;
  duracionTrialDias: number;
  tieneReportes: boolean;
}

export type ActualizarPlanDto = Omit<CrearPlanDto, 'precioMensual'>;

// ─── SuperAdmin — Suscripciones ───────────────────────────────────────────────

export interface SuscripcionSuperAdminItem {
  sucursalId: string;
  sucursalNombre: string;
  sucursalSlug: string;
  planId: string;
  planNombre: string;
  estado: 'PruebActiva' | 'Activa' | 'Vencida' | 'Cancelada' | 'PruebVencida';
  enPeriodoPrueba: boolean;
  fechaVencimiento: string; // ISO 8601
  diasRestantes: number;
}

export interface CambiarPlanSuperAdminDto {
  planId: string;
}

export interface PagoSuscripcionHistorial {
  id: string;
  planNombre: string;
  monto: number;
  mPPaymentId: number;
  fechaPago: string; // ISO
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

const PROF_COLORS = [
  '#B4697B',
  '#5B8DEF',
  '#C9A96E',
  '#4CAF82',
  '#E5A84B',
  '#8B5CF6',
  '#EF4444',
  '#14B8A6',
];

/** Deterministic color for a profesional based on their ID */
export function getProfesionalColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PROF_COLORS[Math.abs(hash) % PROF_COLORS.length];
}

/** "lunes 14 de julio de 2025" — construye Date local desde partes del string ISO */
export function formatFechaLarga(isoString: string): string {
  const [y, m, d] = (isoString.split('T')[0]).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-AR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

/** "14/06/2025" */
export function formatFechaCorta(isoString: string): string {
  const [y, m, d] = (isoString.split('T')[0]).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-AR');
}

/** "10:30" — extrae la hora del string ISO sin conversión de zona horaria */
export function formatHora(isoString: string): string {
  const timePart = (isoString.split('T')[1] ?? '00:00').replace(/[Z+\-]\d.*/, '');
  const [h = '00', m = '00'] = timePart.split(':');
  return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
}

/** Format currency: "$12.500" */
export function formatMoneda(amount: number): string {
  return `$${amount.toLocaleString('es-AR', { minimumFractionDigits: 0 })}`;
}

/** Genera la URL para agregar un turno al Google Calendar del cliente */
export function buildGoogleCalendarUrl(
  turno: { servicioNombre: string; profesionalNombre: string; fechaHoraInicio: string; fechaHoraFin: string },
  sucursalNombre?: string,
): string {
  const toGCal = (iso: string) => iso.replace(/[-:]/g, '').slice(0, 15);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Turno - ${turno.servicioNombre}${sucursalNombre ? ` en ${sucursalNombre}` : ''}`,
    dates: `${toGCal(turno.fechaHoraInicio)}/${toGCal(turno.fechaHoraFin)}`,
    details: `Profesional: ${turno.profesionalNombre}\nServicio: ${turno.servicioNombre}`,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

/** Calculate seña amount from a Servicio */
export function calcularMontoSena(servicio: Servicio): number {
  if (!servicio.requiereSena || !servicio.valorSena) return 0;
  if (servicio.tipoSena === 'Fija') return servicio.valorSena;
  if (servicio.tipoSena === 'Porcentaje')
    return Math.round((servicio.precio * servicio.valorSena) / 100);
  return 0;
}
