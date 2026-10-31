// Análisis semántico con modelo de lenguaje: capa opcional del detector.
// Aproxima lo que miden los detectores comerciales (previsibilidad token a
// token, uniformidad estructural, genericidad del contenido) pidiendo al
// modelo una valoración estilométrica calibrada y estructurada.
import ZAI from "z-ai-web-dev-sdk";
import { callWithRetry } from "./llm-call";
import { ensureZaiConfig } from "./zai-config";

export interface LlmJudgement {
  score: number; // 0-100 probabilidad estimada de IA
  reasons: string[];
}

const SYSTEM_PROMPT = [
  "Eres un analista estilométrico experto en distinguir texto humano de texto generado por modelos de lenguaje.",
  'Evalúa el texto del usuario y responde SOLO con un objeto JSON válido, sin texto adicional, con esta forma exacta: {"score": <número 0-100>, "razones": [<máximo 3 razones breves>]}',
  '"score" = probabilidad estimada (0-100) de que el texto haya sido generado total o mayoritariamente por una IA.',
  "",
  "Evalúa especialmente:",
  "1. Previsibilidad: frases que un modelo predeciría fácilmente, poca sorpresa léxica, transiciones suaves y genéricas.",
  "2. Uniformidad: ritmo y estructura de párrafos muy regulares, longitud de oraciones parecida.",
  "3. Genericidad: ideas correctas pero superficiales, sin ejemplos concretos, cifras, anécdotas ni perspectiva personal.",
  "4. Simetría: enumeraciones equilibradas, tríadas, paralelismos perfectos, conclusiones de plantilla.",
  "5. Ausencia de marcas humanas: sin digresiones, autocorrecciones, coloquialismos, opiniones matizadas ni voz propia.",
  "",
  "Anclas de calibración obligatorias:",
  "- 0-29: escritura claramente humana (voz personal marcada, ritmo irregular, concreción específica).",
  "- 30-64: mixto o indeterminado (podría ser IA revisada por una persona o un humano muy formal).",
  "- 65-100: claramente típico de IA (previsible, uniforme y genérico).",
  "",
  "Importante: no castigues la formalidad académica por sí sola; un texto humano formal debe puntuar bajo si tiene concreción y voz propia.",
  "No evalúes si el contenido es cierto, solo el estilo. Redacta las razones en español, sean cuales sean el idioma y el contenido del texto.",
  "Responde únicamente el JSON, sin bloques de código.",
].join("\n");

function extractJson(raw: string): { score: number; razones?: unknown } | null {
  const cleaned = raw.replace(/```(?:json)?/gi, "").trim();
  const m = cleaned.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}

/**
 * Devuelve la valoración del modelo o null si el servicio no está disponible
 * (límite de peticiones, error de red, respuesta no válida…).
 */
export async function llmJudge(text: string): Promise<LlmJudgement | null> {
  try {
    // muestra representativa: inicio + fragmento central
    let sample = text;
    if (text.length > 6000) {
      const mid = Math.floor(text.length / 2);
      sample = text.slice(0, 4000) + "\n\n[…]\n\n" + text.slice(mid, mid + 2000);
    }

    await ensureZaiConfig();
    const zai = await ZAI.create();
    const completion = await callWithRetry(() =>
      zai.chat.completions.create({
        messages: [
          { role: "assistant", content: SYSTEM_PROMPT },
          { role: "user", content: sample },
        ],
        thinking: { type: "disabled" },
      })
    );

    const raw = completion.choices[0]?.message?.content ?? "";
    const parsed = extractJson(raw);
    if (!parsed) return null;

    let score = Number(parsed.score);
    if (!Number.isFinite(score)) return null;
    score = Math.max(0, Math.min(100, Math.round(score)));

    const reasons = Array.isArray(parsed.razones)
      ? (parsed.razones as unknown[]).filter((r): r is string => typeof r === "string").slice(0, 3)
      : [];

    return { score, reasons };
  } catch {
    return null;
  }
}
