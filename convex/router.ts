import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

/**
 * HTTP endpoint para sincronización de jobs de transcripción desde la API Python
 * POST /updateTranscriptionJob
 */
http.route({
  path: "/updateTranscriptionJob",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      // Parsear payload JSON
      const payload = await request.json();
      const { jobId, status, progress, result, error, timestamps } = payload;

      // Validar campos requeridos
      if (!jobId || !status) {
        return new Response(
          JSON.stringify({ error: "jobId and status are required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Llamar función interna para actualizar el job
      await ctx.runMutation(internal.transcriptionJobs.updateTranscriptionJobFromAPI, {
        jobId,
        status,
        progress: progress || 0,
        message: getStatusMessage(status),
        result: result || null,
        error: error || null,
        startedAt: timestamps?.startedAt || null,
        completedAt: timestamps?.completedAt || null,
      });

      console.log(`✅ Job ${jobId} sincronizado con estado: ${status}`);

      return new Response(
        JSON.stringify({ success: true, jobId, status }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );

    } catch (error) {
      console.error("❌ Error sincronizando job:", error);

      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * Helper para generar mensajes de estado
 */
function getStatusMessage(status: string): string {
  switch (status) {
    case "pending":
      return "Job en cola, esperando procesamiento...";
    case "processing":
      return "Procesando transcripción...";
    case "completed":
      return "Transcripción completada exitosamente";
    case "failed":
      return "Error en la transcripción";
    case "cancelled":
      return "Job cancelado";
    default:
      return `Estado: ${status}`;
  }
}

export default http;
