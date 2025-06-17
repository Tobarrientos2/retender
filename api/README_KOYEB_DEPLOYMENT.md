# 🚀 Deployment a Koyeb Free Tier

## 📋 **Resumen**

Esta guía te ayuda a deployar la API de Transcripción con WebSocket a **Koyeb Free Tier** (0.1 vCPU, 512MB RAM, $0/hora).

## 🔧 **Preparación**

### **1. Instalar Koyeb CLI**

```bash
# Instalar CLI
curl -fsSL https://raw.githubusercontent.com/koyeb/koyeb-cli/master/install.sh | sh

# Agregar al PATH
echo 'export PATH=$HOME/.koyeb/bin:$PATH' >> ~/.zshrc
source ~/.zshrc

# Verificar instalación
koyeb --help
```

### **2. Crear Cuenta y Token**

1. **Crear cuenta**: https://app.koyeb.com/signup
2. **Crear token**: https://app.koyeb.com/user/settings/api
3. **Login con CLI**:
   ```bash
   koyeb login
   # Pegar el token cuando se solicite
   ```

## 🚀 **Métodos de Deployment**

### **Método 1: Deployment Directo (Recomendado)**

```bash
# Desde el directorio api/
chmod +x deploy-local.sh
./deploy-local.sh
```

### **Método 2: Deployment Manual**

```bash
# Deployment paso a paso
koyeb deploy \
    --name transcription-api \
    --type docker \
    --docker-dockerfile Dockerfile \
    --ports 8000:http \
    --regions fra \
    --instance-type free \
    --env ENVIRONMENT=production \
    --env PYTHONUNBUFFERED=1 \
    --env PYTHONDONTWRITEBYTECODE=1 \
    --env HOST=0.0.0.0 \
    --env PORT=8000 \
    --health-checks-http-path /health \
    --health-checks-http-port 8000 \
    --min-scale 1 \
    --max-scale 1 \
    .
```

## 📊 **Optimizaciones para Free Tier**

### **Dockerfile Optimizado**
- ✅ **Multi-stage build** para reducir tamaño
- ✅ **Usuario no-root** para seguridad
- ✅ **Health checks** configurados
- ✅ **Variables de entorno** optimizadas

### **Configuración de Memoria**
- ✅ **Python optimizado** para 512MB RAM
- ✅ **Whisper medium** (769MB) - se carga bajo demanda
- ✅ **Cleanup automático** de archivos temporales
- ✅ **Virtual environment** optimizado

### **CORS Dinámico**
```python
# Producción: CORS específico
if os.getenv("ENVIRONMENT") == "production":
    allowed_origins = ["https://*.koyeb.app"]
    allow_credentials = True
else:
    # Desarrollo: CORS permisivo
    allowed_origins = ["*"]
    allow_credentials = False
```

## 🔍 **Monitoreo y Debugging**

### **Comandos Útiles**

```bash
# Ver estado de la app
koyeb apps list
koyeb apps get transcription-api

# Ver logs en tiempo real
koyeb services logs transcription-api/api --follow

# Ver métricas
koyeb services get transcription-api/api

# Redeploy
koyeb services redeploy transcription-api/api
```

### **Health Checks**

```bash
# Verificar que la API esté funcionando
curl https://tu-app.koyeb.app/health

# Verificar documentación
curl https://tu-app.koyeb.app/docs
```

## 🌐 **URLs de Producción**

Una vez deployado, tendrás:

- **🌐 API Base**: `https://transcription-api-[random].koyeb.app`
- **📚 Documentación**: `https://transcription-api-[random].koyeb.app/docs`
- **❤️ Health Check**: `https://transcription-api-[random].koyeb.app/health`
- **🔌 WebSocket**: `wss://transcription-api-[random].koyeb.app/ws/transcription/{job_id}`

## 🔧 **Configuración Frontend**

Actualiza tu frontend para usar la URL de producción:

```typescript
// En lugar de localhost
const API_BASE_URL = 'https://transcription-api-[random].koyeb.app';
const WS_BASE_URL = 'wss://transcription-api-[random].koyeb.app';
```

## 📋 **Limitaciones Free Tier**

### **Recursos**
- ✅ **vCPU**: 0.1 (suficiente para transcripción)
- ✅ **RAM**: 512MB (optimizado para Whisper medium)
- ✅ **Storage**: Temporal (archivos se limpian automáticamente)
- ✅ **Bandwidth**: Ilimitado

### **Escalabilidad**
- ✅ **Instancias**: 1 (Free tier)
- ✅ **Regiones**: 1 (Frankfurt recomendado)
- ✅ **Uptime**: 99.9% SLA

## 🚨 **Troubleshooting**

### **Problemas Comunes**

**1. Out of Memory**
```bash
# Ver logs de memoria
koyeb services logs transcription-api/api | grep -i memory

# Solución: El Dockerfile está optimizado para 512MB
```

**2. Build Failures**
```bash
# Ver logs de build
koyeb services logs transcription-api/api --deployment

# Verificar que Dockerfile esté correcto
```

**3. Health Check Failures**
```bash
# Verificar endpoint de health
curl https://tu-app.koyeb.app/health

# Ver logs de la aplicación
koyeb services logs transcription-api/api
```

**4. WebSocket Issues**
```bash
# Verificar que WSS esté funcionando
# Usar herramientas como wscat o navegador
```

## 🎯 **Próximos Pasos**

1. **✅ Deploy completado**
2. **🔧 Actualizar frontend** con nueva URL
3. **🧪 Probar funcionalidad** completa
4. **📊 Monitorear performance**
5. **🔄 Configurar CI/CD** (opcional)

## 💡 **Tips de Optimización**

### **Performance**
- El modelo Whisper se carga bajo demanda
- Los archivos temporales se limpian automáticamente
- El health check evita cold starts

### **Costos**
- Free tier es completamente gratuito
- No hay límites de requests
- Bandwidth ilimitado

### **Seguridad**
- HTTPS/WSS automático
- Usuario no-root en container
- CORS configurado para producción

## 🎉 **¡Listo!**

Tu API de transcripción está ahora disponible 24/7 en Koyeb Free Tier, optimizada para el mejor performance posible con los recursos disponibles.

**¿Necesitas ayuda?** Revisa los logs con `koyeb services logs transcription-api/api`
