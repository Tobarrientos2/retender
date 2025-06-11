# Testing Guide - Sistema de Sesiones Inteligentes

## 🧪 PRUEBAS DE INTEGRACIÓN END-TO-END

### Prerequisitos
- Aplicación ejecutándose en `http://localhost:5173/`
- Backend Convex funcionando
- API Key de Gemini configurada

### 📋 FLUJO DE PRUEBA COMPLETO

#### 1. Acceso a la Aplicación
- [ ] Abrir `http://localhost:5173/`
- [ ] Verificar que aparece el Dashboard con 3 botones:
  - "Generate Sessions" (azul, nuevo)
  - "Create Affirmations" (blanco, existente)
  - "Review Affirmations" (negro, si hay sets)

#### 2. Navegación a CreateSessions
- [ ] Click en "Generate Sessions"
- [ ] Verificar navegación a CreateSessions component
- [ ] Verificar elementos de UI:
  - Header con "Generate Intelligent Sessions"
  - Textarea grande para contenido
  - Contador de caracteres y palabras
  - Botón "Generate Intelligent Sessions"
  - Secciones de ayuda y ejemplos

#### 3. Input de Contenido
- [ ] Pegar el contenido de prueba (2718 caracteres):

```
The History of the Bicycle

The bicycle has a fascinating history that spans over two centuries. The first verifiable claim for a practically used bicycle belongs to German Baron Karl von Drais, who invented his "running machine" in 1817. This early bicycle was called a draisine or hobby horse and had no pedals - riders propelled themselves by pushing their feet against the ground.

In 1819, the first commercial bicycle was sold in London by Denis Johnson, who called it a "pedestrian curricle." These early bicycles were made entirely of wood and iron, making them quite heavy and uncomfortable to ride. The wheels were wooden with iron tires, and there was no suspension system.

The major breakthrough came in 1861 when Pierre Michaux and Pierre Lallement added pedals to the front wheel of a bicycle in Paris. This innovation created what became known as the "velocipede" or "boneshaker" due to its rough ride on cobblestone streets. The pedals were attached directly to the front wheel, which meant that one revolution of the pedals resulted in one revolution of the wheel.

In 1869, the first bicycle race was held in Paris, covering a distance of 1,200 meters. This event marked the beginning of competitive cycling as a sport. The same year saw the introduction of solid rubber tires, which provided a slightly more comfortable ride than the previous iron tires.

The 1870s brought the development of the "high-wheeler" or "penny-farthing" bicycle. These bicycles featured a very large front wheel (up to 60 inches in diameter) and a much smaller rear wheel. The large front wheel allowed for greater speed, as the distance traveled per pedal revolution was much greater. However, these bicycles were dangerous to ride due to their high center of gravity.

The safety bicycle was invented in 1885 by John Kemp Starley in England. This design featured two wheels of similar size, a chain drive to the rear wheel, and a diamond-shaped frame. This design is essentially the same as modern bicycles today. The safety bicycle was much more stable and easier to ride than the high-wheeler.

In 1888, John Boyd Dunlop invented the pneumatic tire, which revolutionized bicycle comfort and performance. These air-filled tires provided much better shock absorption and traction than solid rubber tires. This innovation made cycling much more pleasant and contributed to the bicycle boom of the 1890s.

The 1890s are often called the "Golden Age of Bicycles." During this decade, bicycle manufacturing became a major industry, and cycling became extremely popular among both men and women. The bicycle provided new freedom of movement, especially for women, and contributed to social changes including dress reform.
```

- [ ] Verificar que el contador muestra ~2718 caracteres y ~440 palabras
- [ ] Verificar que aparece "✓ Ready for analysis"

#### 4. Generación de Sesiones
- [ ] Click en "Generate Intelligent Sessions"
- [ ] Verificar loading state con spinner
- [ ] Verificar mensaje "Analyzing Content & Generating Sessions..."
- [ ] Esperar respuesta de la IA (15-30 segundos)

#### 5. Verificación de SessionsList
- [ ] Verificar navegación automática a SessionsList
- [ ] Verificar header con estadísticas:
  - Número de sesiones generadas
  - Total de afirmaciones
  - "3 Affirmations per Session"
