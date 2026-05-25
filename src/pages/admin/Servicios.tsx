import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ModalPortal } from '../../components/ui/ModalPortal';
import {
  PlusIcon,
  EditIcon,
  TrashIcon,
  XIcon,
  ScissorsIcon,
  ClockIcon,
  CheckIcon,
} from 'lucide-react';
import { serviciosApi } from '../../api/servicios';
import { ajustesApi } from '../../api/ajustes';
import { ToastContainer } from '../../components/ui/Toast';
import { Pagination } from '../../components/ui/Pagination';
import { useToast } from '../../hooks/useToast';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import { usePagination } from '../../hooks/usePagination';
import { formatMoneda, calcularMontoSena } from '../../types';
import type { Servicio, CrearServicioDto, ModalidadPrestacion, TipoServicio, TipoSena, DiaSemana } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

const DIAS_SEMANA = [
  { valor: 1, label: 'Lun', key: 'Lunes' },
  { valor: 2, label: 'Mar', key: 'Martes' },
  { valor: 3, label: 'Mié', key: 'Miercoles' },
  { valor: 4, label: 'Jue', key: 'Jueves' },
  { valor: 5, label: 'Vie', key: 'Viernes' },
  { valor: 6, label: 'Sáb', key: 'Sabado' },
  { valor: 0, label: 'Dom', key: 'Domingo' },
];

const EMPTY_FORM: CrearServicioDto = {
  sucursalId: '',
  nombre: '',
  descripcion: '',
  aclaraciones: '',
  precio: 0,
  duracionClienteMin: 30,
  duracionAgendaMin: 30,
  requiereSena: false,
  tipoSena: null,
  valorSena: null,
  modalidadPrestacion: 'Presencial',
  tipoServicio: 'Regular',
  diasDisponibles: [],
};

