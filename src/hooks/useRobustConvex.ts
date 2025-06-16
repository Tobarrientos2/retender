import { useAction } from 'convex/react';
import { useState, useCallback } from 'react';
import { api } from '../../convex/_generated/api';

/**
 * Hook personalizado para manejar operaciones de Convex de forma más robusta
 * con manejo de errores de conexión y reintentos automáticos
 */
export function useRobustConvex() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateAntiAffirmationsAction = useAction(api.affirmations.generateAntiAffirmations);

  const executeWithRetry = useCallback(async <T>(
    operation: () => Promise<T>,
    maxRetries: number = 2,
    timeoutMs: number = 45000
  ): Promise<T | null> => {
    setIsLoading(true);
    setError(null);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Executing operation (Attempt ${attempt}/${maxRetries})`);

        // Crear timeout para la operación
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Operation timeout after ${timeoutMs}ms`)), timeoutMs);
        });

        // Ejecutar operación con timeout
        const result = await Promise.race([operation(), timeoutPromise]);
        
        console.log(`✅ Operation successful on attempt ${attempt}`);
        setIsLoading(false);
        return result;

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ Attempt ${attempt}/${maxRetries} failed:`, errorMessage);

        // Verificar si es un error de conexión
        const isConnectionError = errorMessage.includes('Connection lost') || 
                                 errorMessage.includes('WebSocket') ||
                                 errorMessage.includes('timeout') ||
                                 errorMessage.includes('network');

        if (isConnectionError) {
          console.log(`🔌 Connection error detected, will retry...`);
        }

        // Si es el último intento, establecer error y retornar null
        if (attempt === maxRetries) {
          setError(errorMessage);
          setIsLoading(false);
          return null;
        }

        // Esperar antes del siguiente intento (backoff progresivo)
        const waitTime = 1000 * attempt;
        console.log(`⏳ Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    setIsLoading(false);
    return null;
  }, []);

  const generateAntiAffirmationsRobust = useCallback(async (params: {
    originalAffirmations: Array<{ content: string; order: number; }>
  }) => {
    return executeWithRetry(
      () => generateAntiAffirmationsAction(params),
      2, // máximo 2 reintentos
      45000 // timeout de 45 segundos
    );
  }, [generateAntiAffirmationsAction, executeWithRetry]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    generateAntiAffirmationsRobust,
    isLoading,
    error,
    clearError,
    executeWithRetry
  };
}

/**
 * Utilidad para detectar errores de conexión
 */
export function isConnectionError(error: unknown): boolean {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  return errorMessage.includes('Connection lost') || 
         errorMessage.includes('WebSocket') ||
         errorMessage.includes('timeout') ||
         errorMessage.includes('network') ||
         errorMessage.includes('1006'); // WebSocket close code
}

/**
 * Utilidad para formatear mensajes de error de conexión
 */
export function formatConnectionError(error: unknown): string {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  if (isConnectionError(error)) {
    return "Problema de conexión detectado. La aplicación intentará reconectarse automáticamente.";
  }
  
  return errorMessage;
}