- [ ] Verificar grid de session cards
- [ ] Cada session card debe tener:
  - Número de sesión
  - Tema descriptivo
  - 3 afirmaciones con preview
  - Tags de categoría, sujeto, timeframe
  - Botón "Practice This Session"

#### 6. Análisis de Sesiones Esperadas
Verificar que se generaron sesiones temáticas como:
- [ ] **Sesión Temporal**: Eventos cronológicos (1817, 1819, 1861, etc.)
- [ ] **Sesión de Innovaciones**: Avances técnicos (pedales, neumáticos, etc.)
- [ ] **Sesión de Personas**: Inventores (von Drais, Michaux, Dunlop, etc.)
- [ ] **Sesión Social**: Impacto cultural (Golden Age, mujeres, etc.)

#### 7. Selección de Sesión
- [ ] Click en cualquier session card
- [ ] Verificar navegación a ReviewInterface
- [ ] Verificar que se muestra:
  - Título: "Session X: [Theme]"
  - Subtítulo: "Review this themed session"
  - 3 afirmaciones de la sesión
  - Navegación entre afirmaciones
  - Botón "Practice Mode"

#### 8. Modo Práctica con Sesión
- [ ] Click en "Practice Mode"
- [ ] Verificar loading de anti-afirmaciones
- [ ] Verificar modo práctica funciona:
  - Muestra afirmación (correcta o incorrecta)
  - Botones "Correct" / "Incorrect"
  - Feedback inmediato
  - Progreso entre preguntas
  - Score final

#### 9. Navegación de Regreso
- [ ] Desde ReviewInterface, click "Back"
- [ ] Verificar regreso a SessionsList
- [ ] Desde SessionsList, click "Back"
- [ ] Verificar regreso a CreateSessions
- [ ] Desde CreateSessions, click "Back"
- [ ] Verificar regreso a Dashboard

### 🔍 CASOS EDGE A PROBAR

#### Contenido Insuficiente
- [ ] Ingresar menos de 500 caracteres
- [ ] Verificar mensaje de error
- [ ] Verificar que botón permanece deshabilitado

#### Error de API
- [ ] Desconectar internet temporalmente
- [ ] Intentar generar sesiones
- [ ] Verificar manejo de error con toast

#### Contenido de Programación
- [ ] Probar con código JavaScript/React
- [ ] Verificar que se detecta como "programming"
- [ ] Verificar afirmaciones con sintaxis de código

### ✅ CRITERIOS DE ÉXITO

#### Funcionalidad Core
- [ ] Genera múltiples sesiones (3-6 típicamente)
- [ ] Cada sesión tiene exactamente 3 afirmaciones
- [ ] Afirmaciones están temáticamente relacionadas
- [ ] Navegación completa funciona sin errores

#### Calidad de IA
- [ ] Afirmaciones son específicas al contenido
- [ ] Agrupación temática es coherente
- [ ] Incluye detalles específicos (fechas, nombres, etc.)
- [ ] No son afirmaciones genéricas

#### UX/UI
- [ ] Loading states apropiados
- [ ] Error handling funcional
- [ ] Navegación intuitiva
- [ ] Responsive design

#### Performance
- [ ] Generación completa en <30 segundos
- [ ] UI responsiva durante loading
- [ ] Sin memory leaks en navegación

### 🐛 PROBLEMAS CONOCIDOS A VERIFICAR

- [ ] Verificar que no hay errores de TypeScript en consola
- [ ] Verificar que no hay warnings de React en consola
- [ ] Verificar que la navegación mantiene estado correctamente
- [ ] Verificar que los datos de sesión se pasan correctamente entre componentes

### 📊 MÉTRICAS DE CALIDAD

#### Precisión de IA (>90%)
- [ ] Afirmaciones extraen información real del contenido
- [ ] Agrupación temática es lógica
- [ ] No hay afirmaciones duplicadas o contradictorias

#### Cobertura de Contenido (>80%)
- [ ] Conceptos principales están cubiertos
- [ ] Fechas y nombres importantes incluidos
- [ ] Diferentes aspectos del tema representados

#### Coherencia de Sesiones (>95%)
- [ ] Cada sesión tiene tema claro
- [ ] Afirmaciones dentro de sesión están relacionadas
- [ ] Progresión lógica entre afirmaciones
