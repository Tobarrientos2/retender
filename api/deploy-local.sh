#!/bin/bash

# Script de deployment directo desde directorio local a Koyeb
# Usa el comando 'koyeb deploy' para subir el directorio actual

set -e

echo "🚀 Deployment directo a Koyeb Free Tier"
echo "======================================="

# Verificar que el CLI esté instalado
if ! command -v koyeb &> /dev/null; then
    echo "❌ Koyeb CLI no encontrado"
    echo "💡 Instala con: curl -fsSL https://raw.githubusercontent.com/koyeb/koyeb-cli/master/install.sh | sh"
    exit 1
fi

# Verificar que estemos en el directorio correcto
if [ ! -f "main.py" ] || [ ! -f "Dockerfile" ]; then
    echo "❌ No estás en el directorio de la API"
    echo "💡 Ejecuta desde el directorio que contiene main.py y Dockerfile"
    exit 1
fi

# Configuración
APP_NAME="transcription-api"
SERVICE_NAME="api"

echo "📋 Configuración del deployment:"
echo "  App: $APP_NAME"
echo "  Service: $SERVICE_NAME"
echo "  Directorio: $(pwd)"
echo "  Instance: Free (0.1 vCPU, 512MB RAM)"
echo ""

# Limpiar archivos temporales antes del deployment
echo "🧹 Limpiando archivos temporales..."
rm -rf logs/* temp/* __pycache__ */__pycache__ .pytest_cache
find . -name "*.pyc" -delete
find . -name "*.pyo" -delete

echo "📦 Archivos a subir:"
ls -la

echo ""
echo "🔨 Iniciando deployment desde directorio local..."

# Usar koyeb deploy para subir directamente
koyeb deploy . $APP_NAME/api \
    --type web \
    --archive-builder docker \
    --archive-docker-dockerfile Dockerfile \
    --ports 8000:http \
    --regions fra \
    --instance-type free \
    --env ENVIRONMENT=production \
    --env PYTHONUNBUFFERED=1 \
    --env PYTHONDONTWRITEBYTECODE=1 \
    --env HOST=0.0.0.0 \
    --env PORT=8000 \
    --env GROQ_API_KEY=$GROQ_API_KEY \
    --checks 8000:http:/health \
    --min-scale 0 \
    --max-scale 1

echo ""
echo "⏳ Deployment iniciado. Puedes monitorear el progreso en:"
echo "🌐 https://app.koyeb.com/apps/$APP_NAME"
echo ""

echo "📋 Comandos útiles mientras esperas:"
echo "  Ver apps:     koyeb apps list"
echo "  Ver status:   koyeb apps get $APP_NAME"
echo "  Ver logs:     koyeb services logs $APP_NAME/api"
echo ""

echo "✨ Una vez completado, tu API estará disponible en:"
echo "🌐 https://$APP_NAME-[random].koyeb.app"
echo "📚 Docs: https://$APP_NAME-[random].koyeb.app/docs"
echo "❤️ Health: https://$APP_NAME-[random].koyeb.app/health"
