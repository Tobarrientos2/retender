# Product Requirements Document (PRD) - Retender: Sistema de Sesiones Inteligentes

## 🎯 OBJETIVO GENERAL
Implementar el **Sistema de Sesiones Inteligentes** en Retender, transformando la aplicación de un generador de sets únicos de 3 afirmaciones a una plataforma completa de aprendizaje estructurado que extrae múltiples sesiones temáticas de contenido extenso, maximizando el valor educativo de cualquier material proporcionado.

## 🏗️ ARQUITECTURA TARGET
Sistema de Sesiones Inteligentes con backend ya implementado y frontend a desarrollar:

```mermaid
graph TB
    A[Frontend - React 19 + TypeScript] --> B[Vite Build System]
    A --> C[Tailwind CSS Styling]
    A --> D[Convex Backend]
    D --> E[Authentication System]
    D --> F[Affirmations Database ✅]
    D --> G[AI Processing - Gemini ✅]
    D --> H[Sessions Generator ✅]

    I[Sessions Frontend ❌] --> A
    I --> J[CreateSessions Component ❌]
    I --> K[SessionsList Component ❌]
    I --> L[SessionsNavigation ❌]

    M[Backend APIs ✅] --> N[generateSessions ✅]
    M --> O[generateAffirmations ✅]
    M --> P[generateAntiAffirmations ✅]
```

## ✅ SUCCESS CRITERIA
### Funcionales:
- ✅ Sistema completo de afirmaciones objetivas (3 por set)
- ✅ Detección automática de tipo de contenido (General vs Programming)
- ✅ Prompts especializados con límites de palabras precisos
- ✅ Sistema innovador de anti-afirmaciones para práctica
- ✅ Modo de práctica interactivo con scoring
- ✅ Feedback inmediato y explicaciones de errores
- ✅ Interface gamificada y engaging
- ✅ **Backend de Sesiones Inteligentes completamente implementado**
- ❌ **Frontend de Sesiones Inteligentes (PENDIENTE)**
- ❌ **Navegación entre múltiples sesiones (PENDIENTE)**
- ❌ **Interface para generar sesiones masivas (PENDIENTE)**

### Técnicos:
- ✅ IA especializada con Gemini API funcionando al 100%
- ✅ Base de datos transformada (affirmationSets + affirmations)
- ✅ APIs RESTful completas con TypeScript
- ✅ Sistema de autenticación seguro
- ✅ Testing completo con casos reales validados
- ✅ Arquitectura escalable y mantenible
- ✅ **Análisis semántico avanzado implementado**
- ✅ **Agrupación inteligente por relaciones temáticas**
- ✅ **Endpoint generateSessions funcional**
- ❌ **Componentes React para sesiones (PENDIENTE)**

## 🎯 SCOPE MVP - SISTEMA DE SESIONES INTELIGENTES
### INCLUIDO EN MVP:
- ✅ Sistema completo de afirmaciones (3 por set)
- ✅ IA que genera afirmaciones declarativas
- ✅ Interface de revisión simple y elegante
- ✅ Base de datos transformada (affirmationSets + affirmations)
- ✅ Eliminación completa de flashcards y spaced repetition
- ✅ Eliminación de funcionalidad de screen recording
- ✅ Rebranding completo a "Retender"
- ✅ UI adaptada al nuevo concepto
- ✅ **Backend de Sesiones Inteligentes completo**
- ❌ **CreateSessions Component (CRÍTICO)**
- ❌ **SessionsList Component (CRÍTICO)**
- ❌ **SessionsNavigation Component (CRÍTICO)**
- ❌ **Integración con Dashboard existente (CRÍTICO)**

### EXCLUIDO DEL MVP:
- Logo profesional personalizado
- Favicon personalizado
- Funcionalidades de colaboración
- Exportación de afirmaciones
- Categorización avanzada
- Persistencia de sesiones en base de datos (usar solo en memoria)
- Edición manual de sesiones generadas

## 🔧 ESPECIFICACIONES TÉCNICAS
### Frontend Specifications:
- **Framework**: Next.js-style React 19 con Vite
- **TypeScript**: Configuración estricta mantenida
- **Styling**: Tailwind CSS con tema existente
- **State Management**: Convex React hooks
- **Performance Targets**: 
  - First Contentful Paint < 1.5s
  - Largest Contentful Paint < 2.5s
  - Bundle size mantenido

### Backend Specifications:
- **Runtime**: Node.js con Convex
- **Database**: Convex database (sin cambios)
- **Authentication**: Convex Auth mantenido
- **AI Integration**: Gemini API (sin cambios)

### DevOps & Deployment:
- **Build Tool**: Vite 6.3.0
- **Package Manager**: npm
- **Development**: Hot reload mantenido
- **Production**: Build optimizado

## 📊 DIAGRAMAS DE ARQUITECTURA

### Flujo del Sistema de Sesiones Inteligentes:
```mermaid
flowchart TD
    A[Usuario ingresa texto extenso] --> B[CreateSessions Component]
    B --> C[generateSessions API ✅]
    C --> D[Gemini AI Analysis ✅]
    D --> E[Análisis Semántico ✅]
    E --> F[Agrupación Inteligente ✅]
    F --> G[Múltiples Sesiones Generadas ✅]
    G --> H[SessionsList Component ❌]
    H --> I[Usuario selecciona sesión]
    I --> J[ReviewInterface existente ✅]

    K[Criterios de Agrupación ✅] --> E
    K --> L[Temporal: Cronología]
    K --> M[Temático: Mismo dominio]
    K --> N[Causal: Causa-efecto]
    K --> O[Entidad: Mismo sujeto]
```

### Arquitectura de Componentes Frontend:
```mermaid
graph TD
    A[Dashboard ✅] --> B[CreateSessions ❌]
    A --> C[SessionsList ❌]
    A --> D[CreateSet ✅]
    A --> E[ReviewInterface ✅]

    B --> F[Text Input Area]
    B --> G[Generate Sessions Button]
    B --> H[Progress Indicator]

    C --> I[Sessions Grid]
    C --> J[Session Theme Cards]
    C --> K[Affirmations Preview]

    L[Backend APIs ✅] --> M[generateSessions ✅]
    L --> N[generateAffirmations ✅]
    L --> O[generateAntiAffirmations ✅]
```
