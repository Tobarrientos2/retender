#!/usr/bin/env node

/**
 * Script de Testing para Validar Consistencia de Paráfrasis Incorrectas
 * 
 * Este script prueba el sistema mejorado de generación de anti-afirmaciones
 * para asegurar que siempre genere paráfrasis incorrectas consistentes.
 */

const { ConvexHttpClient } = require("convex/browser");

// Configuración
const CONVEX_URL = process.env.CONVEX_URL || "https://your-convex-deployment.convex.cloud";
const TEST_ITERATIONS = 5; // Número de pruebas por afirmación
const SIMILARITY_THRESHOLD = 75; // % máximo de similitud permitida

// Cliente Convex
const client = new ConvexHttpClient(CONVEX_URL);

// Afirmaciones de prueba (técnicas)
const TEST_AFFIRMATIONS = [
  {
    content: "Los subprocesos permiten la ejecución concurrente de múltiples tareas en un programa",
    order: 1
  },
  {
    content: "El algoritmo de ordenamiento quicksort utiliza la técnica divide y vencerás",
    order: 2
  },
  {
    content: "La gestión de memoria automática previene fugas de memoria en aplicaciones",
    order: 3
  },
  {
    content: "Los frameworks proporcionan una estructura base para el desarrollo de aplicaciones",
    order: 4
  },
  {
    content: "La autenticación JWT permite verificar la identidad del usuario de forma segura",
    order: 5
  }
];

/**
 * Calcula similitud semántica simple basada en palabras clave compartidas
 */
function calculateSimilarity(original, paraphrase) {
  const originalWords = original.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const paraphraseWords = paraphrase.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  
  const sharedWords = originalWords.filter(word => paraphraseWords.includes(word));
  const similarity = (sharedWords.length / originalWords.length) * 100;
  
  return Math.round(similarity);
}

/**
 * Verifica si una paráfrasis contiene términos técnicos imprecisos
 */
function hasImpreciseTerms(paraphrase) {
  const impreciseTerms = [
    'mini tareas', 'tareas pequeñas', 'procesos chicos',
    'fórmula', 'receta', 'método simple',
    'programa base', 'herramienta general', 'plantilla',
    'organizar datos', 'manejar información',
    'verificar usuario', 'comprobar identidad',
    'hacer mejor', 'mejorar rendimiento',
    'poner en práctica', 'hacer funcionar',
    'hacer varias cosas', 'multitarea',
    'guardar datos', 'proteger información',
    'conector', 'enlace', 'puente',
    'arreglar errores', 'encontrar problemas'
  ];
  
  const lowerParaphrase = paraphrase.toLowerCase();
  return impreciseTerms.some(term => lowerParaphrase.includes(term));
}

/**
 * Ejecuta una prueba individual
 */
async function runSingleTest(affirmation, testNumber) {
  console.log(`\n🧪 Test ${testNumber} - "${affirmation.content.substring(0, 50)}..."`);
  
  try {
    const result = await client.action("affirmations:generateAntiAffirmations", {
      originalAffirmations: [affirmation]
    });
    
    if (!result || result.length !== 3) {
      console.log(`❌ Error: Expected 3 paraphrases, got ${result?.length || 0}`);
      return { success: false, error: "Invalid response length" };
    }
    
    const results = [];
    
    for (let i = 0; i < result.length; i++) {
      const antiAff = result[i];
      const similarity = calculateSimilarity(affirmation.content, antiAff.content);
      const hasImprecise = hasImpreciseTerms(antiAff.content);
      
      const isValid = similarity < SIMILARITY_THRESHOLD && hasImprecise;
      
      results.push({
        order: antiAff.order,
        content: antiAff.content,
        similarity: similarity,
        hasImpreciseTerms: hasImprecise,
        isValid: isValid
      });
      
      console.log(`  ${isValid ? '✅' : '❌'} Paráfrasis ${i + 1}:`);
      console.log(`     Similitud: ${similarity}% (target: <${SIMILARITY_THRESHOLD}%)`);
      console.log(`     Términos imprecisos: ${hasImprecise ? 'Sí' : 'No'}`);
      console.log(`     Contenido: "${antiAff.content}"`);
    }
    
    const validCount = results.filter(r => r.isValid).length;
    const successRate = (validCount / 3) * 100;
    
    console.log(`📊 Resultado: ${validCount}/3 paráfrasis válidas (${successRate}%)`);
    
    return {
      success: successRate === 100,
      successRate: successRate,
      results: results
    };
    
  } catch (error) {
    console.log(`❌ Error en prueba: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Ejecuta todas las pruebas
 */
async function runAllTests() {
  console.log("🚀 Iniciando pruebas de consistencia de paráfrasis incorrectas");
  console.log(`📋 Configuración: ${TEST_ITERATIONS} iteraciones por afirmación`);
  console.log(`🎯 Objetivo: 100% paráfrasis incorrectas (similitud <${SIMILARITY_THRESHOLD}%)`);
  
  const allResults = [];
  let totalTests = 0;
  let successfulTests = 0;
  
  for (const affirmation of TEST_AFFIRMATIONS) {
    console.log(`\n📝 Probando afirmación: "${affirmation.content}"`);
    
    for (let i = 1; i <= TEST_ITERATIONS; i++) {
      const result = await runSingleTest(affirmation, i);
      allResults.push(result);
      totalTests++;
      
      if (result.success) {
        successfulTests++;
      }
      
      // Pausa entre pruebas para no sobrecargar la API
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Resumen final
  console.log("\n" + "=".repeat(60));
  console.log("📊 RESUMEN FINAL");
  console.log("=".repeat(60));
  
  const overallSuccessRate = (successfulTests / totalTests) * 100;
  console.log(`✅ Pruebas exitosas: ${successfulTests}/${totalTests} (${overallSuccessRate.toFixed(1)}%)`);
  
  if (overallSuccessRate >= 95) {
    console.log("🎉 ¡ÉXITO! El sistema genera paráfrasis incorrectas consistentemente");
  } else if (overallSuccessRate >= 80) {
    console.log("⚠️  PARCIAL: El sistema necesita ajustes menores");
  } else {
    console.log("❌ FALLO: El sistema requiere mejoras significativas");
  }
  
  // Estadísticas detalladas
  const avgSimilarities = allResults
    .filter(r => r.results)
    .flatMap(r => r.results)
    .map(r => r.similarity);
  
  if (avgSimilarities.length > 0) {
    const avgSimilarity = avgSimilarities.reduce((a, b) => a + b, 0) / avgSimilarities.length;
    console.log(`📈 Similitud promedio: ${avgSimilarity.toFixed(1)}% (objetivo: <${SIMILARITY_THRESHOLD}%)`);
  }
  
  const impreciseTermsCount = allResults
    .filter(r => r.results)
    .flatMap(r => r.results)
    .filter(r => r.hasImpreciseTerms).length;
  
  const totalParaphrases = allResults
    .filter(r => r.results)
    .flatMap(r => r.results).length;
  
  if (totalParaphrases > 0) {
    const impreciseRate = (impreciseTermsCount / totalParaphrases) * 100;
    console.log(`🔤 Paráfrasis con términos imprecisos: ${impreciseTermsCount}/${totalParaphrases} (${impreciseRate.toFixed(1)}%)`);
  }
  
  console.log("\n🏁 Pruebas completadas");
  
  return overallSuccessRate >= 95;
}

// Ejecutar pruebas si se llama directamente
if (require.main === module) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error("💥 Error fatal:", error);
      process.exit(1);
    });
}

module.exports = { runAllTests, calculateSimilarity, hasImpreciseTerms };
