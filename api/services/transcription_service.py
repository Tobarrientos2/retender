"""
Servicio de transcripción usando OpenAI Whisper
"""

import os
import time
import asyncio
from typing import Optional, Dict, Any
from pathlib import Path

from faster_whisper import WhisperModel
from loguru import logger

from models.transcription_models import (
    TranscriptionRequest,
    TranscriptionResponse,
    TranscriptionSegment,
    AudioInfo
)


class TranscriptionService:
    """Servicio de transcripción de audio usando Whisper"""
    
    def __init__(self):
        self.models: Dict[str, Any] = {}
        self.current_model_name: Optional[str] = None
        # Config flags
        self.use_faster_whisper = True  # Local CPU/GPU inference
        self.use_openai_api = False  # Usar solo modelo local
        
    async def initialize(self):
        """Inicializar el servicio de transcripción"""
        logger.info("🔄 Inicializando servicio de transcripción...")
        
        # Cargar modelo base por defecto
        await self.load_model("base")
        
        logger.info("✅ Servicio de transcripción inicializado")
    
    async def load_model(self, model_name: str = "base") -> bool:
        """
        Cargar modelo Whisper
        
        Args:
            model_name: Nombre del modelo (tiny, base, small, medium, large)
            
        Returns:
            bool: True si se cargó correctamente
        """
        # Si usamos la API de OpenAI no cargamos modelos locales
        if self.use_openai_api:
            logger.info("🔗 Configurado para usar OpenAI Whisper API – no se cargan modelos locales")
            return True
        
        try:
            if model_name in self.models:
                logger.info(f"📦 Modelo {model_name} ya está cargado")
                return True
            
            logger.info(f"📥 Cargando modelo Whisper: {model_name}")
            start_time = time.time()
            
            # Usar faster-whisper (más eficiente)
            model = WhisperModel(
                model_name,
                device="cpu",  # Cambiar a "cuda" si tienes GPU
                compute_type="int8"  # Usar int8 para mejor rendimiento en CPU
            )
            
            self.models[model_name] = model
            self.current_model_name = model_name
            
            load_time = time.time() - start_time
            logger.info(f"✅ Modelo {model_name} cargado en {load_time:.2f}s")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Error cargando modelo {model_name}: {e}")
            return False
    
    async def transcribe(self, request: TranscriptionRequest) -> TranscriptionResponse:
        """
        Transcribir archivo de audio
        
        Args:
            request: Request de transcripción
            
        Returns:
            TranscriptionResponse: Resultado de la transcripción
        """
        start_time = time.time()
        
        try:
            # Cargar modelo si es necesario
            if request.model not in self.models:
                success = await self.load_model(request.model)
                if not success:
                    raise Exception(f"No se pudo cargar el modelo {request.model}")
            
            model = self.models[request.model]
            
            # Obtener información del archivo de audio
            audio_info = await self._get_audio_info(request.audio_file_path)
            
            logger.info(f"🎤 Transcribiendo: {Path(request.audio_file_path).name}")
            logger.info(f"📊 Audio info: {audio_info.duration:.2f}s, {audio_info.sample_rate}Hz")
            
            # Transcribir usando faster-whisper
            result = await self._transcribe_faster_whisper(model, request)
            
            processing_time = time.time() - start_time
            
            # Crear respuesta
            response = TranscriptionResponse(
                text=result["text"],
                language=result["language"],
                model_used=request.model,
                segments=result.get("segments", []),
                audio_info=audio_info,
                processing_time=processing_time,
                config={
                    "model": request.model,
                    "language": request.language,
                    "return_timestamps": request.return_timestamps,
                    "temperature": request.temperature,
                    "initial_prompt": request.initial_prompt
                }
            )
            
            logger.info(f"✅ Transcripción completada en {processing_time:.2f}s")
            return response
            
        except Exception as e:
            logger.error(f"❌ Error en transcripción: {e}")
            raise Exception(f"Error en transcripción: {str(e)}")
    
    async def _transcribe_faster_whisper(self, model: WhisperModel, request: TranscriptionRequest) -> Dict[str, Any]:
        """Transcribir usando faster-whisper"""
        
        # Configurar parámetros
        transcribe_params = {
            "language": request.language,
            "temperature": request.temperature,
            "initial_prompt": request.initial_prompt,
        }
        
        # Remover parámetros None
        transcribe_params = {k: v for k, v in transcribe_params.items() if v is not None}
        
        # Transcribir
        segments, info = model.transcribe(
            request.audio_file_path,
            **transcribe_params
        )
        
        # Procesar resultados
        text_segments = []
        full_text = ""
        
        for i, segment in enumerate(segments):
            segment_data = TranscriptionSegment(
                id=i,
                start=segment.start,
                end=segment.end,
                text=segment.text.strip(),
                confidence=getattr(segment, 'avg_logprob', None)
            )
            text_segments.append(segment_data)
            full_text += segment.text.strip() + " "
        
        return {
            "text": full_text.strip(),
            "language": info.language,
            "segments": text_segments if request.return_timestamps else []
        }
    

    
    async def _get_audio_info(self, file_path: str) -> AudioInfo:
        """Obtener información del archivo de audio"""
        try:
            import ffmpeg
            
            # Obtener información usando ffprobe
            probe = ffmpeg.probe(file_path)
            audio_stream = next(
                (stream for stream in probe['streams'] if stream['codec_type'] == 'audio'),
                None
            )
            
            if not audio_stream:
                raise Exception("No se encontró stream de audio")
            
            duration = float(audio_stream.get('duration', 0))
            sample_rate = int(audio_stream.get('sample_rate', 0))
            channels = int(audio_stream.get('channels', 1))
            
            # Obtener tamaño del archivo
            file_size = os.path.getsize(file_path)
            size_mb = file_size / (1024 * 1024)
            
            # Obtener formato
            format_name = probe['format']['format_name']
            
            return AudioInfo(
                duration=duration,
                sample_rate=sample_rate,
                channels=channels,
                format=format_name,
                size_mb=round(size_mb, 2)
            )
            
        except Exception as e:
            logger.warning(f"⚠️ No se pudo obtener info de audio: {e}")
            # Fallback con información básica
            file_size = os.path.getsize(file_path)
            return AudioInfo(
                duration=0.0,
                sample_rate=16000,
                channels=1,
                format="unknown",
                size_mb=round(file_size / (1024 * 1024), 2)
            )
    
    async def health_check(self) -> bool:
        """Verificar que el servicio esté funcionando"""
        try:
            # Verificar que al menos un modelo esté cargado
            if not self.models:
                return False
            
            # Verificar que el modelo actual funcione
            if self.current_model_name and self.current_model_name in self.models:
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"❌ Health check falló: {e}")
            return False
    
    async def cleanup(self):
        """Limpiar recursos"""
        logger.info("🔄 Limpiando recursos del servicio de transcripción")
        
        # Limpiar modelos cargados
        self.models.clear()
        self.current_model_name = None
        
        logger.info("✅ Recursos limpiados")
    
    def get_loaded_models(self) -> list:
        """Obtener lista de modelos cargados"""
        return list(self.models.keys())
    
    def get_current_model(self) -> Optional[str]:
        """Obtener modelo actual"""
        return self.current_model_name
