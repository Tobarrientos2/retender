"""
Cliente para sincronización con Convex Database
Permite enviar actualizaciones de estado de jobs desde la API Python a Convex
"""

import asyncio
import json
import logging
from typing import Dict, Any, Optional
from datetime import datetime

import httpx

logger = logging.getLogger(__name__)


class ConvexClient:
    """Cliente HTTP para comunicación con Convex Database"""
    
    def __init__(self, base_url: str, api_key: Optional[str] = None):
        """
        Inicializar cliente Convex
        
        Args:
            base_url: URL base del deployment de Convex
            api_key: API key para autenticación (opcional por ahora)
        """
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        
        # Headers para requests
        self.headers = {
            "Content-Type": "application/json",
        }
        
        if self.api_key:
            self.headers["Authorization"] = f"Bearer {self.api_key}"
        
        # Configuración de timeouts y reintentos
        self.timeout = 5.0
        self.max_retries = 3
        self.retry_delay = 1.0
        
        logger.info(f"🔗 ConvexClient inicializado para {self.base_url}")
    
    async def update_job_status(
        self,
        job_id: str,
        status: str,
        progress: float = 0.0,
        result: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None,
        started_at: Optional[datetime] = None,
        completed_at: Optional[datetime] = None
    ) -> bool:
        """
        Actualizar estado de un job en Convex
        
        Args:
            job_id: ID del job a actualizar
            status: Estado del job (pending, processing, completed, failed, cancelled)
            progress: Progreso del job (0-100)
            result: Resultado de la transcripción (si completado)
            error: Mensaje de error (si falló)
            started_at: Timestamp de inicio
            completed_at: Timestamp de finalización
            
        Returns:
            bool: True si la actualización fue exitosa
        """
        
        # Preparar payload
        payload = {
            "jobId": job_id,
            "status": status,
            "progress": progress,
        }
        
        # Agregar campos opcionales
        if result is not None:
            payload["result"] = result
            
        if error is not None:
            payload["error"] = error
        
        # Agregar timestamps si están disponibles
        timestamps = {}
        if started_at is not None:
            timestamps["startedAt"] = int(started_at.timestamp() * 1000)  # Convex usa milliseconds
            
        if completed_at is not None:
            timestamps["completedAt"] = int(completed_at.timestamp() * 1000)
            
        if timestamps:
            payload["timestamps"] = timestamps
        
        # Intentar enviar con reintentos
        for attempt in range(self.max_retries):
            try:
                success = await self._send_update(payload)
                if success:
                    logger.info(f"✅ Job {job_id} sincronizado exitosamente: {status} ({progress}%)")
                    return True
                    
            except Exception as e:
                logger.warning(f"⚠️ Intento {attempt + 1}/{self.max_retries} falló para job {job_id}: {e}")
                
                # Esperar antes del siguiente intento (excepto en el último)
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(self.retry_delay * (attempt + 1))
        
        logger.error(f"❌ Falló sincronización de job {job_id} después de {self.max_retries} intentos")
        return False
    
    async def _send_update(self, payload: Dict[str, Any]) -> bool:
        """
        Enviar actualización HTTP a Convex
        
        Args:
            payload: Datos a enviar
            
        Returns:
            bool: True si el envío fue exitoso
        """
        url = f"{self.base_url}/updateTranscriptionJob"
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    json=payload,
                    headers=self.headers,
                    timeout=self.timeout
                )
                
                # Verificar respuesta exitosa
                if response.status_code == 200:
                    response_data = response.json()
                    if response_data.get("success"):
                        return True
                    else:
                        logger.error(f"❌ Convex respondió con error: {response_data}")
                        return False
                else:
                    logger.error(f"❌ HTTP {response.status_code}: {response.text}")
                    return False
                    
        except httpx.TimeoutException:
            logger.error(f"⏰ Timeout enviando a Convex ({self.timeout}s)")
            return False
            
        except httpx.RequestError as e:
            logger.error(f"🌐 Error de red enviando a Convex: {e}")
            return False
            
        except Exception as e:
            logger.error(f"💥 Error inesperado enviando a Convex: {e}")
            return False
    
    async def health_check(self) -> bool:
        """
        Verificar conectividad con Convex
        
        Returns:
            bool: True si Convex está accesible
        """
        try:
            async with httpx.AsyncClient() as client:
                # Intentar hacer un request simple para verificar conectividad
                response = await client.get(
                    self.base_url,
                    headers=self.headers,
                    timeout=self.timeout
                )
                
                # Cualquier respuesta (incluso 404) indica que Convex está accesible
                logger.info(f"🏥 Health check Convex: HTTP {response.status_code}")
                return True
                
        except Exception as e:
            logger.error(f"💔 Health check Convex falló: {e}")
            return False


# Instancia global del cliente (se inicializa en main.py)
convex_client: Optional[ConvexClient] = None


def get_convex_client() -> Optional[ConvexClient]:
    """
    Obtener instancia global del cliente Convex
    
    Returns:
        ConvexClient o None si no está configurado
    """
    return convex_client


def initialize_convex_client(base_url: str, api_key: Optional[str] = None) -> ConvexClient:
    """
    Inicializar cliente Convex global
    
    Args:
        base_url: URL base del deployment de Convex
        api_key: API key para autenticación
        
    Returns:
        ConvexClient inicializado
    """
    global convex_client
    convex_client = ConvexClient(base_url, api_key)
    return convex_client
