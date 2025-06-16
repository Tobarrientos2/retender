#!/usr/bin/env python3
"""
Script de prueba para verificar la integración WebSocket + Job Queue
"""

import asyncio
import json
import tempfile
import os
from pathlib import Path

import websockets
import aiohttp
from loguru import logger


async def test_websocket_integration():
    """Prueba completa de integración WebSocket + Job Queue"""
    
    logger.info("🧪 Iniciando prueba de integración WebSocket")
    
    # URL base de la API
    api_base = "http://localhost:9001"
    ws_base = "ws://localhost:9001"
    
    try:
        # 1. Verificar que la API esté corriendo
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{api_base}/health") as response:
                if response.status != 200:
                    logger.error("❌ API no está disponible")
                    return False
                logger.info("✅ API está corriendo")
        
        # 2. Crear un archivo de audio de prueba (silencio)
        test_audio_path = await create_test_audio()
        logger.info(f"✅ Archivo de prueba creado: {test_audio_path}")
        
        # 3. Enviar job de transcripción
        job_id = await submit_transcription_job(api_base, test_audio_path)
        if not job_id:
            logger.error("❌ No se pudo enviar job")
            return False
        logger.info(f"✅ Job enviado: {job_id}")
        
        # 4. Conectar WebSocket y monitorear progreso
        success = await monitor_job_progress(ws_base, job_id)
        
        # 5. Limpiar archivo de prueba
        os.unlink(test_audio_path)
        
        return success
        
    except Exception as e:
        logger.error(f"❌ Error en prueba de integración: {e}")
        return False


async def create_test_audio():
    """Crear archivo de audio de prueba (silencio de 1 segundo)"""
    try:
        # Crear archivo WAV simple con silencio
        import wave
        import struct
        
        # Parámetros del audio
        sample_rate = 16000
        duration = 1.0  # 1 segundo
        num_samples = int(sample_rate * duration)
        
        # Crear archivo temporal
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.wav')
        
        with wave.open(temp_file.name, 'w') as wav_file:
            wav_file.setnchannels(1)  # Mono
            wav_file.setsampwidth(2)  # 16-bit
            wav_file.setframerate(sample_rate)
            
            # Escribir silencio (ceros)
            for _ in range(num_samples):
                wav_file.writeframes(struct.pack('<h', 0))
        
        return temp_file.name
        
    except Exception as e:
        logger.error(f"❌ Error creando audio de prueba: {e}")
        raise


async def submit_transcription_job(api_base: str, audio_file_path: str) -> str:
    """Enviar job de transcripción"""
    try:
        async with aiohttp.ClientSession() as session:
            # Preparar archivo para upload
            with open(audio_file_path, 'rb') as f:
                data = aiohttp.FormData()
                data.add_field('file', f, filename='test_audio.wav')
                data.add_field('language', 'auto')
                data.add_field('model', 'base')  # Usar base para prueba rápida
                data.add_field('return_timestamps', 'true')
                
                async with session.post(f"{api_base}/transcribe-job", data=data) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(f"❌ Error enviando job: {response.status} - {error_text}")
                        return None
                    
                    result = await response.json()
                    return result['job_id']
                    
    except Exception as e:
        logger.error(f"❌ Error enviando job: {e}")
        return None


async def monitor_job_progress(ws_base: str, job_id: str) -> bool:
    """Monitorear progreso del job via WebSocket"""
    try:
        ws_url = f"{ws_base}/ws/transcription/{job_id}"
        logger.info(f"🔌 Conectando a WebSocket: {ws_url}")
        
        async with websockets.connect(ws_url) as websocket:
            logger.info("✅ WebSocket conectado")
            
            # Enviar ping inicial
            ping_message = {
                "type": "ping",
                "job_id": job_id
            }
            await websocket.send(json.dumps(ping_message))
            
            # Solicitar estado inicial
            status_message = {
                "type": "get_status",
                "job_id": job_id
            }
            await websocket.send(json.dumps(status_message))
            
            # Monitorear mensajes
            timeout_count = 0
            max_timeout = 60  # 60 segundos máximo
            
            while timeout_count < max_timeout:
                try:
                    # Esperar mensaje con timeout
                    message = await asyncio.wait_for(websocket.recv(), timeout=1.0)
                    data = json.loads(message)
                    
                    message_type = data.get('type')
                    job_data = data.get('data', {})
                    
                    logger.info(f"📨 Mensaje recibido: {message_type}")
                    
                    if message_type == 'connected':
                        logger.info("✅ Confirmación de conexión")
                    
                    elif message_type == 'pong':
                        logger.info("🏓 Pong recibido")
                    
                    elif message_type == 'status':
                        status = job_data.get('status')
                        progress = job_data.get('progress', 0)
                        message_text = job_data.get('message', '')
                        logger.info(f"📊 Estado: {status} - {progress}% - {message_text}")

                        # Si el job ya está completado cuando nos conectamos
                        if status == 'completed':
                            if 'result' in job_data:
                                result = job_data['result']
                                text = result.get('text', '')
                                logger.info(f"📝 Texto transcrito: '{text}'")
                            logger.info("✅ Job ya estaba completado al conectar")
                            return True
                    
                    elif message_type == 'progress':
                        status = job_data.get('status')
                        progress = job_data.get('progress', 0)
                        message_text = job_data.get('message', '')
                        logger.info(f"🔄 Progreso: {status} - {progress}% - {message_text}")
                    
                    elif message_type == 'completed':
                        status = job_data.get('status')
                        logger.info(f"✅ Job completado: {status}")
                        
                        if 'result' in job_data:
                            result = job_data['result']
                            text = result.get('text', '')
                            logger.info(f"📝 Texto transcrito: '{text}'")
                        
                        return True
                    
                    elif message_type == 'error':
                        error = job_data.get('error', 'Error desconocido')
                        logger.error(f"❌ Job falló: {error}")
                        return False
                    
                    # Reset timeout counter si recibimos mensaje
                    timeout_count = 0
                    
                except asyncio.TimeoutError:
                    timeout_count += 1
                    if timeout_count % 10 == 0:  # Log cada 10 segundos
                        logger.info(f"⏳ Esperando... ({timeout_count}s)")
                
                except Exception as e:
                    logger.error(f"❌ Error procesando mensaje: {e}")
                    break
            
            logger.error("⏰ Timeout esperando completación del job")
            return False
            
    except Exception as e:
        logger.error(f"❌ Error en WebSocket: {e}")
        return False


async def main():
    """Función principal"""
    logger.info("🚀 Iniciando pruebas de integración")
    
    success = await test_websocket_integration()
    
    if success:
        logger.info("✅ Todas las pruebas pasaron!")
        return 0
    else:
        logger.error("❌ Algunas pruebas fallaron")
        return 1


if __name__ == "__main__":
    import sys
    
    # Configurar logging
    logger.remove()
    logger.add(sys.stdout, level="INFO", format="{time:HH:mm:ss} | {level} | {message}")
    
    # Ejecutar pruebas
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
