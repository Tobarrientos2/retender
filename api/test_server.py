#!/usr/bin/env python3
"""
Servidor de prueba mínimo para verificar que FastAPI funciona
"""

from fastapi import FastAPI
import uvicorn

app = FastAPI(title="Test Server")

@app.get("/")
async def root():
    return {"message": "Servidor de prueba funcionando"}

@app.get("/health")
async def health():
    return {"status": "ok"}

if __name__ == "__main__":
    print("🚀 Iniciando servidor de prueba en puerto 9000...")
    uvicorn.run(
        "test_server:app",
        host="0.0.0.0",
        port=9000,
        reload=False,
        log_level="info"
    )