export function Servicios() {
  const { user }   = useAuth();
  const sucursalId = user?.sucursalId ?? '';
  const { toasts, addToast, dismiss } = useToast();
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Servicio | null>(null);
  const [form, setForm] = useState<CrearServicioDto>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const { page, setPage, totalPages, paginated, total, pageSize } = usePagination(servicios, 10);

  // Días que la sucursal tiene abiertos según ajustes
  const [diasAbiertos, setDiasAbiertos] = useState<number[]>([]);

  useEffect(() => {
    if (!sucursalId) return;
    ajustesApi.obtener(sucursalId)
      .then((ajustes) => {
        const abiertos = DIAS_SEMANA
          .filter((d) => ajustes.horariosAtencion?.[d.key as DiaSemana]?.abierto)
          .map((d) => d.valor);
        setDiasAbiertos(abiertos);
      })
      .catch(() => {}); // no-crítico: si falla se muestran todos
  }, [sucursalId]);

  const cargar = () => {
    setLoading(true);
    serviciosApi
      .listar(sucursalId, true)
      .then(setServicios)
      .catch(() => addToast('error', 'No se pudieron cargar los servicios.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, sucursalId: sucursalId });
    setModalOpen(true);
  };

  const openEdit = (s: Servicio) => {
    setEditing(s);
    setForm({
      sucursalId: s.sucursalId,
      nombre: s.nombre,
      descripcion: s.descripcion,
      aclaraciones: s.aclaraciones,
      precio: s.precio,
      duracionClienteMin: s.duracionClienteMin,
      duracionAgendaMin: s.duracionAgendaMin,
      requiereSena: s.requiereSena,
      tipoSena: s.tipoSena,
      valorSena: s.valorSena,
      modalidadPrestacion: s.modalidadPrestacion,
      tipoServicio: s.tipoServicio,
      diasDisponibles: s.diasDisponibles ?? [],
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.nombre || form.precio <= 0) return;
    if (form.requiereSena && form.valorSena !== null && form.valorSena !== undefined) {
      if (form.tipoSena === 'Fija' && form.valorSena > form.precio) {
        addToast('error', `La seña fija ($${form.valorSena}) no puede ser mayor al precio del servicio ($${form.precio}).`);
        return;
      }
      if (form.tipoSena === 'Porcentaje' && form.valorSena > 100) {
        addToast('error', 'El porcentaje de la seña no puede superar el 100%.');
        return;
      }
    }
    setSaving(true);
    try {
      if (editing) {
        const updated = await serviciosApi.actualizar(editing.id, form);
        setServicios((prev) => prev.map((s) => (s.id === editing.id ? updated : s)));
        addToast('success', 'Servicio actualizado.');
      } else {
        const nuevo = await serviciosApi.crear(form);
        setServicios((prev) => [nuevo, ...prev]);
        addToast('success', 'Servicio creado.');
      }
      setModalOpen(false);
    } catch (err: unknown) {
      addToast('error', err instanceof Error ? err.message : 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDesactivar = async (s: Servicio) => {
    const ok = await confirm({
      title: `¿Desactivar "${s.nombre}"?`,
      description: 'Los turnos ya agendados se mantendrán, pero el servicio no podrá seleccionarse para nuevas reservas.',
      confirmLabel: 'Sí, desactivar',
    });
    if (!ok) return;
    try {
      await serviciosApi.eliminar(s.id);
      setServicios((prev) => prev.map((x) => (x.id === s.id ? { ...x, activo: false } : x)));
      addToast('success', 'Servicio desactivado.');
    } catch {
      addToast('error', 'No se pudo desactivar el servicio.');
    }
  };

  const handleActivar = async (s: Servicio) => {
    try {
      const updated = await serviciosApi.actualizar(s.id, { ...s, activo: true });
      setServicios((prev) => prev.map((x) => (x.id === s.id ? updated : x)));
      addToast('success', 'Servicio activado.');
    } catch {
      addToast('error', 'No se pudo activar el servicio.');
    }
  };

  const setField = <K extends keyof CrearServicioDto>(key: K, value: CrearServicioDto[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-heading font-bold text-text-primary">Servicios</h2>
          <p className="text-text-secondary text-sm mt-1">
            {servicios.filter((s) => s.activo).length} activos · {servicios.filter((s) => !s.activo).length} inactivos
          </p>
        </div>
        <button
          onClick={openCreate}
          className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-button text-sm font-medium transition-colors flex items-center gap-2 self-start"
        >
          <PlusIcon className="w-4 h-4" />
          Nuevo servicio
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : servicios.length === 0 ? (
        <div className="bg-surface rounded-card border border-border p-16 text-center">
          <ScissorsIcon className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <h3 className="font-heading font-bold text-text-primary mb-2">Sin servicios</h3>
          <p className="text-text-secondary text-sm mb-6">Creá el primer servicio para empezar.</p>
          <button onClick={openCreate} className="bg-primary text-white px-6 py-2.5 rounded-button text-sm font-medium hover:bg-primary-dark transition-colors">
            Crear servicio
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {paginated.map((s) => (
            <div
              key={s.id}
              className={`bg-surface rounded-card border border-border shadow-sm p-5 flex items-start gap-4 transition-opacity ${s.activo ? '' : 'opacity-60'}`}
            >
              <div className={`p-3 rounded-xl flex-shrink-0 ${s.activo ? 'bg-primary/10 text-primary' : 'bg-surface-background text-text-muted'}`}>
                <ScissorsIcon className="w-6 h-6" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="font-bold text-text-primary">{s.nombre}</h3>
                  {!s.activo && (
                    <span className="text-xs bg-surface-background border border-border text-text-muted px-2 py-0.5 rounded-full">
                      Inactivo
                    </span>
                  )}
                  <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full font-medium">
                    {s.modalidadPrestacion}
                  </span>
                  {s.diasDisponibles?.length > 0 && (
                    <span className="text-xs text-text-muted bg-surface-background border border-border px-2 py-0.5 rounded-full">
                      {DIAS_SEMANA.filter((d) => s.diasDisponibles.includes(d.valor)).map((d) => d.label).join(' · ')}
                    </span>
                  )}
                </div>
                {s.descripcion && <p className="text-sm text-text-secondary mb-2">{s.descripcion}</p>}
                <div className="flex flex-wrap gap-4 text-sm text-text-secondary">
                  <span className="font-bold text-primary text-base">{formatMoneda(s.precio)}</span>
                  <span className="flex items-center gap-1">
                    <ClockIcon className="w-4 h-4" /> {s.duracionClienteMin} min (cliente)
                  </span>
                  <span className="flex items-center gap-1 text-text-muted">
                    <ClockIcon className="w-3.5 h-3.5" /> {s.duracionAgendaMin} min (agenda)
                  </span>
                  {s.requiereSena && (
                    <span className="text-warning font-medium bg-warning/10 px-2 py-0.5 rounded text-xs border border-warning/20">
                      Seña: {formatMoneda(calcularMontoSena(s))}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                {!s.activo && (
                  <button
                    onClick={() => handleActivar(s)}
                    className="p-2 text-success hover:bg-success/10 rounded-md transition-colors"
                    title="Activar"
                  >
                    <CheckIcon className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => openEdit(s)}
                  className="p-2 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                  title="Editar"
                >
                  <EditIcon className="w-4 h-4" />
                </button>
                {s.activo && (
                  <button
                    onClick={() => handleDesactivar(s)}
                    className="p-2 text-text-secondary hover:text-error hover:bg-error/10 rounded-md transition-colors"
                    title="Desactivar"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} />
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {modalOpen && (
          <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-text-primary/20 backdrop-blur-sm px-4 py-8 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface rounded-card shadow-2xl w-full max-w-lg p-6 my-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-heading font-bold text-xl text-text-primary">
                  {editing ? 'Editar servicio' : 'Nuevo servicio'}
                </h3>
                <button onClick={() => setModalOpen(false)} className="text-text-muted hover:text-text-primary">
                  <XIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Nombre *</label>
                  <input
                    type="text" value={form.nombre}
                    onChange={(e) => setField('nombre', e.target.value)}
                    className="w-full px-3 py-2 rounded-input border border-border bg-surface-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                    placeholder="Corte de cabello"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Descripción</label>
                  <textarea
                    value={form.descripcion}
                    onChange={(e) => setField('descripcion', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 rounded-input border border-border bg-surface-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm resize-none"
                    placeholder="Descripción del servicio"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Precio *</label>
                    <input
                      type="number" value={form.precio || ''}
                      onChange={(e) => setField('precio', Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-input border border-border bg-surface-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                      placeholder="5000"
                      min={0}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Modalidad</label>
                    <select
                      value={form.modalidadPrestacion}
                      onChange={(e) => setField('modalidadPrestacion', e.target.value as ModalidadPrestacion)}
                      className="w-full px-3 py-2 rounded-input border border-border bg-surface-background focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                    >
                      <option value="Presencial">Presencial</option>
                      <option value="Domicilio">A domicilio</option>
                      <option value="Online">Online</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Duración cliente (min)</label>
                    <input
                      type="number" value={form.duracionClienteMin}
                      onChange={(e) => setField('duracionClienteMin', Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-input border border-border bg-surface-background focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                      min={5}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Duración agenda (min)</label>
                    <input
                      type="number" value={form.duracionAgendaMin}
                      onChange={(e) => setField('duracionAgendaMin', Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-input border border-border bg-surface-background focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                      min={5}
                    />
                  </div>
                </div>

                {/* Días disponibles */}
                <div className="pt-2 border-t border-border">
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Días disponibles
                    <span className="text-text-muted font-normal ml-1">(vacío = todos los días)</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(diasAbiertos.length > 0 ? DIAS_SEMANA.filter((d) => diasAbiertos.includes(d.valor)) : DIAS_SEMANA).map((d) => {
                      const activo = form.diasDisponibles.includes(d.valor);
                      return (
                        <button
                          key={d.valor}
                          type="button"
                          onClick={() =>
                            setField(
                              'diasDisponibles',
                              activo
                                ? form.diasDisponibles.filter((x) => x !== d.valor)
                                : [...form.diasDisponibles, d.valor],
                            )
                          }
                          className={`px-3 py-1.5 rounded-button text-sm font-medium border transition-colors ${
                            activo
                              ? 'bg-primary text-white border-primary'
                              : 'bg-surface-background text-text-secondary border-border hover:border-primary hover:text-primary'
                          }`}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Seña */}
                <div className="pt-2 border-t border-border">
                  <label className="flex items-center gap-2 cursor-pointer mb-3">
                    <input
                      type="checkbox"
                      checked={form.requiereSena}
                      onChange={(e) => {
                        setField('requiereSena', e.target.checked);
                        if (!e.target.checked) { setField('tipoSena', null); setField('valorSena', null); }
                        else if (form.tipoSena === null) { setField('tipoSena', 'Fija'); }
                      }}
                      className="rounded accent-primary w-4 h-4"
                    />
                    <span className="text-sm font-medium text-text-primary">Requiere seña</span>
                  </label>

                  {form.requiereSena && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-6">
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">Tipo de seña</label>
                        <select
                          value={form.tipoSena ?? 'Fija'}
                          onChange={(e) => setField('tipoSena', e.target.value as TipoSena)}
                          className="w-full px-3 py-2 rounded-input border border-border bg-surface-background focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                        >
                          <option value="Fija">Fija ($)</option>
                          <option value="Porcentaje">Porcentaje (%)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">
                          {form.tipoSena === 'Porcentaje' ? 'Porcentaje (%)' : 'Monto ($)'}
                        </label>
                        <input
                          type="number"
                          value={form.valorSena ?? ''}
                          onChange={(e) => setField('valorSena', e.target.value === '' ? null : Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-input border border-border bg-surface-background focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                          placeholder={form.tipoSena === 'Porcentaje' ? '30' : '2000'}
                          min={0}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 border border-border rounded-button text-sm font-medium text-text-secondary hover:bg-surface-background transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={!form.nombre || form.precio <= 0 || saving}
                  className="flex-1 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-button text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : editing ? 'Actualizar' : 'Crear servicio'}
                </button>
              </div>
            </motion.div>
          </div>
          </ModalPortal>
        )}
      </AnimatePresence>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      {ConfirmDialog}
    </div>
  );
}
