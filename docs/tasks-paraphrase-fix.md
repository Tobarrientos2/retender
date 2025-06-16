# Task Breakdown Structure
## Sistema de Generación Consistente de Paráfrasis Incorrectas

## 🔴 TAREAS P0 (CRÍTICAS - BLOQUEAN MVP)

### 📋 TAREA P0.1 - Fix Frontend Bug en startParaphraseMode
**🎯 OBJETIVO**: Corregir el parámetro incorrecto que causa fallo en la generación de anti-afirmaciones
**🔗 DEPENDENCIAS**: src/components/ReviewInterface.tsx
**⏱️ ESTIMACIÓN**: Complejidad: Baja (15 minutos)

#### SUBTAREAS:
##### P0.1.1 - Corregir parámetro en generateAntiAffirmations call
- 🔍 **Análisis Técnico**: Línea 378 usa `affirmations` en lugar de `originalAffirmations`
- 📊 **Diagrama**: Simple parameter fix
- 🛠️ **Implementación MVP**: Cambiar `affirmations: affirmations.map(a => a.content)` por `originalAffirmations: affirmations.map(aff => ({ content: aff.content, order: aff.order }))`
- 🧪 **Pruebas de Integración**: Verificar que paraphrase mode funciona sin errores
- 🔗 **Integraciones**: Convex action generateAntiAffirmations
- ⚡ **Performance**: Sin impacto en performance

### 📋 TAREA P0.2 - Optimizar Configuración de IA para Consistencia
**🎯 OBJETIVO**: Reducir variabilidad en generación mediante configuración optimizada
**🔗 DEPENDENCIAS**: convex/ai.ts, Gemini API configuration
**⏱️ ESTIMACIÓN**: Complejidad: Media (2 horas)

#### SUBTAREAS:
##### P0.2.1 - Reducir temperatura de IA de 0.8 a 0.4
- 🔍 **Análisis Técnico**: Temperatura alta causa inconsistencia en respuestas
- 📊 **Diagrama**: API configuration change
- 🛠️ **Implementación MVP**: Cambiar `temperature: 0.8` a `temperature: 0.4` en generateAntiAffirmations
- 🧪 **Pruebas de Integración**: Generar múltiples paráfrasis y verificar consistencia
- 🔗 **Integraciones**: Gemini API generationConfig
- ⚡ **Performance**: Respuestas más predecibles, mismo tiempo de respuesta

##### P0.2.2 - Ajustar topK y topP para mayor determinismo
- 🔍 **Análisis Técnico**: topK=40 y topP=0.95 permiten demasiada variabilidad
- 📊 **Diagrama**: Parameter tuning for consistency
- 🛠️ **Implementación MVP**: Cambiar a `topK: 20, topP: 0.85`
- 🧪 **Pruebas de Integración**: A/B testing de configuraciones
- 🔗 **Integraciones**: Gemini API generationConfig
- ⚡ **Performance**: Mejor consistencia sin impacto en velocidad

### 📋 TAREA P0.3 - Enhanced Prompt Engineering
**🎯 OBJETIVO**: Crear prompts más específicos que garanticen paráfrasis incorrectas
**🔗 DEPENDENCIAS**: convex/ai.ts, prompt templates
**⏱️ ESTIMACIÓN**: Complejidad: Alta (4 horas)

#### SUBTAREAS:
##### P0.3.1 - Reescribir prompt con ejemplos más específicos
- 🔍 **Análisis Técnico**: Prompt actual es ambiguo sobre nivel de incorrectez
- 📊 **Diagrama**: Enhanced prompt structure
- 🛠️ **Implementación MVP**: Nuevo prompt con 10+ ejemplos específicos de transformaciones incorrectas
- 🧪 **Pruebas de Integración**: Testing con diferentes tipos de afirmaciones técnicas
- 🔗 **Integraciones**: Gemini API prompt system
- ⚡ **Performance**: Mejor calidad de respuesta, mismo tiempo

##### P0.3.2 - Implementar sistema de validación de términos técnicos
- 🔍 **Análisis Técnico**: Necesidad de verificar que se usen términos imprecisos
- 📊 **Diagrama**: Term validation flow
- 🛠️ **Implementación MVP**: Lista de transformaciones válidas (subprocesos→mini tareas, etc.)
- 🧪 **Pruebas de Integración**: Verificar que todas las paráfrasis contienen términos imprecisos
- 🔗 **Integraciones**: Prompt template system
- ⚡ **Performance**: Validación rápida en memoria

## 🟡 TAREAS P1 (ALTAS - IMPORTANTES PARA FUNCIONALIDAD COMPLETA)

### 📋 TAREA P1.1 - Sistema de Validación Semántica Post-Generación
**🎯 OBJETIVO**: Implementar validación automática de similitud semántica
**🔗 DEPENDENCIAS**: convex/ai.ts, semantic comparison logic
**⏱️ ESTIMACIÓN**: Complejidad: Alta (6 horas)

