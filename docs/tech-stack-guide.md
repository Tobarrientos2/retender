# Guía Técnica - Stack de Grabación y Transcripción 100% Local

## 🚀 LIBRERÍAS OPEN SOURCE RECOMENDADAS

### 📦 DEPENDENCIAS PRINCIPALES

```json
{
  "dependencies": {
    "@huggingface/transformers": "^3.5.2",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@vitejs/plugin-basic-ssl": "^2.0.0"
  }
}
```

### 🎙️ TRANSCRIPCIÓN LOCAL - Transformers.js + Whisper

**Modelo recomendado**: `openai/whisper-base` (74MB)
- **Precisión**: 95%+ para audios claros
- **Velocidad**: 1-2x tiempo real
- **Idiomas**: 99+ idiomas soportados

```javascript
// worker.js - Transcription Worker
import { pipeline } from '@huggingface/transformers';

let transcriber = null;

self.onmessage = async function(e) {
  const { audio, language } = e.data;
  
  if (!transcriber) {
    transcriber = await pipeline(
      'automatic-speech-recognition',
      'openai/whisper-base',
      { device: 'webgpu' } // Usar GPU si está disponible
    );
  }
  
  const result = await transcriber(audio, {
    language: language || 'auto',
    return_timestamps: true,
    chunk_length_s: 30, // Chunks de 30 segundos
  });
  
  self.postMessage({ result });
};
```

### 🌐 TRADUCCIÓN LOCAL - NLLB (200+ idiomas)

**Modelo recomendado**: `Xenova/nllb-200-distilled-600M` (600MB)
- **Idiomas**: 200+ idiomas
- **Calidad**: Comparable a Google Translate
- **Velocidad**: < 5 segundos para 1000 palabras

```javascript
// translation-worker.js
import { pipeline } from '@huggingface/transformers';

let translator = null;

self.onmessage = async function(e) {
  const { text, srcLang, tgtLang } = e.data;
  
  if (!translator) {
    translator = await pipeline(
      'translation',
      'Xenova/nllb-200-distilled-600M'
    );
  }
  
  const result = await translator(text, {
    src_lang: srcLang, // ej: 'spa_Latn' para español
    tgt_lang: tgtLang, // ej: 'eng_Latn' para inglés
  });
  
  self.postMessage({ result });
};
```

### 🎬 GRABACIÓN DE PANTALLA - MediaRecorder API

```javascript
// useScreenRecorder.js
import { useState, useRef } from 'react';

export function useScreenRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = async () => {
    try {
      // Capturar pantalla + audio del sistema
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          mediaSource: 'screen',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          sampleRate: 44100
        }
      });

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9,opus'
      });

      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { 
          type: 'video/webm' 
        });
        setRecordedBlob(blob);
        setIsRecording(false);
      };

      mediaRecorderRef.current.start(1000); // Chunk cada segundo
      setIsRecording(true);

    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => {
        track.stop();
      });
    }
  };

  return {
    isRecording,
    recordedBlob,
    startRecording,
    stopRecording
  };
}
```

### 🔊 EXTRACCIÓN DE AUDIO

```javascript
// audioExtractor.js
export async function extractAudioFromVideo(videoBlob) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const audioContext = new AudioContext();
    
    video.src = URL.createObjectURL(videoBlob);
    
    video.onloadedmetadata = async () => {
      try {
        // Crear MediaElementSource para extraer audio
        const source = audioContext.createMediaElementSource(video);
        const destination = audioContext.createMediaStreamDestination();
        
        source.connect(destination);
        
        // Grabar solo el audio
        const mediaRecorder = new MediaRecorder(destination.stream, {
          mimeType: 'audio/webm;codecs=opus'
        });
        
        const audioChunks = [];
        
        mediaRecorder.ondataavailable = (event) => {
          audioChunks.push(event.data);
        };
        
        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunks, { 
            type: 'audio/webm' 
          });
          resolve(audioBlob);
        };
        
        mediaRecorder.start();
        video.play();
        
        video.onended = () => {
          mediaRecorder.stop();
        };
        
      } catch (error) {
        reject(error);
      }
    };
  });
}
```

## 🔧 CONFIGURACIÓN DE VITE

```javascript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [
    react(),
    basicSsl() // HTTPS requerido para MediaRecorder
  ],
  optimizeDeps: {
    exclude: ['@huggingface/transformers']
  },
  worker: {
    format: 'es'
  },
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    }
  }
});
```

## 📱 COMPONENTES REACT PRINCIPALES

### ScreenRecorder Component

