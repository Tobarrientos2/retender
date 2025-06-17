# Multi-stage build optimizado para Koyeb Free Tier
FROM python:3.11-slim AS builder

# Instalar dependencias del sistema para build
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Crear virtual environment
WORKDIR /app
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copiar requirements y instalar dependencias
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Stage 2: Runtime optimizado para memoria limitada
FROM python:3.11-slim AS runtime

# Instalar solo dependencias runtime esenciales
RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copiar virtual environment del builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Crear usuario no-root
RUN useradd -m -u 1000 apiuser
WORKDIR /app

# Copiar código de la aplicación
COPY --chown=apiuser:apiuser . .

# Crear directorios necesarios
RUN mkdir -p logs temp models && chown -R apiuser:apiuser /app

# Cambiar a usuario no-root
USER apiuser

# Variables de entorno optimizadas para Koyeb
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONPATH=/app
ENV HOST=0.0.0.0
ENV PORT=8000

# Exponer puerto
EXPOSE 8000

# Health check ligero usando curl (más eficiente)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Comando optimizado para WebSocket + API
CMD ["python", "start_with_websocket.py", "--port", "8000", "--host", "0.0.0.0"]
