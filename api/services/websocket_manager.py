"""
WebSocket Manager para comunicación en tiempo real
"""

import json
import asyncio
from typing import Dict, Set, Optional, Any
from datetime import datetime
from loguru import logger

from fastapi import WebSocket, WebSocketDisconnect
from models.transcription_models import (
    WebSocketMessage,
    TranscriptionJob
)


class WebSocketManager:
    """Manager para conexiones WebSocket y broadcasting"""
    
    def __init__(self):
        # Conexiones activas por job_id
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # Metadata de conexiones
        self.connection_metadata: Dict[WebSocket, Dict[str, Any]] = {}
        
    async def connect(self, websocket: WebSocket, job_id: str):
        """Conectar un WebSocket a un job específico"""
        await websocket.accept()
        
        # Agregar a conexiones activas
        if job_id not in self.active_connections:
            self.active_connections[job_id] = set()
        
        self.active_connections[job_id].add(websocket)
        
        # Guardar metadata
        self.connection_metadata[websocket] = {
            "job_id": job_id,
            "connected_at": datetime.now(),
            "last_ping": datetime.now()
        }
        
        logger.info(f"🔌 WebSocket conectado para job: {job_id}")
        
        # Enviar mensaje de bienvenida
        await self.send_message_to_websocket(
            websocket,
            WebSocketMessage(
                type="connected",
                job_id=job_id,
                data={
                    "message": "Conectado exitosamente",
                    "job_id": job_id
                }
            )
        )

        # Enviar estado actual del job inmediatamente
        await self._send_job_status(websocket, job_id)
    
    async def disconnect(self, websocket: WebSocket):
        """Desconectar un WebSocket"""
        if websocket not in self.connection_metadata:
            return
            
        metadata = self.connection_metadata[websocket]
        job_id = metadata["job_id"]
        
        # Remover de conexiones activas
        if job_id in self.active_connections:
            self.active_connections[job_id].discard(websocket)
            
            # Si no hay más conexiones para este job, limpiar
            if not self.active_connections[job_id]:
                del self.active_connections[job_id]
        
        # Remover metadata
        del self.connection_metadata[websocket]
        
        logger.info(f"🔌 WebSocket desconectado para job: {job_id}")
    
    async def send_message_to_job(self, job_id: str, message: WebSocketMessage):
        """Enviar mensaje a todas las conexiones de un job"""
        if job_id not in self.active_connections:
            logger.debug(f"📡 No hay conexiones activas para job: {job_id}")
            return
        
        connections = self.active_connections[job_id].copy()
        disconnected_connections = []
        
        for websocket in connections:
            try:
                await self.send_message_to_websocket(websocket, message)
            except Exception as e:
                logger.warning(f"❌ Error enviando mensaje a WebSocket: {e}")
                disconnected_connections.append(websocket)
        
        # Limpiar conexiones muertas
        for websocket in disconnected_connections:
            await self.disconnect(websocket)
    
    async def send_message_to_websocket(self, websocket: WebSocket, message: WebSocketMessage):
        """Enviar mensaje a un WebSocket específico"""
        try:
            message_dict = message.dict()
            # Convertir datetime a string para JSON serialization
            if 'timestamp' in message_dict:
                message_dict['timestamp'] = message_dict['timestamp'].isoformat()
            await websocket.send_text(json.dumps(message_dict, default=str))
        except Exception as e:
            logger.error(f"❌ Error enviando mensaje WebSocket: {e}")
            raise
    
    async def broadcast_progress(self, job: TranscriptionJob):
        """Broadcast de progreso de un job"""
        message = WebSocketMessage(
            type="progress",
            job_id=job.job_id,
            data={
                "status": job.status.value,
                "progress": job.progress,
                "message": job.message,
                "estimated_time_remaining": job.estimated_time_remaining
            }
        )
        
        await self.send_message_to_job(job.job_id, message)
    
    async def broadcast_completion(self, job: TranscriptionJob):
        """Broadcast de finalización de un job"""
        message_data = {
            "status": job.status.value,
            "progress": job.progress,
            "message": job.message,
            "completed_at": job.completed_at.isoformat() if job.completed_at else None
        }
        
        # Agregar resultado si está disponible
        if job.result:
            message_data["result"] = job.result.dict()
        
        # Agregar error si existe
        if job.error:
            message_data["error"] = job.error
        
        message = WebSocketMessage(
            type="completed" if job.status.value == "completed" else "error",
            job_id=job.job_id,
            data=message_data
        )
        
        await self.send_message_to_job(job.job_id, message)
    
    async def handle_websocket_message(self, websocket: WebSocket, data: str):
        """Manejar mensajes entrantes del WebSocket"""
        try:
            message_data = json.loads(data)
            message_type = message_data.get("type")
            
            if message_type == "ping":
                # Responder con pong
                await self.send_message_to_websocket(
                    websocket,
                    WebSocketMessage(
                        type="pong",
                        job_id=message_data.get("job_id", ""),
                        data={"timestamp": datetime.now().isoformat()}
                    )
                )
                
                # Actualizar último ping
                if websocket in self.connection_metadata:
                    self.connection_metadata[websocket]["last_ping"] = datetime.now()
            
            elif message_type == "get_status":
                # Enviar estado actual del job
                job_id = message_data.get("job_id")
                if job_id:
                    await self._send_job_status(websocket, job_id)
            
            else:
                logger.warning(f"⚠️ Tipo de mensaje WebSocket no reconocido: {message_type}")
                
        except json.JSONDecodeError:
            logger.error("❌ Error decodificando mensaje WebSocket JSON")
        except Exception as e:
            logger.error(f"❌ Error manejando mensaje WebSocket: {e}")
    
    async def _send_job_status(self, websocket: WebSocket, job_id: str):
        """Enviar estado actual de un job"""
        # Importar aquí para evitar circular imports
        from services.job_queue_service import job_queue_service
        
        job = await job_queue_service.get_job_status(job_id)
        if not job:
            await self.send_message_to_websocket(
                websocket,
                WebSocketMessage(
                    type="error",
                    job_id=job_id,
                    data={"error": "Job no encontrado"}
                )
            )
            return
        
        # Enviar estado actual
        message_data = {
            "status": job.status.value,
            "progress": job.progress,
            "message": job.message,
            "created_at": job.created_at.isoformat(),
            "started_at": job.started_at.isoformat() if job.started_at else None,
            "completed_at": job.completed_at.isoformat() if job.completed_at else None,
            "estimated_time_remaining": job.estimated_time_remaining
        }
        
        if job.result:
            message_data["result"] = job.result.dict()
        if job.error:
            message_data["error"] = job.error

        # Determinar el tipo de mensaje basado en el estado
        message_type = "status"
        if job.status.value == "completed":
            message_type = "completed"
        elif job.status.value == "failed":
            message_type = "error"

        await self.send_message_to_websocket(
            websocket,
            WebSocketMessage(
                type=message_type,
                job_id=job_id,
                data=message_data
            )
        )
    
    async def cleanup_stale_connections(self):
        """Limpiar conexiones inactivas (llamar periódicamente)"""
        current_time = datetime.now()
        stale_connections = []
        
        for websocket, metadata in self.connection_metadata.items():
            last_ping = metadata.get("last_ping", metadata["connected_at"])
            time_diff = (current_time - last_ping).total_seconds()
            
            # Si no hay ping en 5 minutos, considerar stale
            if time_diff > 300:  # 5 minutos
                stale_connections.append(websocket)
        
        for websocket in stale_connections:
            logger.info("🧹 Limpiando conexión WebSocket inactiva")
            await self.disconnect(websocket)
    
    def get_connection_stats(self) -> Dict[str, Any]:
        """Obtener estadísticas de conexiones"""
        total_connections = len(self.connection_metadata)
        jobs_with_connections = len(self.active_connections)
        
        return {
            "total_connections": total_connections,
            "jobs_with_connections": jobs_with_connections,
            "active_jobs": list(self.active_connections.keys())
        }


# Instancia global del manager
websocket_manager = WebSocketManager()
