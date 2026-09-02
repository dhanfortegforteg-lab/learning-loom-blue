/**
 * Motor de geração do Foxstudy.
 * Antes usava IA; agora usa um algoritmo determinístico alimentado por
 * conteúdo real (Wikipédia pt) — sem consumo de créditos.
 * A assinatura foi mantida para não quebrar os chamadores.
 */
import { generate } from "./generator.server";

export async function callAI(messages: any[], schema?: any): Promise<any> {
  return generate(messages, schema);
}
