/**
 * Componente de barra de progreso para transcripción en tiempo real
 */

import React from 'react';

export interface ProgressBarProps {
  progress: number;
  message?: string;
  status?: 'pending' | 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  estimatedTimeRemaining?: number;
  showPercentage?: boolean;
  className?: string;
}

export function ProgressBar({
  progress,
  message,
  status = 'processing',
  estimatedTimeRemaining,
  showPercentage = true,
  className = ''
}: ProgressBarProps) {
  
  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      case 'cancelled':
        return 'bg-gray-500';
      case 'processing':
        return 'bg-blue-500';
      case 'queued':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-300';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
      case 'cancelled':
        return '⏹️';
      case 'processing':
        return '🔄';
      case 'queued':
        return '⏳';
      default:
        return '⏸️';
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div className={`w-full ${className}`}>
      {/* Header con estado y mensaje */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{getStatusIcon()}</span>
          <span className="text-sm font-medium text-gray-700">
            {message || `Estado: ${status}`}
          </span>
        </div>
        
        {showPercentage && (
          <span className="text-sm font-medium text-gray-600">
            {Math.round(clampedProgress)}%
          </span>
        )}
      </div>

      {/* Barra de progreso */}
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ease-out ${getStatusColor()}`}
          style={{ width: `${clampedProgress}%` }}
        >
          {/* Animación de "shimmer" para progreso activo */}
          {status === 'processing' && (
            <div className="h-full w-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
          )}
        </div>
      </div>

      {/* Información adicional */}
      {(estimatedTimeRemaining || status === 'queued') && (
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          {estimatedTimeRemaining && estimatedTimeRemaining > 0 && (
            <span>
              ⏱️ Tiempo estimado: {formatTime(estimatedTimeRemaining)}
            </span>
          )}
          
          {status === 'queued' && (
            <span>
              📋 En cola de procesamiento
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Componente de progreso compacto para espacios pequeños
export function CompactProgressBar({
  progress,
  status = 'processing',
  className = ''
}: Pick<ProgressBarProps, 'progress' | 'status' | 'className'>) {
  
  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      case 'cancelled':
        return 'bg-gray-500';
      case 'processing':
        return 'bg-blue-500';
      case 'queued':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-300';
    }
  };

  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ease-out ${getStatusColor()}`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
      <span className="text-xs font-medium text-gray-600 min-w-[3rem]">
        {Math.round(clampedProgress)}%
      </span>
    </div>
  );
}

// Componente de estado de conexión WebSocket
export function ConnectionStatus({ 
  isConnected, 
  isConnecting, 
  error,
  className = '' 
}: {
  isConnected: boolean;
  isConnecting: boolean;
  error?: string | null;
  className?: string;
}) {
  
  const getStatusInfo = () => {
    if (error) {
      return { icon: '❌', text: 'Error de conexión', color: 'text-red-600' };
    }
    if (isConnecting) {
      return { icon: '🔄', text: 'Conectando...', color: 'text-yellow-600' };
    }
    if (isConnected) {
      return { icon: '🔌', text: 'Conectado', color: 'text-green-600' };
    }
    return { icon: '⚪', text: 'Desconectado', color: 'text-gray-500' };
  };

  const status = getStatusInfo();

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <span className="text-sm">{status.icon}</span>
      <span className={`text-xs font-medium ${status.color}`}>
        {status.text}
      </span>
      {error && (
        <span className="text-xs text-red-500 truncate max-w-[200px]" title={error}>
          {error}
        </span>
      )}
    </div>
  );
}
