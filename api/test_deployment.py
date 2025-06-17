#!/usr/bin/env python3
"""
Script de prueba para verificar que la API funciona correctamente
antes del deployment en Koyeb
"""

import os
import sys
import asyncio
import tempfile
from pathlib import Path

# Agregar el directorio actual al path
sys.path.insert(0, str(Path(__file__).parent))

async def test_imports():
    """Verificar que todas las importaciones funcionen"""
    print("🔍 Verificando importaciones...")
    
    try:
        import fastapi
        print("✅ FastAPI importado correctamente")
        
        import groq
        print("✅ Groq importado correctamente")
        
        import ffmpeg
        print("✅ FFmpeg-python importado correctamente")
        
        from services.audio_processor import AudioProcessor
        print("✅ AudioProcessor importado correctamente")
        
        from services.groq_transcription_service import GroqTranscriptionService
        print("✅ GroqTranscriptionService importado correctamente")
        
        return True
        
    except ImportError as e:
        print(f"❌ Error de importación: {e}")
        return False

async def test_audio_processor():
    """Verificar que AudioProcessor funcione sin pydub"""
    print("\n🔍 Verificando AudioProcessor...")

    try:
        from services.audio_processor import AudioProcessor

        processor = AudioProcessor()
        print("✅ AudioProcessor inicializado correctamente")

        # Verificar que no tenga referencias a pydub
        import inspect
        source = inspect.getsource(processor.__class__)
        if 'pydub' in source or 'AudioSegment' in source:
            print("❌ AudioProcessor aún contiene referencias a pydub")
            return False

        print("✅ AudioProcessor libre de dependencias pydub")
        return True

    except Exception as e:
        print(f"❌ Error en AudioProcessor: {e}")
        return False

async def test_groq_service():
    """Verificar que el servicio Groq se inicialice correctamente"""
    print("\n🔍 Verificando servicio Groq...")
    
    try:
        from services.groq_transcription_service import GroqTranscriptionService
        
        service = GroqTranscriptionService()
        print("✅ GroqTranscriptionService inicializado")
        
        # Verificar que detecte la falta de API key (esperado en test)
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            print("⚠️ GROQ_API_KEY no configurada (esperado en test local)")
        else:
            print("✅ GROQ_API_KEY configurada")
            
        return True
        
    except Exception as e:
        print(f"❌ Error en servicio Groq: {e}")
        return False

async def test_health_endpoint():
    """Verificar que el endpoint de health funcione"""
    print("\n🔍 Verificando endpoint de health...")
    
    try:
        from main import app
        from fastapi.testclient import TestClient
        
        client = TestClient(app)
        response = client.get("/health")
        
        if response.status_code == 200:
            print("✅ Endpoint /health retorna 200")
            
            data = response.json()
            if data.get("status") == "healthy":
                print("✅ Health check retorna status healthy")
                return True
            else:
                print(f"❌ Health check retorna status: {data.get('status')}")
                return False
        else:
            print(f"❌ Endpoint /health retorna status code: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error en health endpoint: {e}")
        return False

async def test_ffmpeg_availability():
    """Verificar que FFmpeg esté disponible"""
    print("\n🔍 Verificando disponibilidad de FFmpeg...")
    
    try:
        import ffmpeg
        
        # Intentar obtener información de FFmpeg
        try:
            # Crear un archivo de audio de prueba muy simple
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_file:
                temp_path = temp_file.name
                
            # Crear un archivo de audio silencioso de 1 segundo
            stream = ffmpeg.input('anullsrc=r=16000:cl=mono', f='lavfi', t=1)
            stream = ffmpeg.output(stream, temp_path, acodec='pcm_s16le')
            ffmpeg.run(stream, overwrite_output=True, quiet=True)
            
            # Verificar que el archivo se creó
            if os.path.exists(temp_path):
                print("✅ FFmpeg funciona correctamente")
                os.unlink(temp_path)
                return True
            else:
                print("❌ FFmpeg no pudo crear archivo de prueba")
                return False
                
        except ffmpeg.Error as e:
            print(f"❌ Error de FFmpeg: {e}")
            return False
            
    except Exception as e:
        print(f"❌ Error verificando FFmpeg: {e}")
        return False

async def main():
    """Ejecutar todas las pruebas"""
    print("🚀 Iniciando pruebas de deployment...\n")
    
    tests = [
        ("Importaciones", test_imports),
        ("AudioProcessor", test_audio_processor),
        ("Servicio Groq", test_groq_service),
        ("Health Endpoint", test_health_endpoint),
        ("FFmpeg", test_ffmpeg_availability),
    ]
    
    results = []
    
    for test_name, test_func in tests:
        try:
            result = await test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ Error ejecutando {test_name}: {e}")
            results.append((test_name, False))
    
    # Resumen
    print("\n" + "="*50)
    print("📊 RESUMEN DE PRUEBAS")
    print("="*50)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")
        if result:
            passed += 1
    
    print(f"\n📈 Resultado: {passed}/{total} pruebas pasaron")
    
    if passed == total:
        print("🎉 ¡Todas las pruebas pasaron! La API está lista para deployment.")
        return True
    else:
        print("⚠️ Algunas pruebas fallaron. Revisar antes del deployment.")
        return False

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
