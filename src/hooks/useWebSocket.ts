/**
 * Hook para manejar conexiones WebSocket con auto-reconnect
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export interface WebSocketMessage {
  type: string;
  job_id: string;
  data: any;
  timestamp: string;
}

export interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastMessage: WebSocketMessage | null;
}

export interface UseWebSocketOptions {
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: string) => void;
}

export interface UseWebSocketReturn {
  state: WebSocketState;
  connect: (url: string) => void;
  disconnect: () => void;
  sendMessage: (message: any) => void;
  isReady: boolean;
}

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    onMessage,
    onConnect,
    onDisconnect,
    onError
  } = options;

  // Usar refs para callbacks para evitar dependencias circulares
  const onMessageRef = useRef(onMessage);
  const onConnectRef = useRef(onConnect);
  const onDisconnectRef = useRef(onDisconnect);
  const onErrorRef = useRef(onError);

  // Actualizar refs cuando cambien los callbacks
  useEffect(() => {
    onMessageRef.current = onMessage;
    onConnectRef.current = onConnect;
    onDisconnectRef.current = onDisconnect;
    onErrorRef.current = onError;
  });

  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    lastMessage: null
  });

  const wsRef = useRef<WebSocket | null>(null);
  const urlRef = useRef<string | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimeouts = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  }, []);

  const disconnect = useCallback(() => {
    clearTimeouts();

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setState(prev => ({
      ...prev,
      isConnected: false,
      isConnecting: false,
      error: null
    }));

    urlRef.current = null;
    reconnectAttemptsRef.current = 0;

    onDisconnectRef.current?.();
  }, [clearTimeouts]);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(message));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error enviando mensaje';
        setState(prev => ({ ...prev, error: errorMessage }));
        onErrorRef.current?.(errorMessage);
      }
    } else {
      const errorMessage = 'WebSocket no está conectado';
      setState(prev => ({ ...prev, error: errorMessage }));
      onErrorRef.current?.(errorMessage);
    }
  }, []);

  const startPingInterval = useCallback(() => {
    clearInterval(pingIntervalRef.current!);

    pingIntervalRef.current = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && urlRef.current) {
        const jobId = urlRef.current.split('/').pop() || '';
        // Enviar ping directamente sin usar sendMessage para evitar dependencias
        try {
          wsRef.current.send(JSON.stringify({
            type: 'ping',
            job_id: jobId
          }));
        } catch (error) {
          console.error('Error enviando ping:', error);
        }
      }
    }, 30000); // Ping cada 30 segundos
  }, []);

  const connect = useCallback((url: string) => {
    // Si ya estamos conectados a la misma URL, no hacer nada
    if (wsRef.current && urlRef.current === url && wsRef.current.readyState === WebSocket.OPEN) {
      return;
    }

    // Desconectar conexión existente
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    clearTimeouts();
    urlRef.current = null;
    reconnectAttemptsRef.current = 0;

    urlRef.current = url;
    setState(prev => ({
      ...prev,
      isConnecting: true,
      error: null
    }));

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setState(prev => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          error: null
        }));

        reconnectAttemptsRef.current = 0;
        startPingInterval();
        onConnectRef.current?.();
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          setState(prev => ({
            ...prev,
            lastMessage: message,
            error: null
          }));

          onMessageRef.current?.(message);
        } catch (error) {
          const errorMessage = 'Error parseando mensaje WebSocket';
          setState(prev => ({ ...prev, error: errorMessage }));
          onErrorRef.current?.(errorMessage);
        }
      };

      ws.onclose = (event) => {
        clearTimeouts();
        
        setState(prev => ({
          ...prev,
          isConnected: false,
          isConnecting: false
        }));

        // Solo intentar reconectar si no fue un cierre intencional
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts && urlRef.current) {
          const delay = reconnectInterval * Math.pow(2, reconnectAttemptsRef.current); // Exponential backoff
          
          setState(prev => ({
            ...prev,
            error: `Conexión perdida. Reintentando en ${delay/1000}s... (${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`
          }));

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            const currentUrl = urlRef.current;
            if (currentUrl) {
              // Llamar connect directamente para evitar dependencia circular
              connect(currentUrl);
            }
          }, delay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          const errorMessage = 'Máximo número de intentos de reconexión alcanzado';
          setState(prev => ({ ...prev, error: errorMessage }));
          onErrorRef.current?.(errorMessage);
          onDisconnectRef.current?.();
        } else {
          onDisconnectRef.current?.();
        }
      };

      ws.onerror = (error) => {
        const errorMessage = 'Error de conexión WebSocket';
        setState(prev => ({ ...prev, error: errorMessage }));
        onErrorRef.current?.(errorMessage);
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error creando WebSocket';
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: errorMessage
      }));
      onErrorRef.current?.(errorMessage);
    }
  }, [startPingInterval, reconnectInterval, maxReconnectAttempts]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup directo sin usar disconnect para evitar dependencias
      clearTimeouts();
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      urlRef.current = null;
      reconnectAttemptsRef.current = 0;
    };
  }, [clearTimeouts]);

  const isReady = state.isConnected && !state.isConnecting;

  return {
    state,
    connect,
    disconnect,
    sendMessage,
    isReady
  };
}
