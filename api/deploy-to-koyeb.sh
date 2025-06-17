#!/bin/bash

# Script de deployment a Koyeb Free Tier
# Asegúrate de tener el CLI de Koyeb instalado y configurado

set -e

echo "🚀 Iniciando deployment a Koyeb Free Tier"
echo "=========================================="

# Verificar que el CLI esté instalado
if ! command -v koyeb &> /dev/null; then
    echo "❌ Koyeb CLI no encontrado"
    echo "💡 Instala con: curl -fsSL https://raw.githubusercontent.com/koyeb/koyeb-cli/master/install.sh | sh"
    exit 1
fi

# Verificar que estemos logueados
if ! koyeb apps list &> /dev/null; then
    echo "❌ No estás logueado en Koyeb"
    echo "💡 Ejecuta: koyeb login"
    exit 1
fi

# Configuración
APP_NAME="transcription-api"
SERVICE_NAME="api"
REGION="fra"  # Frankfurt (Europe)

echo "📋 Configuración del deployment:"
echo "  App: $APP_NAME"
echo "  Service: $SERVICE_NAME"
echo "  Region: $REGION"
echo "  Instance: Free (0.1 vCPU, 512MB RAM)"
echo ""

# Verificar si la app ya existe
if koyeb apps get $APP_NAME &> /dev/null; then
    echo "📱 App '$APP_NAME' ya existe, actualizando..."
    UPDATE_MODE=true
else
    echo "📱 Creando nueva app '$APP_NAME'..."
    UPDATE_MODE=false
fi

# Crear o actualizar el deployment
echo "🔨 Iniciando deployment..."

if [ "$UPDATE_MODE" = true ]; then
    # Actualizar servicio existente
    koyeb services redeploy $APP_NAME/$SERVICE_NAME
else
    # Crear nueva app y servicio
    koyeb apps create $APP_NAME
    
    # Crear servicio con configuración optimizada para Free Tier
    koyeb services create $SERVICE_NAME \
        --app $APP_NAME \
        --git github.com/tu-usuario/tu-repo \
        --git-branch main \
        --git-build-command "docker build -t transcription-api ." \
        --git-run-command "python start_with_websocket.py --port 8000 --host 0.0.0.0" \
        --ports 8000:http \
        --regions $REGION \
        --instance-type free \
        --env ENVIRONMENT=production \
        --env PYTHONUNBUFFERED=1 \
        --env PYTHONDONTWRITEBYTECODE=1 \
        --env HOST=0.0.0.0 \
        --env PORT=8000 \
        --health-checks-http-path /health \
        --health-checks-http-port 8000 \
        --min-scale 1 \
        --max-scale 1
fi

echo ""
echo "⏳ Esperando que el deployment complete..."

# Esperar a que el deployment esté listo
TIMEOUT=300  # 5 minutos
ELAPSED=0
INTERVAL=10

while [ $ELAPSED -lt $TIMEOUT ]; do
    STATUS=$(koyeb services get $APP_NAME/$SERVICE_NAME --output json | jq -r '.status')
    
    if [ "$STATUS" = "healthy" ]; then
        echo "✅ Deployment completado exitosamente!"
        break
    elif [ "$STATUS" = "error" ] || [ "$STATUS" = "unhealthy" ]; then
        echo "❌ Deployment falló con status: $STATUS"
        echo "📋 Logs del servicio:"
        koyeb services logs $APP_NAME/$SERVICE_NAME --tail 50
        exit 1
    else
        echo "⏳ Status: $STATUS (esperando... ${ELAPSED}s/${TIMEOUT}s)"
        sleep $INTERVAL
        ELAPSED=$((ELAPSED + INTERVAL))
    fi
done

if [ $ELAPSED -ge $TIMEOUT ]; then
    echo "⏰ Timeout esperando deployment"
    echo "📋 Status actual:"
    koyeb services get $APP_NAME/$SERVICE_NAME
    exit 1
fi

# Obtener información del deployment
echo ""
echo "🎉 Deployment exitoso!"
echo "======================"

SERVICE_INFO=$(koyeb services get $APP_NAME/$SERVICE_NAME --output json)
PUBLIC_URL=$(echo $SERVICE_INFO | jq -r '.public_url')

echo "🌐 URL pública: $PUBLIC_URL"
echo "📚 Documentación: $PUBLIC_URL/docs"
echo "❤️ Health check: $PUBLIC_URL/health"
echo "🔌 WebSocket: wss://${PUBLIC_URL#https://}/ws/transcription/{job_id}"
echo ""

echo "📋 Comandos útiles:"
echo "  Ver logs:     koyeb services logs $APP_NAME/$SERVICE_NAME"
echo "  Ver status:   koyeb services get $APP_NAME/$SERVICE_NAME"
echo "  Redeploy:     koyeb services redeploy $APP_NAME/$SERVICE_NAME"
echo "  Escalar:      koyeb services update $APP_NAME/$SERVICE_NAME --scale 1"
echo ""

echo "✨ ¡Tu API de transcripción está ahora disponible en Koyeb!"
echo "💡 Recuerda actualizar tu frontend para usar la nueva URL"
