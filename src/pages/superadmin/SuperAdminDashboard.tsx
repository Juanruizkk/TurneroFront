import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BuildingIcon, PlusIcon, ArrowRightIcon, CheckIcon, XIcon } from 'lucide-react';
import { superAdminApi } from '../../api/superadmin';
import type { SucursalSuperAdmin } from '../../types';

export function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [sucursales, setSucursales] = useState<SucursalSuperAdmin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    superAdminApi.listarSucursales()
      .then(setSucursales)
      .finally(() => setLoading(false));
  }, []);

  const activas   = sucursales.filter((s) => s.activa).length;
  const inactivas = sucursales.length - activas;

  return (
    <div className="max-w-5xl mx-auto space-y-8">

      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-heading font-bold text-text-primary">Bienvenido, Super Admin</h2>
        <p className="text-text-secondary text-sm mt-1">Vista general de la plataforma</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Sucursales totales', value: sucursales.length, cls: 'bg-surface border-border' },
          { label: 'Activas',            value: activas,           cls: 'bg-green-50 border-green-100' },
          { label: 'Inactivas',          value: inactivas,         cls: 'bg-surface-background border-border' },
        ].map(({ label, value, cls }) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-card border px-6 py-5 ${cls}`}
          >
            {loading ? (
              <div className="w-8 h-6 bg-border rounded animate-pulse" />
            ) : (
              <p className="text-3xl font-bold font-heading text-text-primary">{value}</p>
            )}
            <p className="text-sm text-text-secondary mt-1">{label}</p>
          </motion.div>
        ))}
      </div>

      {/* Acciones rápidas */}
      <div className="flex gap-4">
        <button
          onClick={() => navigate('/superadmin/sucursales/nueva')}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2.5 rounded-button text-sm font-medium transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          Nueva sucursal
        </button>
        <button
          onClick={() => navigate('/superadmin/sucursales')}
          className="flex items-center gap-2 border border-border hover:bg-surface px-4 py-2.5 rounded-button text-sm font-medium text-text-secondary transition-colors"
        >
          <BuildingIcon className="w-4 h-4" />
          Ver todas
        </button>
      </div>

      {/* Últimas sucursales */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold text-text-primary">Sucursales recientes</h3>
          <button
            onClick={() => navigate('/superadmin/sucursales')}
            className="flex items-center gap-1 text-primary hover:underline text-sm"
          >
            Ver todas <ArrowRightIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="bg-surface rounded-card border border-border divide-y divide-border overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : sucursales.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <BuildingIcon className="w-10 h-10 text-text-muted mb-3" />
              <p className="text-text-secondary text-sm">No hay sucursales todavía.</p>
            </div>
          ) : (
            sucursales.slice(0, 5).map((s) => (
              <button
                key={s.id}
                onClick={() => navigate(`/superadmin/sucursales/${s.id}`)}
                className="w-full flex items-center gap-4 px-6 py-4 hover:bg-surface-background/60 transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <BuildingIcon className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-text-primary">{s.nombre}</p>
                  <p className="text-xs text-text-muted truncate">
                    {s.owner ? s.owner.nombreCompleto : 'Sin owner'} · {s.email}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                    s.activa
                      ? 'bg-green-100 text-green-700'
                      : 'bg-surface-background text-text-muted border border-border'
                  }`}
                >
                  {s.activa ? <CheckIcon className="w-3 h-3" /> : <XIcon className="w-3 h-3" />}
                  {s.activa ? 'Activa' : 'Inactiva'}
                </span>
                <ArrowRightIcon className="w-4 h-4 text-text-muted flex-shrink-0" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
