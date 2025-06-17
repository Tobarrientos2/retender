import React, { useEffect, useState } from 'react';
import { usePersistentTranscription } from '../hooks/usePersistentTranscription';
import { toast } from 'sonner';

interface BackgroundTranscriptionNotifierProps {
  onTranscriptionComplete?: (jobId: string, result: any) => void;
}

/**
 * Componente que maneja las notificaciones de transcripciones en background
 * Se monta globalmente y persiste durante toda la sesión del usuario
 */
export function BackgroundTranscriptionNotifier({ 
  onTranscriptionComplete 
}: BackgroundTranscriptionNotifierProps) {
  const [notifiedJobs, setNotifiedJobs] = useState<Set<string>>(new Set());

  const {
    activeJobs,
    completedJobs,
    hasActiveJobs,
    stats
  } = usePersistentTranscription({
    onJobComplete: (jobId, result) => {
      // Evitar notificaciones duplicadas
      if (!notifiedJobs.has(jobId)) {
        toast.success(`🎉 Transcripción completada`, {
          description: `Job ${jobId.slice(0, 8)}... terminado exitosamente`,
          duration: 5000,
          action: {
            label: 'Ver resultado',
            onClick: () => onTranscriptionComplete?.(jobId, result)
          }
        });
        
        setNotifiedJobs(prev => new Set(prev).add(jobId));
      }
    },
    
    onJobError: (jobId, error) => {
      if (!notifiedJobs.has(jobId)) {
        toast.error(`❌ Error en transcripción`, {
          description: `Job ${jobId.slice(0, 8)}...: ${error}`,
          duration: 8000
        });
        
        setNotifiedJobs(prev => new Set(prev).add(jobId));
      }
    },
    
    onJobProgress: (jobId, progress, message) => {
      // Solo mostrar progreso para jobs importantes (cada 25%)
      if (progress % 25 === 0 && progress > 0 && progress < 100) {
        toast.info(`🔄 Transcribiendo...`, {
          description: `Job ${jobId.slice(0, 8)}...: ${progress}% - ${message}`,
          duration: 2000
        });
      }
    }
  });

  // Mostrar indicador de jobs activos
  if (!hasActiveJobs) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
        <span className="text-sm font-medium">
          {activeJobs.length} transcripción{activeJobs.length !== 1 ? 'es' : ''} en progreso
        </span>
      </div>
    </div>
  );
}

/**
 * Componente de panel de estado de transcripciones
 * Muestra el estado detallado de todas las transcripciones
 */
export function TranscriptionStatusPanel() {
  const {
    activeJobs,
    completedJobs,
    stats,
    cancelTranscription,
    isLoading
  } = usePersistentTranscription();

  const [isExpanded, setIsExpanded] = useState(false);

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDuration = (startTime: number, endTime: number) => {
    const duration = (endTime - startTime) / 1000;
    if (duration < 60) {
      return `${duration.toFixed(1)}s`;
    }
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    return `${minutes}m ${seconds}s`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50';
      case 'processing': return 'text-blue-600 bg-blue-50';
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'failed': return 'text-red-600 bg-red-50';
      case 'cancelled': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅';
      case 'processing': return '🔄';
      case 'pending': return '⏳';
      case 'failed': return '❌';
      case 'cancelled': return '🚫';
      default: return '❓';
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto"></div>
        <p className="mt-2 text-gray-600">Cargando transcripciones...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg border">
      {/* Header */}
      <div 
        className="p-4 border-b cursor-pointer hover:bg-gray-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-semibold text-gray-900">
              🎤 Estado de Transcripciones
            </h3>
            {activeJobs.length > 0 && (
              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                {activeJobs.length} activa{activeJobs.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {stats && (
              <span className="text-sm text-gray-500">
                {stats.total} total
              </span>
            )}
            <span className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                <div className="text-xs text-gray-600">Completadas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.active}</div>
                <div className="text-xs text-gray-600">Activas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
                <div className="text-xs text-gray-600">Fallidas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">{stats.cancelled}</div>
                <div className="text-xs text-gray-600">Canceladas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.total}</div>
                <div className="text-xs text-gray-600">Total</div>
              </div>
            </div>
          )}

          {/* Active Jobs */}
          {activeJobs.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Jobs Activos</h4>
              <div className="space-y-2">
                {activeJobs.map((job) => (
                  <div key={job.jobId} className="p-3 border rounded-lg bg-blue-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-lg">{getStatusIcon(job.status)}</span>
                        <div>
                          <div className="font-medium text-sm">
                            {job.fileName || `Job ${job.jobId.slice(0, 8)}...`}
                          </div>
                          <div className="text-xs text-gray-600">
                            Creado: {formatTimestamp(job.createdAt)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="text-right">
                          <div className="text-sm font-medium">{job.progress}%</div>
                          <div className="text-xs text-gray-600">{job.message}</div>
                        </div>
                        <button
                          onClick={() => cancelTranscription(job.jobId)}
                          className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${job.progress}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Completed Jobs */}
          {completedJobs.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Transcripciones Recientes</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {completedJobs.slice(0, 10).map((job) => (
                  <div key={job.jobId} className={`p-3 border rounded-lg ${getStatusColor(job.status)}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-lg">{getStatusIcon(job.status)}</span>
                        <div>
                          <div className="font-medium text-sm">
                            {job.fileName || `Job ${job.jobId.slice(0, 8)}...`}
                          </div>
                          <div className="text-xs opacity-75">
                            {formatTimestamp(job.createdAt)}
                            {job.startedAt && job.completedAt && (
                              <span className="ml-2">
                                • {formatDuration(job.startedAt, job.completedAt)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium capitalize">{job.status}</div>
                        {job.error && (
                          <div className="text-xs text-red-600 max-w-xs truncate">
                            {job.error}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {activeJobs.length === 0 && completedJobs.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">🎤</div>
              <p>No hay transcripciones aún</p>
              <p className="text-sm">Las transcripciones aparecerán aquí cuando inicies una</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
