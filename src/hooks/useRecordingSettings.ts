import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

export interface RecordingSettings {
  silenceDuration: number;
  soundThreshold: number;
  silenceThreshold: number;
  autoTranscribe: boolean;
  preferredLanguage: string;
}

// Configuraciones por defecto (deben coincidir con las de Convex)
const DEFAULT_SETTINGS: RecordingSettings = {
  silenceDuration: 3, // 3 segundos
  soundThreshold: 8,  // Umbral para detectar sonido inicial
  silenceThreshold: 5, // Umbral para detectar silencio
  autoTranscribe: true, // Auto-transcribir por defecto
  preferredLanguage: "auto", // Detección automática de idioma
};

/**
 * Hook para obtener las configuraciones de grabación del usuario
 */
export function useRecordingSettings() {
  const settings = useQuery(api.userSettings.getUserSettings);
  
  // Devolver configuraciones por defecto mientras se cargan
  return settings || DEFAULT_SETTINGS;
}

/**
 * Hook simplificado que solo devuelve los valores necesarios para la detección de silencio
 */
export function useSilenceDetectionSettings() {
  const settings = useRecordingSettings();
  
  return {
    silenceDuration: settings.silenceDuration * 1000, // Convertir a milisegundos
    soundThreshold: settings.soundThreshold,
    silenceThreshold: settings.silenceThreshold,
  };
}
