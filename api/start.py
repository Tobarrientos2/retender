#!/usr/bin/env python3
"""
Script de inicio para la API de Transcripción
"""

import os
import sys
import argparse
from pathlib import Path

def check_dependencies():
    """Verificar que las dependencias estén instaladas"""
    try:
        import fastapi
        import whisper
        import ffmpeg
        print("✅ Dependencias principales encontradas")
        return True
    except ImportError as e:
        print(f"❌ Dependencia faltante: {e}")
        print("💡 Ejecuta: pip install -r requirements.txt")
        return False

def setup_directories():
    """Crear directorios necesarios"""
    directories = ["logs", "temp", "models"]
    
    for directory in directories:
        Path(directory).mkdir(exist_ok=True)
        print(f"📁 Directorio creado/verificado: {directory}")

def check_ffmpeg():
    """Verificar que FFmpeg esté disponible"""
    try:
        import ffmpeg
        # Intentar ejecutar ffmpeg
        ffmpeg.probe("dummy", v="quiet")
    except ffmpeg.Error:
        # Error esperado con archivo dummy, pero FFmpeg funciona
        print("✅ FFmpeg disponible")
        return True
    except Exception as e:
        print(f"❌ FFmpeg no disponible: {e}")
        print("💡 Instala FFmpeg: https://ffmpeg.org/download.html")
        return False

def main():
    parser = argparse.ArgumentParser(description="Iniciar API de Transcripción")
    parser.add_argument("--host", default="0.0.0.0", help="Host del servidor")
    parser.add_argument("--port", type=int, default=8000, help="Puerto del servidor")
    parser.add_argument("--reload", action="store_true", help="Habilitar auto-reload")
    parser.add_argument("--model", default="base", help="Modelo Whisper por defecto")
    parser.add_argument("--check-only", action="store_true", help="Solo verificar dependencias")
    
    args = parser.parse_args()
    
    print("🚀 Iniciando API de Transcripción de Audio")
    print("=" * 50)
    
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
    
    # Configurar variables de entorno
    os.environ["DEFAULT_MODEL"] = args.model
    os.environ["HOST"] = args.host
    os.environ["PORT"] = str(args.port)
    
    print(f"🌐 Servidor: http://{args.host}:{args.port}")
    print(f"📚 Documentación: http://{args.host}:{args.port}/docs")
    print(f"🤖 Modelo por defecto: {args.model}")
    print("=" * 50)
    
    # Iniciar servidor
    try:
        import uvicorn
        uvicorn.run(
            "main:app",
            host=args.host,
            port=args.port,
            reload=args.reload,
            log_level="info"
        )
    except KeyboardInterrupt:
        print("\n👋 Servidor detenido")
    except Exception as e:
        print(f"❌ Error iniciando servidor: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
