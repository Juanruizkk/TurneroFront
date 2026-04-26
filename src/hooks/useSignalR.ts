import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { useEffect, useRef } from 'react';

const API_BASE = (import.meta as { env: Record<string, string> }).env.VITE_API_URL ?? 'http://localhost:5000/api';
// Strip trailing /api to get the server root (hub is at /hubs/turnero, not /api/hubs/turnero)
const HUB_BASE = API_BASE.replace(/\/api\/?$/, '');

/** Matches TurnoResponseDto from the backend — used as SignalR event payload */
export interface TurnoNotificacion {
  id: string;
  sucursalId: string;
  clienteId: string;
  clienteNombre: string;
  clienteTelefono: string;
  servicioId: string;
  servicioNombre: string;
  profesionalId: string;
  profesionalNombre: string;
  fechaHoraInicio: string;
  fechaHoraFin: string;
  estado: string;
  origen: string;
  observaciones?: string;
  tokenGestion: string;
  precioServicio: number;
  montoSena?: number;
  totalCobrado: number;
}

interface UseSignalROptions {
  token: string | undefined;
  onNuevoTurno?: (turno: TurnoNotificacion) => void;
  onTurnoCancelado?: (turno: TurnoNotificacion) => void;
}

export function useSignalR({ token, onNuevoTurno, onTurnoCancelado }: UseSignalROptions) {
  // Stable refs so the effect doesn't re-run when handlers change
  const onNuevoRef     = useRef(onNuevoTurno);
  const onCanceladoRef = useRef(onTurnoCancelado);
  useEffect(() => { onNuevoRef.current     = onNuevoTurno;     }, [onNuevoTurno]);
  useEffect(() => { onCanceladoRef.current = onTurnoCancelado; }, [onTurnoCancelado]);

  useEffect(() => {
    if (!token) return;

    let unmounted = false;

    const connection = new HubConnectionBuilder()
      .withUrl(`${HUB_BASE}/hubs/turnero`, { accessTokenFactory: () => token, withCredentials: false })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    connection.on('NuevoTurno',    (turno: TurnoNotificacion) => onNuevoRef.current?.(turno));
    connection.on('TurnoCancelado',(turno: TurnoNotificacion) => onCanceladoRef.current?.(turno));

    // Suppress AbortError that occurs when the effect is cleaned up before
    // negotiation finishes (e.g. React StrictMode double-invoke).
    connection.start().catch((err) => {
      if (!unmounted) console.error('[SignalR] Error al conectar:', err);
    });

    return () => {
      unmounted = true;
      connection.stop();
    };
  }, [token]); // Re-connect only when the token changes
}
