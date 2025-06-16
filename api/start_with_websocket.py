#!/usr/bin/env python3
"""
Script de inicio mejorado para la API de Transcripción con WebSocket
"""

import os
import sys
import argparse
import asyncio
from pathlib import Path

def check_dependencies():
    """Verificar que las dependencias estén instaladas"""
    try:
        import fastapi
        import faster_whisper
        import ffmpeg
        import websockets
        import aiohttp
        print("✅ Dependencias principales encontradas")
        return True
    except ImportError as e:
        print(f"❌ Dependencia faltante: {e}")
        print("💡 Ejecuta: pip install -r requirements.txt")
        return False

def check_ffmpeg():
    """Verificar que FFmpeg esté instalado"""
    try:
        import subprocess
        result = subprocess.run(['ffmpeg', '-version'], 
                              capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            print("✅ FFmpeg encontrado")
            return True
        else:
            print("❌ FFmpeg no funciona correctamente")
            return False
    except (subprocess.TimeoutExpired, FileNotFoundError):
        print("❌ FFmpeg no encontrado")
        print("💡 Instala FFmpeg: https://ffmpeg.org/download.html")
        return False
    except Exception as e:
        print(f"❌ Error verificando FFmpeg: {e}")
        return False

def setup_directories():
    """Crear directorios necesarios"""
    directories = ["logs", "temp", "models"]
    
    for directory in directories:
        Path(directory).mkdir(exist_ok=True)
        print(f"📁 Directorio creado/verificado: {directory}")

async def test_services():
    """Probar que los servicios funcionen correctamente"""
    try:
        print("🧪 Probando servicios...")
        
        # Importar servicios
        from services.transcription_service import TranscriptionService
        from services.job_queue_service import job_queue_service
        from services.websocket_manager import websocket_manager
        
        # Probar transcription service
        transcription_service = TranscriptionService()
        await transcription_service.initialize()
        print("✅ Transcription Service inicializado")
        
        # Probar job queue service
        await job_queue_service.start()
        queue_info = await job_queue_service.get_queue_info()
        print(f"✅ Job Queue Service iniciado: {queue_info}")
        
        # Probar websocket manager
        stats = websocket_manager.get_connection_stats()
        print(f"✅ WebSocket Manager listo: {stats}")
        
        # Limpiar
        await job_queue_service.stop()
        await transcription_service.cleanup()
        
        print("✅ Todos los servicios funcionan correctamente")
        return True
        
    except Exception as e:
        print(f"❌ Error probando servicios: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description="Iniciar API de Transcripción con WebSocket")
    parser.add_argument("--host", default="0.0.0.0", help="Host del servidor")
    parser.add_argument("--port", type=int, default=9000, help="Puerto del servidor")
    parser.add_argument("--reload", action="store_true", help="Habilitar auto-reload")
    parser.add_argument("--model", default="medium", help="Modelo Whisper por defecto")
    parser.add_argument("--check-only", action="store_true", help="Solo verificar dependencias")
    parser.add_argument("--test-services", action="store_true", help="Probar servicios antes de iniciar")
    
    args = parser.parse_args()
    
    print("🚀 Iniciando API de Transcripción con WebSocket")
    print("=" * 60)
    
    # Verificar dependencias
    if not check_dependencies():
        sys.exit(1)
    
    # Verificar FFmpeg
    if not check_ffmpeg():
        sys.exit(1)
    
    # Crear directorios
    setup_directories()
    
    if args.check_only:
        print("✅ Todas las verificaciones pasaron")
        return
    
    # Probar servicios si se solicita
    if args.test_services:
        print("\n🧪 Probando servicios...")
        success = asyncio.run(test_services())
        if not success:
            print("❌ Pruebas de servicios fallaron")
            sys.exit(1)
        print("✅ Pruebas de servicios exitosas\n")
    
    # Configurar variables de entorno
    os.environ["DEFAULT_MODEL"] = args.model
    os.environ["HOST"] = args.host
    os.environ["PORT"] = str(args.port)
    
    print(f"🌐 Servidor: http://{args.host}:{args.port}")
    print(f"📚 Documentación: http://{args.host}:{args.port}/docs")
    print(f"🔌 WebSocket: ws://{args.host}:{args.port}/ws/transcription/{{job_id}}")
    print(f"🤖 Modelo por defecto: {args.model}")
    print("=" * 60)
    print("\n📋 Endpoints disponibles:")
    print("  POST /transcribe-job     - Enviar job de transcripción")
    print("  GET  /job/{job_id}       - Estado del job")
    print("  DELETE /job/{job_id}     - Cancelar job")
    print("  GET  /queue/info         - Info de la cola")
    print("  WS   /ws/transcription/{job_id} - WebSocket para progreso")
    print("=" * 60)
    
    # Iniciar servidor
    try:
        import uvicorn
        uvicorn.run(
            "main:app",
            host=args.host,
            port=args.port,
            reload=args.reload,
            log_level="info",
            access_log=True
        )
    except KeyboardInterrupt:
        print("\n👋 Servidor detenido")
    except Exception as e:
        print(f"❌ Error iniciando servidor: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
