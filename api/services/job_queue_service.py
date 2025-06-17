"""
Servicio de Job Queue para procesamiento en background
"""

import asyncio
import uuid
from typing import Dict, Optional, Callable, Any
from datetime import datetime
import logging

from models.transcription_models import (
    TranscriptionJob,
    JobStatus,
    TranscriptionRequest,
    TranscriptionResponse
)
from services.convex_client import get_convex_client

logger = logging.getLogger(__name__)


class JobQueueService:
    """Servicio de cola de trabajos para transcripción en background"""
    
    def __init__(self, max_concurrent_jobs: int = 3):
        self.jobs: Dict[str, TranscriptionJob] = {}
        self.job_queue: asyncio.Queue = asyncio.Queue()
        self.max_concurrent_jobs = max_concurrent_jobs
        self.active_jobs: Dict[str, asyncio.Task] = {}
        self.progress_callbacks: Dict[str, Callable] = {}
        self.is_running = False
        self.worker_tasks: list = []
        
    async def start(self):
        """Iniciar el servicio de job queue"""
        if self.is_running:
            return
            
        self.is_running = True
        logger.info(f"🚀 Iniciando Job Queue Service con {self.max_concurrent_jobs} workers")
        
        # Crear workers
        for i in range(self.max_concurrent_jobs):
            worker_task = asyncio.create_task(self._worker(f"worker-{i}"))
            self.worker_tasks.append(worker_task)
            
        logger.info("✅ Job Queue Service iniciado")
    
    async def stop(self):
        """Detener el servicio de job queue"""
        if not self.is_running:
            return
            
        logger.info("🔄 Deteniendo Job Queue Service...")
        self.is_running = False
        
        # Cancelar workers
        for task in self.worker_tasks:
            task.cancel()
            
        # Esperar a que terminen
        await asyncio.gather(*self.worker_tasks, return_exceptions=True)
        
        # Cancelar jobs activos
        for job_id, task in self.active_jobs.items():
            task.cancel()
            logger.info(f"❌ Job cancelado: {job_id}")
            
        self.worker_tasks.clear()
        self.active_jobs.clear()
        
        logger.info("✅ Job Queue Service detenido")
    
    async def submit_job(
        self,
        audio_file_path: str,
        request_params: TranscriptionRequest,
        progress_callback: Optional[Callable] = None
    ) -> str:
        """Enviar un job a la cola"""
        
        job_id = str(uuid.uuid4())
        
        # Crear job
        job = TranscriptionJob(
            job_id=job_id,
            status=JobStatus.PENDING,
            audio_file_path=audio_file_path,
            request_params=request_params,
            created_at=datetime.now()
        )
        
        # Guardar job y callback
        self.jobs[job_id] = job
        if progress_callback:
            self.progress_callbacks[job_id] = progress_callback
        
        # Agregar a la cola
        await self.job_queue.put(job_id)
        
        # Actualizar estado
        job.status = JobStatus.QUEUED
        job.message = "Job en cola"
        
        # Notificar progreso
        await self._notify_progress(job_id)
        
        logger.info(f"📋 Job enviado a cola: {job_id}")
        return job_id
    
    async def get_job_status(self, job_id: str) -> Optional[TranscriptionJob]:
        """Obtener estado de un job"""
        return self.jobs.get(job_id)
    
    async def cancel_job(self, job_id: str) -> bool:
        """Cancelar un job"""
        job = self.jobs.get(job_id)
        if not job:
            return False
            
        # Si está activo, cancelar task
        if job_id in self.active_jobs:
            self.active_jobs[job_id].cancel()
            del self.active_jobs[job_id]
            
        # Actualizar estado
        job.status = JobStatus.CANCELLED
        job.message = "Job cancelado"
        job.completed_at = datetime.now()
        
        await self._notify_progress(job_id)
        
        logger.info(f"❌ Job cancelado: {job_id}")
        return True
    
    async def get_queue_info(self) -> Dict[str, Any]:
        """Obtener información de la cola"""
        return {
            "queue_size": self.job_queue.qsize(),
            "active_jobs": len(self.active_jobs),
            "total_jobs": len(self.jobs),
            "max_concurrent_jobs": self.max_concurrent_jobs,
            "is_running": self.is_running
        }
    
    async def _worker(self, worker_name: str):
        """Worker que procesa jobs de la cola"""
        logger.info(f"👷 Worker {worker_name} iniciado")
        
        while self.is_running:
            try:
                # Esperar por un job (con timeout para poder salir)
                job_id = await asyncio.wait_for(
                    self.job_queue.get(),
                    timeout=1.0
                )
                
                # Procesar job
                await self._process_job(job_id, worker_name)
                
            except asyncio.TimeoutError:
                # Timeout normal, continuar
                continue
            except asyncio.CancelledError:
                # Worker cancelado
                break
            except Exception as e:
                logger.error(f"❌ Error en worker {worker_name}: {e}")
                
        logger.info(f"👷 Worker {worker_name} detenido")
    
    async def _process_job(self, job_id: str, worker_name: str):
        """Procesar un job específico"""
        job = self.jobs.get(job_id)
        if not job:
            logger.error(f"❌ Job no encontrado: {job_id}")
            return
            
        try:
            logger.info(f"🔄 Procesando job {job_id} en {worker_name}")
            
            # Actualizar estado
            job.status = JobStatus.PROCESSING
            job.message = "Procesando transcripción..."
            job.started_at = datetime.now()
            job.progress = 0.0
            
            await self._notify_progress(job_id)
            
            # Crear task para el procesamiento
            process_task = asyncio.create_task(
                self._transcribe_audio(job)
            )
            self.active_jobs[job_id] = process_task
            
            # Esperar resultado
            result = await process_task
            
            # Actualizar con resultado exitoso
            job.status = JobStatus.COMPLETED
            job.message = "Transcripción completada"
            job.progress = 100.0
            job.result = result
            job.completed_at = datetime.now()

            await self._notify_progress(job_id)

            # 🆕 SINCRONIZAR CON CONVEX
            await self._sync_job_with_convex(job)

            logger.info(f"✅ Job completado: {job_id}")
            
        except asyncio.CancelledError:
            # Job cancelado
            job.status = JobStatus.CANCELLED
            job.message = "Job cancelado"
            job.completed_at = datetime.now()
            await self._notify_progress(job_id)
            
        except Exception as e:
            # Error en el procesamiento
            job.status = JobStatus.FAILED
            job.message = f"Error: {str(e)}"
            job.error = str(e)
            job.completed_at = datetime.now()

            await self._notify_progress(job_id)

            # 🆕 SINCRONIZAR ERROR CON CONVEX
            await self._sync_job_with_convex(job)
            
            logger.error(f"❌ Job falló {job_id}: {e}")
            
        finally:
            # Limpiar job activo
            if job_id in self.active_jobs:
                del self.active_jobs[job_id]
    
    async def _transcribe_audio(self, job: TranscriptionJob) -> TranscriptionResponse:
        """Transcribir audio con callbacks de progreso"""
        # Importar aquí para evitar circular imports
        from services.transcription_service import TranscriptionService
        from services.audio_processor import AudioProcessor
        
        # Crear instancias de servicios
        transcription_service = TranscriptionService()
        audio_processor = AudioProcessor()
        
        # Asegurar que el servicio esté inicializado
        if not transcription_service.models:
            await transcription_service.initialize()
        
        # Procesar audio si es necesario
        processed_audio_path = await audio_processor.process_audio_file(
            job.audio_file_path
        )
        
        # Actualizar progreso
        job.progress = 20.0
        job.message = "Audio procesado, iniciando transcripción..."
        await self._notify_progress(job.job_id)
        
        # Crear callback de progreso personalizado
        async def progress_callback(progress: float, message: str):
            # Mapear progreso de transcripción (20-90%)
            mapped_progress = 20.0 + (progress * 0.7)
            job.progress = min(mapped_progress, 90.0)
            job.message = message
            await self._notify_progress(job.job_id)
        
        # Transcribir con callback
        result = await transcription_service.transcribe_with_progress(
            job.request_params,
            progress_callback
        )
        
        # Progreso final
        job.progress = 95.0
        job.message = "Finalizando transcripción..."
        await self._notify_progress(job.job_id)
        
        return result

    async def _sync_job_with_convex(self, job: TranscriptionJob):
        """
        Sincronizar estado del job con Convex Database

        Args:
            job: Job a sincronizar
        """
        convex_client = get_convex_client()
        if not convex_client:
            logger.warning(f"⚠️ ConvexClient no configurado, saltando sincronización para job {job.job_id}")
            return

        try:
            # Convertir resultado a formato serializable
            result_data = None
            if job.result:
                result_data = {
                    "text": job.result.text,
                    "language": job.result.language,
                    "duration": job.result.duration,
                    "segments": job.result.segments if hasattr(job.result, 'segments') else None,
                    "processing_time": job.result.processing_time if hasattr(job.result, 'processing_time') else None
                }

            # Sincronizar con Convex
            success = await convex_client.update_job_status(
                job_id=job.job_id,
                status=job.status.value,  # Convertir enum a string
                progress=job.progress,
                result=result_data,
                error=job.error,
                started_at=job.started_at,
                completed_at=job.completed_at
            )

            if success:
                logger.info(f"🔄 Job {job.job_id} sincronizado exitosamente con Convex")
            else:
                logger.error(f"❌ Falló sincronización de job {job.job_id} con Convex")

        except Exception as e:
            logger.error(f"💥 Error inesperado sincronizando job {job.job_id} con Convex: {e}")

    async def _notify_progress(self, job_id: str):
        """Notificar progreso a través del callback"""
        if job_id in self.progress_callbacks:
            try:
                callback = self.progress_callbacks[job_id]
                job = self.jobs[job_id]
                await callback(job)
            except Exception as e:
                logger.error(f"❌ Error en callback de progreso {job_id}: {e}")


# Instancia global del servicio
job_queue_service = JobQueueService()
