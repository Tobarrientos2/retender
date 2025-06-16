import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { toast } from 'sonner';

// Utilidad para formatear tiempo
const formatDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
};

// Rangos predefinidos para el slider
const DURATION_RANGES = [
  { label: "Rápido (3-10s)", min: 3, max: 10, step: 1 },
  { label: "Corto (10s-1m)", min: 10, max: 60, step: 5 },
  { label: "Medio (1-5m)", min: 60, max: 300, step: 15 },
  { label: "Largo (5-15m)", min: 300, max: 900, step: 30 },
];

interface RecordingSettingsProps {
  onBack: () => void;
}

// Componente de slider avanzado para duración
interface DurationSliderProps {
  value: number;
  onChange: (value: number) => void;
}

function DurationSlider({ value, onChange }: DurationSliderProps) {
  const [selectedRange, setSelectedRange] = useState(0);

  // Determinar el rango actual basado en el valor
  useEffect(() => {
    const rangeIndex = DURATION_RANGES.findIndex(range =>
      value >= range.min && value <= range.max
    );
    if (rangeIndex !== -1) {
      setSelectedRange(rangeIndex);
    }
  }, [value]);

  const currentRange = DURATION_RANGES[selectedRange];

  const handleRangeChange = (newRangeIndex: number) => {
    setSelectedRange(newRangeIndex);
    const newRange = DURATION_RANGES[newRangeIndex];
    // Ajustar el valor al nuevo rango si está fuera
    if (value < newRange.min || value > newRange.max) {
      onChange(newRange.min);
    }
  };

  return (
    <div className="space-y-4">
      {/* Selector de rango */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Rango de duración
        </label>
        <div className="grid grid-cols-2 gap-2">
          {DURATION_RANGES.map((range, index) => (
            <button
              key={index}
              onClick={() => handleRangeChange(index)}
              className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                selectedRange === index
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Slider dinámico */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Duración exacta de silencio
        </label>
        <input
          type="range"
          min={currentRange.min}
          max={currentRange.max}
          step={currentRange.step}
          value={Math.max(currentRange.min, Math.min(currentRange.max, value))}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-sm text-gray-500 mt-1">
          <span>{formatDuration(currentRange.min)}</span>
          <span className="font-medium text-blue-600 text-lg">
            {formatDuration(value)}
          </span>
          <span>{formatDuration(currentRange.max)}</span>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          La grabación se detendrá automáticamente después de {formatDuration(value)} de silencio
        </p>
      </div>
    </div>
  );
}

export function RecordingSettings({ onBack }: RecordingSettingsProps) {
  const settings = useQuery(api.userSettings.getUserSettings);
  const updateSettings = useMutation(api.userSettings.updateUserSettings);
  const resetSettings = useMutation(api.userSettings.resetUserSettings);

  const [formData, setFormData] = useState({
    silenceDuration: 3,
    soundThreshold: 8,
    silenceThreshold: 5,
    autoTranscribe: true,
    preferredLanguage: "auto",
  });

  const [isSaving, setIsSaving] = useState(false);

  // Actualizar formulario cuando se cargan las configuraciones
  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleInputChange = (field: string, value: number | boolean | string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await updateSettings(formData);
      toast.success('Configuraciones guardadas correctamente');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al guardar configuraciones');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      setIsSaving(true);
      await resetSettings();
      toast.success('Configuraciones restablecidas a valores por defecto');
    } catch (error) {
      toast.error('Error al restablecer configuraciones');
    } finally {
      setIsSaving(false);
    }
  };

  if (!settings) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            ⚙️ Configuraciones de Grabación
          </h1>
          <p className="text-gray-600">
            Personaliza el comportamiento de la grabación de pantalla
          </p>
        </div>
        <button
          onClick={onBack}
          className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          ← Volver
        </button>
      </div>

      {/* Configuraciones */}
      <div className="space-y-8">
        {/* Detección de Silencio */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            🤫 Detección de Silencio
          </h2>
          
          <div className="space-y-4">
            <DurationSlider
              value={formData.silenceDuration}
              onChange={(value) => handleInputChange('silenceDuration', value)}
            />

            {/* Presets rápidos */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Presets comunes
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "3s - Muy rápido", value: 3 },
                  { label: "5s - Rápido", value: 5 },
                  { label: "10s - Normal", value: 10 },
                  { label: "30s - Pausado", value: 30 },
                  { label: "1m - Reflexivo", value: 60 },
                  { label: "2m - Largo", value: 120 },
                  { label: "5m - Muy largo", value: 300 },
                ].map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => handleInputChange('silenceDuration', preset.value)}
                    className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                      formData.silenceDuration === preset.value
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-gray-100 text-gray-700 border-gray-300 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Haz clic en un preset para aplicarlo rápidamente
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Umbral de detección de sonido inicial
              </label>
              <input
                type="range"
                min="1"
                max="50"
                value={formData.soundThreshold}
                onChange={(e) => handleInputChange('soundThreshold', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-sm text-gray-500 mt-1">
                <span>Muy sensible</span>
                <span className="font-medium text-blue-600">{formData.soundThreshold}</span>
                <span>Poco sensible</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Qué tan sensible debe ser la detección del primer sonido
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Umbral de detección de silencio
              </label>
              <input
                type="range"
                min="1"
                max="30"
                value={formData.silenceThreshold}
                onChange={(e) => handleInputChange('silenceThreshold', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-sm text-gray-500 mt-1">
                <span>Muy sensible</span>
                <span className="font-medium text-blue-600">{formData.silenceThreshold}</span>
                <span>Poco sensible</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Qué tan sensible debe ser la detección de silencio
              </p>
            </div>
          </div>
        </div>

        {/* Transcripción */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            🎤 Transcripción Automática
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="autoTranscribe"
                checked={formData.autoTranscribe}
                onChange={(e) => handleInputChange('autoTranscribe', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="autoTranscribe" className="ml-2 block text-sm text-gray-900">
                Transcribir automáticamente después de grabar
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Idioma preferido para transcripción
              </label>
              <select
                value={formData.preferredLanguage}
                onChange={(e) => handleInputChange('preferredLanguage', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="auto">Detección automática</option>
                <option value="es">Español</option>
                <option value="en">Inglés</option>
                <option value="fr">Francés</option>
                <option value="de">Alemán</option>
                <option value="it">Italiano</option>
                <option value="pt">Portugués</option>
              </select>
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex space-x-4">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isSaving ? '⏳ Guardando...' : '💾 Guardar Configuraciones'}
          </button>
          
          <button
            onClick={handleReset}
            disabled={isSaving}
            className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
          >
            🔄 Restablecer
          </button>
        </div>

        {/* Información adicional */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-blue-900 mb-2">💡 Consejos por tipo de grabación:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <h4 className="font-medium mb-1">⚡ Grabaciones rápidas (3-10s):</h4>
              <ul className="space-y-1">
                <li>• Ideal para capturas rápidas</li>
                <li>• Presentaciones con pausas cortas</li>
                <li>• Demos de software</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-1">🎯 Grabaciones medias (1-5m):</h4>
              <ul className="space-y-1">
                <li>• Tutoriales con explicaciones</li>
                <li>• Reuniones con pausas naturales</li>
                <li>• Contenido educativo</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-1">🎬 Grabaciones largas (5-15m):</h4>
              <ul className="space-y-1">
                <li>• Conferencias y webinars</li>
                <li>• Sesiones de trabajo extensas</li>
                <li>• Contenido con pausas largas</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-1">🔧 Configuración de umbrales:</h4>
              <ul className="space-y-1">
                <li>• Umbral de sonido bajo = más sensible</li>
                <li>• Umbral de silencio bajo = más estricto</li>
                <li>• Ajusta según tu entorno de audio</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
