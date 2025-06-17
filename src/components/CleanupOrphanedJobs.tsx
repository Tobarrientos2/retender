import React from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

/**
 * Componente temporal para limpiar jobs huérfanos
 * Se puede usar para limpiar jobs que están desincronizados entre API y Convex
 */
export function CleanupOrphanedJobs() {
  const cleanupOrphanedJobs = useMutation(api.transcriptionJobs.cleanupOrphanedJobs);

  const handleCleanup = async () => {
    try {
      const deletedCount = await cleanupOrphanedJobs();
      alert(`✅ Se limpiaron ${deletedCount} jobs huérfanos`);
    } catch (error) {
      console.error('Error limpiando jobs huérfanos:', error);
      alert('❌ Error limpiando jobs huérfanos');
    }
  };

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <h3 className="text-lg font-semibold text-yellow-800 mb-2">
        🧹 Limpieza de Jobs Huérfanos
      </h3>
      <p className="text-yellow-700 mb-4">
        Esta herramienta limpia jobs que están en "pending" por más de 1 hora 
        (probablemente desincronizados entre API y Convex).
      </p>
      <button
        onClick={handleCleanup}
        className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
      >
        Limpiar Jobs Huérfanos
      </button>
    </div>
  );
}
