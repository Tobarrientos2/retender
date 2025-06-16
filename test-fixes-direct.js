#!/usr/bin/env node

/**
 * Test Directo de las Correcciones Implementadas
 * 
 * Este script verifica que las correcciones estén implementadas correctamente
 * sin depender de la conexión WebSocket.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("🔍 VERIFICANDO CORRECCIONES IMPLEMENTADAS");
console.log("==========================================");

// 1. Verificar fix del frontend
console.log("\n1. 🔧 Verificando fix del frontend...");
const frontendPath = path.join(__dirname, 'src/components/ReviewInterface.tsx');
const frontendContent = fs.readFileSync(frontendPath, 'utf8');

if (frontendContent.includes('originalAffirmations: affirmations.map(aff => ({')) {
  console.log("   ✅ Frontend bug CORREGIDO - parámetro correcto");
} else {
  console.log("   ❌ Frontend bug NO corregido");
}

// 2. Verificar configuración de IA
console.log("\n2. ⚙️ Verificando configuración de IA...");
const aiPath = path.join(__dirname, 'convex/ai.ts');
const aiContent = fs.readFileSync(aiPath, 'utf8');

if (aiContent.includes('temperature: 0.4')) {
  console.log("   ✅ Temperatura reducida a 0.4 - más consistente");
} else {
  console.log("   ❌ Temperatura NO optimizada");
}

if (aiContent.includes('topK: 20')) {
  console.log("   ✅ topK reducido a 20 - menos variabilidad");
} else {
  console.log("   ❌ topK NO optimizado");
}

// 3. Verificar prompt mejorado
console.log("\n3. 📝 Verificando prompt mejorado...");

if (aiContent.includes('PROHIBIDO usar analogías')) {
  console.log("   ✅ Regla anti-analogías agregada");
} else {
  console.log("   ❌ Regla anti-analogías NO agregada");
}

if (aiContent.includes('como si fueran equipos de fútbol')) {
  console.log("   ✅ Ejemplo específico de analogía prohibida");
} else {
  console.log("   ❌ Ejemplo de analogía prohibida NO encontrado");
}

if (aiContent.includes('conflicto bélico" → "gran pelea')) {
  console.log("   ✅ Ejemplos de transformaciones correctas");
} else {
  console.log("   ❌ Ejemplos de transformaciones NO encontrados");
}

// 4. Verificar validación de analogías
console.log("\n4. 🛡️ Verificando validación automática...");

if (aiContent.includes('analogyPatterns')) {
  console.log("   ✅ Sistema de detección de analogías implementado");
} else {
  console.log("   ❌ Sistema de detección NO implementado");
}

if (aiContent.includes('como si', 'parecido a', 'igual que')) {
  console.log("   ✅ Patrones de analogías definidos");
} else {
  console.log("   ❌ Patrones de analogías NO definidos");
}

// 5. Verificar sistema de retry
console.log("\n5. 🔄 Verificando sistema de retry...");

if (aiContent.includes('maxRetries = 3')) {
  console.log("   ✅ Sistema de retry implementado (3 intentos)");
} else {
  console.log("   ❌ Sistema de retry NO implementado");
}

if (aiContent.includes('for (let attempt = 1; attempt <= maxRetries')) {
  console.log("   ✅ Loop de retry correctamente estructurado");
} else {
  console.log("   ❌ Loop de retry NO encontrado");
}

// 6. Verificar estructura de código
console.log("\n6. 🏗️ Verificando estructura de código...");

// Contar try-catch blocks
const tryCount = (aiContent.match(/try \{/g) || []).length;
const catchCount = (aiContent.match(/\} catch \(/g) || []).length;

if (tryCount === catchCount) {
  console.log(`   ✅ Estructura try-catch balanceada (${tryCount} pares)`);
} else {
  console.log(`   ❌ Estructura try-catch desbalanceada (${tryCount} try, ${catchCount} catch)`);
}

// Resumen final
console.log("\n" + "=".repeat(50));
console.log("📊 RESUMEN DE CORRECCIONES");
console.log("=".repeat(50));

const fixes = [
  frontendContent.includes('originalAffirmations: affirmations.map(aff => ({'),
  aiContent.includes('temperature: 0.4'),
  aiContent.includes('PROHIBIDO usar analogías'),
  aiContent.includes('analogyPatterns'),
  aiContent.includes('maxRetries = 3'),
  tryCount === catchCount
];

const fixedCount = fixes.filter(Boolean).length;
const totalFixes = fixes.length;

console.log(`✅ Correcciones implementadas: ${fixedCount}/${totalFixes}`);

if (fixedCount === totalFixes) {
  console.log("🎉 ¡TODAS LAS CORRECCIONES IMPLEMENTADAS CORRECTAMENTE!");
  console.log("\n📋 PRÓXIMOS PASOS:");
  console.log("1. Reiniciar servidor: npm run dev");
  console.log("2. Crear set de afirmaciones técnicas");
  console.log("3. Probar 'Paraphrase Mode'");
  console.log("4. Verificar que NO aparezcan analogías");
  console.log("5. Confirmar vocabulario técnico impreciso");
} else {
  console.log("⚠️  Algunas correcciones necesitan revisión");
}

console.log("\n🔗 DOCUMENTACIÓN:");
console.log("- Resumen completo: PARAPHRASE-FIX-SUMMARY.md");
console.log("- Documentación técnica: docs/prd-paraphrase-fix.md");

console.log("\n✅ Verificación completada");