```jsx
// components/ScreenRecorder.tsx
import React from 'react';
import { useScreenRecorder } from '../hooks/useScreenRecorder';

export function ScreenRecorder({ onRecordingComplete }) {
  const { isRecording, recordedBlob, startRecording, stopRecording } = useScreenRecorder();

  React.useEffect(() => {
    if (recordedBlob) {
      onRecordingComplete(recordedBlob);
    }
  }, [recordedBlob, onRecordingComplete]);

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">
          Grabación de Pantalla
        </h3>
        <p className="text-gray-600">
          Graba tu pantalla con audio del sistema
        </p>
      </div>

      <div className="flex space-x-4">
        {!isRecording ? (
          <button
            onClick={startRecording}
            className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            🔴 Iniciar Grabación
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            ⏹️ Detener Grabación
          </button>
        )}
      </div>

      {isRecording && (
        <div className="text-center">
          <div className="animate-pulse text-red-500">
            🔴 Grabando...
          </div>
        </div>
      )}
    </div>
  );
}
```

### TranscriptionEngine Component

```jsx
// components/TranscriptionEngine.tsx
import React, { useState } from 'react';

export function TranscriptionEngine({ audioBlob, onTranscriptionComplete }) {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [transcription, setTranscription] = useState('');

  const startTranscription = async () => {
    setIsTranscribing(true);
    setProgress(0);

    try {
      // Crear Web Worker para transcripción
      const worker = new Worker('/workers/transcription-worker.js');
      
      worker.postMessage({ 
        audio: audioBlob,
        language: 'auto' 
      });

      worker.onmessage = (e) => {
        const { result, progress: workerProgress } = e.data;
        
        if (workerProgress) {
          setProgress(workerProgress);
        }
        
        if (result) {
          setTranscription(result.text);
          setIsTranscribing(false);
          onTranscriptionComplete(result);
          worker.terminate();
        }
      };

    } catch (error) {
      console.error('Error en transcripción:', error);
      setIsTranscribing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">
          Transcripción de Audio
        </h3>
        <p className="text-gray-600">
          Convierte el audio a texto usando IA local
        </p>
      </div>

      {!isTranscribing ? (
        <button
          onClick={startTranscription}
          disabled={!audioBlob}
          className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 transition-colors"
        >
          🎤 Transcribir Audio
        </button>
      ) : (
        <div className="space-y-2">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-center text-sm text-gray-600">
            Transcribiendo... {Math.round(progress)}%
          </p>
        </div>
      )}

      {transcription && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold mb-2">Transcripción:</h4>
          <p className="text-gray-700">{transcription}</p>
        </div>
      )}
    </div>
  );
}
```

## 🌍 CÓDIGOS DE IDIOMAS PARA NLLB

```javascript
// languageCodes.js
export const LANGUAGE_CODES = {
  // Idiomas principales
  'Español': 'spa_Latn',
  'English': 'eng_Latn',
  'Français': 'fra_Latn',
  'Deutsch': 'deu_Latn',
  'Italiano': 'ita_Latn',
  'Português': 'por_Latn',
  '中文': 'zho_Hans',
  '日本語': 'jpn_Jpan',
  '한국어': 'kor_Hang',
  'العربية': 'arb_Arab',
  'Русский': 'rus_Cyrl',
  'हिन्दी': 'hin_Deva',
  // ... más de 200 idiomas disponibles
};

export const getLanguageCode = (languageName) => {
  return LANGUAGE_CODES[languageName] || 'eng_Latn';
};
```

## 💾 CACHE Y ALMACENAMIENTO LOCAL

```javascript
// utils/modelCache.js
export class ModelCache {
  static async cacheModel(modelName, modelData) {
    const db = await this.openDB();
    const transaction = db.transaction(['models'], 'readwrite');
    const store = transaction.objectStore('models');
    
    await store.put({
      name: modelName,
      data: modelData,
      timestamp: Date.now()
    });
  }

  static async getCachedModel(modelName) {
    const db = await this.openDB();
    const transaction = db.transaction(['models'], 'readonly');
    const store = transaction.objectStore('models');
    
    return await store.get(modelName);
  }

  static async openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('TransformersCache', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('models')) {
          db.createObjectStore('models', { keyPath: 'name' });
        }
      };
    });
  }
}
```

## 🎯 PRÓXIMOS PASOS

1. **Instalar dependencias**: `npm install @huggingface/transformers zustand`
2. **Configurar HTTPS**: Requerido para MediaRecorder API
3. **Implementar ScreenRecorder**: Comenzar con grabación básica
4. **Integrar Whisper**: Transcripción local con Transformers.js
5. **Agregar NLLB**: Traducción a 200+ idiomas
6. **Testing**: Probar con audios de 10-20 minutos

¡Tu aplicación será 100% gratuita, privada y funcionará completamente offline! 🚀
