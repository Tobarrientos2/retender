#!/usr/bin/env node

/**
 * Debug Script para Verificar Respuesta de Anti-Affirmations
 * 
 * Este script ayuda a debuggear qué está devolviendo exactamente
 * la función generateAntiAffirmations.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("🔍 DEBUGGING ANTI-AFFIRMATIONS RESPONSE");
console.log("=======================================");

// Verificar que la función esté exportada correctamente
console.log("\n1. 📁 Verificando estructura de archivos...");

const aiPath = path.join(__dirname, 'convex/ai.ts');
const affirmationsPath = path.join(__dirname, 'convex/affirmations.ts');

if (fs.existsSync(aiPath)) {
  console.log("   ✅ convex/ai.ts existe");
} else {
  console.log("   ❌ convex/ai.ts NO encontrado");
}

if (fs.existsSync(affirmationsPath)) {
  console.log("   ✅ convex/affirmations.ts existe");
} else {
  console.log("   ❌ convex/affirmations.ts NO encontrado");
}

// Verificar la estructura de la respuesta esperada
console.log("\n2. 📋 Verificando estructura de respuesta esperada...");

const aiContent = fs.readFileSync(aiPath, 'utf8');

// Buscar el formato de respuesta JSON
const jsonFormatMatch = aiContent.match(/\[[\s\S]*?"content"[\s\S]*?"order"[\s\S]*?"errorType"[\s\S]*?\]/);

if (jsonFormatMatch) {
  console.log("   ✅ Formato JSON definido en el prompt");
} else {
  console.log("   ❌ Formato JSON NO encontrado en el prompt");
}

// Verificar que la validación esté correcta
if (aiContent.includes('Array.isArray(antiAffirmations)')) {
  console.log("   ✅ Validación de array implementada");
} else {
  console.log("   ❌ Validación de array NO encontrada");
}

if (aiContent.includes('antiAffirmations.length !== 3')) {
  console.log("   ✅ Validación de longitud (3 elementos) implementada");
} else {
  console.log("   ❌ Validación de longitud NO encontrada");
}

// Verificar la estructura de validación de campos
const requiredFields = ['content', 'order', 'errorType'];
let fieldsValidated = 0;

requiredFields.forEach(field => {
  if (aiContent.includes(`!antiAff.${field}`)) {
    console.log(`   ✅ Validación de campo '${field}' implementada`);
    fieldsValidated++;
  } else {
    console.log(`   ❌ Validación de campo '${field}' NO encontrada`);
  }
});

console.log(`   📊 Campos validados: ${fieldsValidated}/${requiredFields.length}`);

// Verificar el action en affirmations.ts
console.log("\n3. 🔗 Verificando action en affirmations.ts...");

const affirmationsContent = fs.readFileSync(affirmationsPath, 'utf8');

if (affirmationsContent.includes('generateAntiAffirmations')) {
  console.log("   ✅ Action generateAntiAffirmations encontrada");
} else {
  console.log("   ❌ Action generateAntiAffirmations NO encontrada");
}

if (affirmationsContent.includes('ai:generateAntiAffirmations')) {
  console.log("   ✅ Llamada a ai:generateAntiAffirmations encontrada");
} else {
  console.log("   ❌ Llamada a ai:generateAntiAffirmations NO encontrada");
}

// Verificar el tipo de respuesta esperado
console.log("\n4. 📤 Verificando tipo de respuesta...");

// Buscar el tipo de retorno
if (aiContent.includes('return antiAffirmations')) {
  console.log("   ✅ Función retorna antiAffirmations");
} else {
  console.log("   ❌ Función NO retorna antiAffirmations");
}

// Verificar que no haya problemas de async/await
if (affirmationsContent.includes('await ctx.runAction')) {
  console.log("   ✅ Action usa await correctamente");
} else {
  console.log("   ❌ Action NO usa await");
}

console.log("\n" + "=".repeat(50));
console.log("📊 RESUMEN DE DEBUGGING");
console.log("=".repeat(50));

console.log("\n🔧 POSIBLES CAUSAS DEL PROBLEMA:");
console.log("1. ❓ Timeout de la API de Gemini (>30 segundos)");
console.log("2. ❓ Error en el parsing del JSON de respuesta");
console.log("3. ❓ Validación demasiado estricta rechazando respuestas válidas");
console.log("4. ❓ Problema de conexión WebSocket intermitente");

console.log("\n🛠️ SOLUCIONES RECOMENDADAS:");
console.log("1. 🔄 Refrescar la página y probar de nuevo");
console.log("2. 📱 Abrir DevTools y revisar console.log detallado");
console.log("3. 🌐 Verificar conexión a internet estable");
console.log("4. ⏱️ Esperar más tiempo (la IA puede tardar hasta 30s)");

console.log("\n📋 PRÓXIMOS PASOS DE DEBUGGING:");
console.log("1. Abrir http://localhost:5174/");
console.log("2. Abrir DevTools (F12)");
console.log("3. Ir a Console tab");
console.log("4. Crear set de afirmaciones");
console.log("5. Hacer click en 'Paraphrase Mode'");
console.log("6. Revisar logs detallados que agregamos");

console.log("\n✅ Debugging completado - Revisar logs en browser");
