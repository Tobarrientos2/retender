#!/usr/bin/env node

/**
 * Quick Test para Paráfrasis Incorrectas
 * Script simple para testing rápido durante desarrollo
 */

console.log("🧪 Quick Test - Paráfrasis Incorrectas");
console.log("=====================================");

// Test de afirmación simple
const testAffirmation = {
  content: "Los subprocesos permiten la ejecución concurrente de múltiples tareas",
  order: 1
};

console.log(`📝 Afirmación original: "${testAffirmation.content}"`);
console.log("\n⏳ Para probar manualmente:");
console.log("1. Ejecuta: npm run dev");
console.log("2. Crea un set de afirmaciones con contenido técnico");
console.log("3. Usa 'Paraphrase Mode' y verifica que:");
console.log("   ✅ Todas las paráfrasis usen vocabulario impreciso");
console.log("   ✅ No aparezcan paráfrasis correctas");
console.log("   ✅ Los términos técnicos sean reemplazados");

console.log("\n🎯 Ejemplos de transformaciones esperadas:");
console.log("   'subprocesos' → 'mini tareas' o 'tareas pequeñas'");
console.log("   'algoritmo' → 'fórmula' o 'receta'");
console.log("   'framework' → 'programa base' o 'herramienta'");
console.log("   'gestión de memoria' → 'organizar datos'");

console.log("\n🔍 Validación manual:");
console.log("   - Similitud con original debe ser < 75%");
console.log("   - Debe contener 2-3 términos imprecisos");
console.log("   - Debe mantener contexto general");
console.log("   - Debe sonar como error de estudiante");

console.log("\n✅ Test completado - Procede con testing manual");
