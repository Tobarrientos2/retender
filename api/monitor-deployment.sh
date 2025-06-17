#!/bin/bash

# Script para monitorear el deployment de Koyeb
set -e

APP_NAME="transcription-api"
SERVICE_NAME="api"
KOYEB_CLI="$HOME/.koyeb/bin/koyeb"

echo "🔍 Monitoreando deployment de $APP_NAME/$SERVICE_NAME"
echo "=================================================="

# Función para obtener el estado
get_status() {
    $KOYEB_CLI services get $APP_NAME/$SERVICE_NAME --output json 2>/dev/null | jq -r '.status // "unknown"'
}

# Función para obtener la URL pública
get_public_url() {
    $KOYEB_CLI services get $APP_NAME/$SERVICE_NAME --output json 2>/dev/null | jq -r '.public_url // "pending"'
}

# Monitorear hasta que esté listo
TIMEOUT=600  # 10 minutos
ELAPSED=0
INTERVAL=15

echo "⏳ Esperando que el deployment complete..."
echo "   Timeout: ${TIMEOUT}s"
echo "   Intervalo de verificación: ${INTERVAL}s"
echo ""

while [ $ELAPSED -lt $TIMEOUT ]; do
    STATUS=$(get_status)
    PUBLIC_URL=$(get_public_url)
    
    echo "[$(date '+%H:%M:%S')] Status: $STATUS | URL: $PUBLIC_URL | Tiempo: ${ELAPSED}s"
    
    case $STATUS in
        "healthy")
            echo ""
            echo "✅ ¡Deployment completado exitosamente!"
            echo "=================================="
            echo "🌐 URL pública: $PUBLIC_URL"
            echo "📚 Documentación: $PUBLIC_URL/docs"
            echo "❤️ Health check: $PUBLIC_URL/health"
            echo "🔌 WebSocket: wss://${PUBLIC_URL#https://}/ws/transcription/{job_id}"
            echo ""
            
            # Probar health check
            echo "🧪 Probando health check..."
            if curl -s "$PUBLIC_URL/health" > /dev/null; then
                echo "✅ Health check exitoso"
            else
                echo "⚠️ Health check falló, pero el servicio está marcado como healthy"
            fi
            
            echo ""
            echo "📋 Comandos útiles:"
            echo "  Ver logs:     $KOYEB_CLI services logs $APP_NAME/$SERVICE_NAME"
            echo "  Ver status:   $KOYEB_CLI services get $APP_NAME/$SERVICE_NAME"
            echo "  Redeploy:     $KOYEB_CLI services redeploy $APP_NAME/$SERVICE_NAME"
            echo ""
            echo "🎉 ¡Tu API está lista para usar!"
            exit 0
            ;;
        "error"|"unhealthy")
            echo ""
            echo "❌ Deployment falló con status: $STATUS"
            echo "📋 Últimos logs:"
            $KOYEB_CLI services logs $APP_NAME/$SERVICE_NAME --tail 20
            echo ""
            echo "💡 Revisa los logs completos en: https://app.koyeb.com/apps/$APP_NAME"
            exit 1
            ;;
        "starting"|"building"|"deploying")
            # Estados normales durante deployment
            ;;
        *)
            echo "⚠️ Estado desconocido: $STATUS"
            ;;
    esac
    
    sleep $INTERVAL
    ELAPSED=$((ELAPSED + INTERVAL))
done

echo ""
echo "⏰ Timeout alcanzado después de ${TIMEOUT}s"
echo "📋 Estado final:"
$KOYEB_CLI services get $APP_NAME/$SERVICE_NAME
echo ""
echo "💡 El deployment puede seguir en progreso. Revisa en:"
echo "🌐 https://app.koyeb.com/apps/$APP_NAME"
exit 1
