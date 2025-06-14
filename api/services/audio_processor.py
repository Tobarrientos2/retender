"""
Servicio de procesamiento de audio
Convierte diferentes formatos de audio a formato compatible con Whisper
"""

import os
import tempfile
import asyncio
from pathlib import Path
from typing import Optional

import ffmpeg
from pydub import AudioSegment
from loguru import logger


class AudioProcessor:
    """Procesador de archivos de audio para transcripción"""
    
    def __init__(self):
        self.supported_formats = {
            '.mp3', '.wav', '.m4a', '.flac', '.ogg', 
            '.webm', '.mp4', '.avi', '.mov', '.mkv'
        }
        self.target_sample_rate = 16000  # Whisper funciona mejor con 16kHz
        self.target_channels = 1  # Mono
    
    async def process_audio_file(self, input_path: str) -> str:
        """
        Procesar archivo de audio para optimizarlo para Whisper
        
        Args:
            input_path: Ruta del archivo de entrada
            
        Returns:
            str: Ruta del archivo procesado
        """
        try:
            input_file = Path(input_path)
            
            # Verificar que el archivo existe
            if not input_file.exists():
                raise FileNotFoundError(f"Archivo no encontrado: {input_path}")
            
            # Verificar formato soportado
            if input_file.suffix.lower() not in self.supported_formats:
                raise ValueError(f"Formato no soportado: {input_file.suffix}")
            
            logger.info(f"🎵 Procesando audio: {input_file.name}")
            
            # Si ya es WAV con las especificaciones correctas, no procesar
            if await self._is_optimal_format(input_path):
                logger.info("✅ Audio ya está en formato óptimo")
                return input_path
            
            # Crear archivo temporal para el resultado
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_file:
                output_path = temp_file.name
            
            # Procesar con FFmpeg (más rápido y robusto)
            await self._process_with_ffmpeg(input_path, output_path)
            
            logger.info(f"✅ Audio procesado: {Path(output_path).name}")
            return output_path
            
        except Exception as e:
            logger.error(f"❌ Error procesando audio: {e}")
            raise Exception(f"Error procesando audio: {str(e)}")
    
    async def _is_optimal_format(self, file_path: str) -> bool:
        """Verificar si el archivo ya está en formato óptimo"""
        try:
            probe = ffmpeg.probe(file_path)
            audio_stream = next(
                (stream for stream in probe['streams'] if stream['codec_type'] == 'audio'),
                None
            )
            
            if not audio_stream:
                return False
            
            # Verificar especificaciones
            sample_rate = int(audio_stream.get('sample_rate', 0))
            channels = int(audio_stream.get('channels', 0))
            codec = audio_stream.get('codec_name', '')
            
            return (
                sample_rate == self.target_sample_rate and
                channels == self.target_channels and
                codec in ['pcm_s16le', 'wav'] and
                file_path.lower().endswith('.wav')
            )
            
        except Exception:
            return False
    
    async def _process_with_ffmpeg(self, input_path: str, output_path: str):
        """Procesar audio usando FFmpeg"""
        try:
            # Configurar pipeline de FFmpeg
            stream = ffmpeg.input(input_path)
            
            # Aplicar filtros de audio
            stream = ffmpeg.output(
                stream,
                output_path,
                acodec='pcm_s16le',  # PCM 16-bit
                ac=self.target_channels,  # Mono
                ar=self.target_sample_rate,  # 16kHz
                loglevel='error'  # Reducir logs de FFmpeg
            )
            
            # Ejecutar en un hilo separado para no bloquear
            await asyncio.get_event_loop().run_in_executor(
                None, 
                lambda: ffmpeg.run(stream, overwrite_output=True, quiet=True)
            )
            
        except ffmpeg.Error as e:
            logger.error(f"❌ Error FFmpeg: {e}")
            # Fallback a pydub si FFmpeg falla
            await self._process_with_pydub(input_path, output_path)
        except Exception as e:
            logger.error(f"❌ Error procesando con FFmpeg: {e}")
            raise
    
    async def _process_with_pydub(self, input_path: str, output_path: str):
        """Procesar audio usando pydub (fallback)"""
        try:
            logger.info("🔄 Usando pydub como fallback")
            
            # Cargar audio con pydub
            audio = AudioSegment.from_file(input_path)
            
            # Convertir a mono
            if audio.channels > 1:
                audio = audio.set_channels(1)
            
            # Cambiar sample rate
            if audio.frame_rate != self.target_sample_rate:
                audio = audio.set_frame_rate(self.target_sample_rate)
            
            # Exportar como WAV
            audio.export(output_path, format="wav")
            
        except Exception as e:
            logger.error(f"❌ Error procesando con pydub: {e}")
            raise
    
    async def extract_audio_from_video(self, video_path: str) -> str:
        """
        Extraer audio de un archivo de video
        
        Args:
            video_path: Ruta del archivo de video
            
        Returns:
            str: Ruta del archivo de audio extraído
        """
        try:
            video_file = Path(video_path)
            
            if not video_file.exists():
                raise FileNotFoundError(f"Video no encontrado: {video_path}")
            
            logger.info(f"🎬 Extrayendo audio de video: {video_file.name}")
            
            # Crear archivo temporal para el audio
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_file:
                output_path = temp_file.name
            
            # Extraer audio con FFmpeg
            stream = ffmpeg.input(video_path)
            stream = ffmpeg.output(
                stream,
                output_path,
                acodec='pcm_s16le',
                ac=self.target_channels,
                ar=self.target_sample_rate,
                vn=None,  # Sin video
                loglevel='error'
            )
            
            await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: ffmpeg.run(stream, overwrite_output=True, quiet=True)
            )
            
            logger.info(f"✅ Audio extraído: {Path(output_path).name}")
            return output_path
            
        except Exception as e:
            logger.error(f"❌ Error extrayendo audio: {e}")
            raise Exception(f"Error extrayendo audio: {str(e)}")
    
    async def validate_audio_file(self, file_path: str) -> bool:
        """
        Validar que el archivo de audio sea válido
        
        Args:
            file_path: Ruta del archivo
            
        Returns:
            bool: True si es válido
        """
        try:
            # Verificar que el archivo existe
            if not os.path.exists(file_path):
                return False
            
            # Verificar que no esté vacío
            if os.path.getsize(file_path) == 0:
                return False
            
            # Intentar obtener información con FFmpeg
            probe = ffmpeg.probe(file_path)
            audio_streams = [
                stream for stream in probe['streams'] 
                if stream['codec_type'] == 'audio'
            ]
            
            # Debe tener al menos un stream de audio
            if not audio_streams:
                return False
            
            # Verificar duración mínima (al menos 0.1 segundos)
            duration = float(probe['format'].get('duration', 0))
            if duration < 0.1:
                return False
            
            return True
            
        except Exception as e:
            logger.warning(f"⚠️ Error validando audio: {e}")
            return False
    
    async def get_audio_duration(self, file_path: str) -> float:
        """
        Obtener duración del archivo de audio
        
        Args:
            file_path: Ruta del archivo
            
        Returns:
            float: Duración en segundos
        """
        try:
            probe = ffmpeg.probe(file_path)
            return float(probe['format']['duration'])
        except Exception:
            return 0.0
    
    def get_supported_formats(self) -> list:
        """Obtener lista de formatos soportados"""
        return list(self.supported_formats)
    
    async def cleanup_temp_file(self, file_path: str):
        """Limpiar archivo temporal"""
        try:
            if file_path and os.path.exists(file_path):
                os.unlink(file_path)
                logger.debug(f"🗑️ Archivo temporal eliminado: {file_path}")
        except Exception as e:
            logger.warning(f"⚠️ No se pudo eliminar archivo temporal: {e}")
    
    async def batch_process_audio_files(self, file_paths: list) -> list:
        """
        Procesar múltiples archivos de audio en paralelo
        
        Args:
            file_paths: Lista de rutas de archivos
            
        Returns:
            list: Lista de rutas de archivos procesados
        """
        try:
            logger.info(f"📦 Procesando {len(file_paths)} archivos en lote")
            
            # Procesar archivos en paralelo (máximo 4 a la vez)
            semaphore = asyncio.Semaphore(4)
            
            async def process_single_file(file_path):
                async with semaphore:
                    return await self.process_audio_file(file_path)
            
            tasks = [process_single_file(path) for path in file_paths]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Filtrar errores
            processed_files = []
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    logger.error(f"❌ Error procesando {file_paths[i]}: {result}")
                else:
                    processed_files.append(result)
            
            logger.info(f"✅ Procesados {len(processed_files)}/{len(file_paths)} archivos")
            return processed_files
            
        except Exception as e:
            logger.error(f"❌ Error en procesamiento en lote: {e}")
            raise
