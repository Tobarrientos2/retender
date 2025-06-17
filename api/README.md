# 🎤 API de Transcripción de Audio

API REST moderna para transcripción de audio usando OpenAI Whisper, construida con FastAPI.

## 🚀 Características

- **🤖 OpenAI Whisper**: Transcripción de alta calidad
- **⚡ FastAPI**: API moderna y rápida
- **🎵 Múltiples formatos**: MP3, WAV, M4A, FLAC, OGG, WEBM, MP4
- **🌍 Multiidioma**: Detección automática o manual
- **⏱️ Timestamps**: Segmentación temporal opcional
- **📊 Información detallada**: Metadatos de audio y procesamiento
- **🔧 Procesamiento robusto**: FFmpeg para conversión de audio
- **📝 Documentación automática**: Swagger UI integrado

## 📋 Requisitos

### Sistema
- Python 3.8+
- FFmpeg
- 2GB+ RAM (recomendado 4GB+)

### Python
```bash
pip install -r requirements.txt
```

## 🛠️ Instalación

### Opción 1: Instalación Local

```bash
# Clonar repositorio
git clone <repo-url>
cd api

# Instalar dependencias
pip install -r requirements.txt

# Verificar instalación
python start.py --check-only

# Iniciar servidor
python start.py
```

### Opción 2: Docker

```bash
# Construir y ejecutar
docker-compose up --build

# Solo ejecutar (si ya está construido)
docker-compose up
```

### Opción 3: Docker manual

```bash
# Construir imagen
docker build -t transcription-api .

# Ejecutar contenedor
docker run -p 8000:8000 transcription-api
```

## 🎯 Uso

### Iniciar servidor

```bash
# Desarrollo (con auto-reload)
python start.py --reload

# Producción
python start.py --host 0.0.0.0 --port 8000

# Modelo específico
python start.py --model large
```

### Endpoints principales

#### 📤 Transcribir audio
```bash
curl -X POST "http://localhost:8000/transcribe" \
  -F "file=@audio.mp3" \
  -F "language=es" \
  -F "model=base" \
  -F "return_timestamps=true"
```

#### 🏥 Health check
```bash
curl http://localhost:8000/health
```

#### 📚 Documentación
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 📊 Modelos disponibles

| Modelo | Tamaño | Velocidad | Precisión | Uso recomendado |
|--------|--------|-----------|-----------|-----------------|
| tiny   | 39 MB  | ⚡⚡⚡⚡⚡ | ⭐⭐      | Pruebas rápidas |
| base   | 74 MB  | ⚡⚡⚡⚡   | ⭐⭐⭐    | Uso general |
| small  | 244 MB | ⚡⚡⚡     | ⭐⭐⭐⭐  | Buena calidad |
| medium | 769 MB | ⚡⚡       | ⭐⭐⭐⭐⭐ | Alta calidad |
| large  | 1550 MB| ⚡         | ⭐⭐⭐⭐⭐ | Máxima calidad |

## 🌍 Idiomas soportados

- **auto**: Detección automática
- **es**: Español
- **en**: Inglés
- **fr**: Francés
- **de**: Alemán
- **it**: Italiano
- **pt**: Portugués
- **ru**: Ruso
- **ja**: Japonés
- **ko**: Coreano
- **zh**: Chino
- **ar**: Árabe
- Y muchos más...

## 📝 Ejemplo de respuesta

```json
{
  "success": true,
  "text": "Hola, este es un ejemplo de transcripción de audio.",
  "language": "es",
  "model_used": "base",
  "segments": [
    {
      "id": 0,
      "start": 0.0,
      "end": 3.5,
      "text": "Hola, este es un ejemplo",
      "confidence": -0.2
    }
  ],
  "audio_info": {
    "duration": 3.5,
    "sample_rate": 44100,
    "channels": 2,
    "format": "mp3",
    "size_mb": 0.5
  },
  "processing_time": 1.23,
  "timestamp": "2024-01-15T10:30:00",
  "config": {
    "model": "base",
    "language": "es",
    "return_timestamps": true,
    "temperature": 0.0
  }
}
```

## ⚙️ Configuración

### Variables de entorno

```bash
# Servidor
HOST=0.0.0.0
PORT=8000
DEBUG=True

# Whisper
DEFAULT_MODEL=base
USE_FASTER_WHISPER=True
DEVICE=cpu
COMPUTE_TYPE=int8

# Archivos
MAX_FILE_SIZE_MB=25
TEMP_DIR=./temp
LOGS_DIR=./logs
```

### Archivo .env

```bash
cp .env.example .env
# Editar .env según necesidades
```

## 🔧 Desarrollo

### Estructura del proyecto

```
api/
├── main.py                 # Aplicación principal
├── start.py               # Script de inicio
├── requirements.txt       # Dependencias
├── Dockerfile            # Imagen Docker
├── docker-compose.yml    # Orquestación
├── models/               # Modelos de datos
│   └── transcription_models.py
├── services/             # Servicios
│   ├── transcription_service.py
│   └── audio_processor.py
├── logs/                 # Logs de la aplicación
├── temp/                 # Archivos temporales
└── README.md            # Este archivo
```

### Ejecutar tests

```bash
# Instalar dependencias de testing
pip install pytest httpx

# Ejecutar tests
pytest
```

### Logs

Los logs se guardan en `logs/api.log` con rotación diaria.

## 🚀 Producción

### Consideraciones

1. **Recursos**: Mínimo 2GB RAM, recomendado 4GB+
2. **Almacenamiento**: Los modelos se descargan automáticamente
3. **Red**: Puerto 8000 debe estar accesible
4. **Seguridad**: Configurar firewall y HTTPS

### Optimizaciones

- Usar `faster-whisper` (habilitado por defecto)
- Configurar `COMPUTE_TYPE=int8` para CPU
- Usar GPU si está disponible (`DEVICE=cuda`)
- Ajustar `MAX_CONCURRENT_TRANSCRIPTIONS`

## 🐛 Troubleshooting

### Error: FFmpeg no encontrado
```bash
# Ubuntu/Debian
sudo apt install ffmpeg

# macOS
brew install ffmpeg

# Windows
# Descargar desde https://ffmpeg.org/
```

### Error: Modelo no se descarga
- Verificar conexión a internet
- Verificar espacio en disco
- Revisar logs en `logs/api.log`

### Error: Archivo demasiado grande
- Ajustar `MAX_FILE_SIZE_MB` en configuración
- Comprimir audio antes de enviar

## 📄 Licencia

MIT License - ver archivo LICENSE para detalles.

## 🤝 Contribuir

1. Fork del repositorio
2. Crear rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## 📞 Soporte

- 📧 Email: soporte@ejemplo.com
- 🐛 Issues: GitHub Issues
- 📚 Docs: http://localhost:8000/docs