#### SUBTAREAS:
##### P1.1.1 - Implementar cálculo de similitud semántica
- 🔍 **Análisis Técnico**: Comparar paráfrasis generada con original usando métricas simples
- 📊 **Diagrama**: Semantic similarity calculation
- 🛠️ **Implementación MVP**: Función que calcula % de palabras clave compartidas
- 🧪 **Pruebas de Integración**: Testing con paráfrasis conocidas (correctas vs incorrectas)
- 🔗 **Integraciones**: generateAntiAffirmations function
- ⚡ **Performance**: < 100ms para cálculo de similitud

##### P1.1.2 - Sistema de retry automático para paráfrasis muy similares
- 🔍 **Análisis Técnico**: Re-generar si similitud > 75%
- 📊 **Diagrama**: Retry logic flow
- 🛠️ **Implementación MVP**: Loop de hasta 3 intentos con validación
- 🧪 **Pruebas de Integración**: Simular casos de alta similitud
- 🔗 **Integraciones**: Gemini API retry logic
- ⚡ **Performance**: Máximo 9 segundos (3 intentos × 3s)

### 📋 TAREA P1.2 - Quality Scoring System
**🎯 OBJETIVO**: Implementar sistema de puntuación de calidad para paráfrasis incorrectas
**🔗 DEPENDENCIAS**: convex/ai.ts, scoring algorithms
**⏱️ ESTIMACIÓN**: Complejidad: Media (3 horas)

#### SUBTAREAS:
##### P1.2.1 - Algoritmo de scoring basado en criterios educativos
- 🔍 **Análisis Técnico**: Puntuar basado en: términos imprecisos, contexto mantenido, realismo
- 📊 **Diagrama**: Quality scoring algorithm
- 🛠️ **Implementación MVP**: Función que asigna score 0-100 basado en criterios
- 🧪 **Pruebas de Integración**: Testing con paráfrasis de diferentes calidades
- 🔗 **Integraciones**: AntiAffirmationResponse interface
- ⚡ **Performance**: < 50ms para cálculo de score

## 🟢 TAREAS P2 (MEDIAS - MEJORAS DE EXPERIENCIA)

### 📋 TAREA P2.1 - Enhanced Error Handling y User Feedback
**🎯 OBJETIVO**: Mejorar manejo de errores y feedback al usuario
**🔗 DEPENDENCIAS**: src/components/ReviewInterface.tsx
**⏱️ ESTIMACIÓN**: Complejidad: Media (2 horas)

#### SUBTAREAS:
##### P2.1.1 - Improved loading states durante generación
- 🔍 **Análisis Técnico**: Loading states más informativos
- 📊 **Diagrama**: Enhanced UI states
- 🛠️ **Implementación MVP**: Progress indicators y mensajes específicos
- 🧪 **Pruebas de Integración**: Testing de diferentes estados de carga
- 🔗 **Integraciones**: React state management
- ⚡ **Performance**: Mejor UX sin impacto en performance

### 📋 TAREA P2.2 - Debug Mode para Development
**🎯 OBJETIVO**: Implementar modo debug para testing de consistencia
**🔗 DEPENDENCIAS**: convex/ai.ts, environment variables
**⏱️ ESTIMACIÓN**: Complejidad: Baja (1 hora)

#### SUBTAREAS:
##### P2.2.1 - Console logging detallado en development
- 🔍 **Análisis Técnico**: Logs de similitud, quality scores, retry attempts
- 📊 **Diagrama**: Debug logging flow
- 🛠️ **Implementación MVP**: Conditional logging basado en NODE_ENV
- 🧪 **Pruebas de Integración**: Verificar logs en development mode
- 🔗 **Integraciones**: Convex environment
- ⚡ **Performance**: Sin impacto en production

## 🔵 TAREAS P3 (BAJAS - OPTIMIZACIONES)

### 📋 TAREA P3.1 - Template-Based Error Generation
**🎯 OBJETIVO**: Sistema de templates para tipos específicos de errores
**🔗 DEPENDENCIAS**: convex/ai.ts, template system
**⏱️ ESTIMACIÓN**: Complejidad: Alta (5 horas)

#### SUBTAREAS:
##### P3.1.1 - Crear biblioteca de transformaciones incorrectas
- 🔍 **Análisis Técnico**: Templates predefinidos para diferentes dominios técnicos
- 📊 **Diagrama**: Template system architecture
- 🛠️ **Implementación MVP**: JSON con patrones de transformación
- 🧪 **Pruebas de Integración**: Testing con diferentes dominios técnicos
- 🔗 **Integraciones**: Enhanced prompt system
- ⚡ **Performance**: Generación más rápida usando templates

### 📋 TAREA P3.2 - Performance Optimization
**🎯 OBJETIVO**: Optimizar tiempo de respuesta y uso de recursos
**🔗 DEPENDENCIAS**: convex/ai.ts, caching system
**⏱️ ESTIMACIÓN**: Complejidad: Media (3 horas)

#### SUBTAREAS:
##### P3.2.1 - Implementar caching de paráfrasis frecuentes
- 🔍 **Análisis Técnico**: Cache de paráfrasis para afirmaciones comunes
- 📊 **Diagrama**: Caching strategy
- 🛠️ **Implementación MVP**: Simple in-memory cache con TTL
- 🧪 **Pruebas de Integración**: Testing de cache hits y misses
- 🔗 **Integraciones**: Convex database
- ⚡ **Performance**: Reducción de 3s a 100ms para cache hits
