import ZAI from "z-ai-web-dev-sdk";
import { ensureZaiConfig } from "./zai-config";
import {
  CLICHES_BY_LANG,
  STRUCT_REGEX_BY_LANG,
  STRUCT_TAIL_BY_LANG,
  LANG_NAMES,
  detectLanguage,
} from "./ai-patterns";
import { detectAI } from "./detector";
import { callWithRetry, sleep, withTimeout } from "./llm-call";
import type { HumanizeOptions, HumanizeResponse, Lang, Tone } from "./shared-types";

// ---------- utilidades ----------

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function makeRng(seed: number): () => number {
  let s = seed || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchCase(original: string, replacement: string): string {
  if (!replacement) return replacement;
  if (original[0] === original[0]?.toUpperCase() && original[0] !== original[0]?.toLowerCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

// ---------- pase de reglas (siempre disponible) ----------

export function applyRulePass(text: string, keepChance = 0.15, forcedLang?: Lang): { text: string; changes: number } {
  let out = text;
  let changes = 0;
  const rng = makeRng(hashSeed(text.slice(0, 400)));
  // lista de muletillas y estructura paralela según el idioma del texto
  // (el forzado por el selector manual tiene prioridad sobre la detección)
  const lang = forcedLang ?? detectLanguage(text);
  const cliches = CLICHES_BY_LANG[lang];
  const structRegex = STRUCT_REGEX_BY_LANG[lang];

  // 1. Reemplazo de muletillas de IA por alternativas humanas
  for (const rule of cliches) {
    if (!rule.replacements || rule.replacements.length === 0) continue;
    const valid = rule.replacements.filter((r) => r.toLowerCase() !== rule.phrase.toLowerCase());
    if (valid.length === 0) continue;
    const re = new RegExp(`\\b${escapeRegex(rule.phrase)}\\b`, "gi");
    out = out.replace(re, (match, offset: number) => {
      // se conserva una pequeña parte para que no quede mecánico
      if (rng() > 1 - keepChance) return match;
      const prev = out.slice(Math.max(0, offset - 2), offset);
      const atSentenceStart = offset === 0 || /[.!?…\n]\s*$/.test(prev);
      const pick = valid[Math.floor(rng() * valid.length)];
      changes++;
      return matchCase(match, atSentenceStart ? pick : pick.charAt(0).toLowerCase() + pick.slice(1));
    });
  }

  // 2. estructura paralela tipo "no solo X sino también Y" (en su idioma) -> "X, y también Y"
  out = out.replace(structRegex, (_m, inner: string) => {
    changes++;
    const core = inner.trim().replace(/^[,;:]\s*/, "").replace(/[,;]\s*$/, "");
    return `${core}${STRUCT_TAIL_BY_LANG[lang]}`;
  });

  // 3. Rayas (—) y semirayas: convertir a comas o dos puntos
  out = out.replace(/\s*[—–]\s*/g, (m, offset: number) => {
    if (rng() > 0.85) return m;
    changes++;
    const prev = out.slice(Math.max(0, offset - 60), offset);
    return /:\s*$/.test(prev) ? " " : ", ";
  });

  // 4. Punto y coma: convertir una de cada dos en punto seguido
  let semiIndex = 0;
  out = out.replace(/;\s+/g, (m, offset: number) => {
    semiIndex++;
    if (semiIndex % 2 !== 0) return m;
    const target = out.slice(offset, offset + 2);
    if (target && target[0] === target[0].toLowerCase()) {
      changes++;
      return ". " + target[0].toUpperCase() + target.slice(1);
    }
    return m;
  });

  // 5. Doble espacio y limpieza ligera
  out = out.replace(/[ \t]{2,}/g, " ").replace(/,\s*,/g, ",").replace(/\s+([,.;:])/g, "$1");

  return { text: out.trim(), changes };
}

/** Pase de ritmo: rompe frases largas en párrafos monótonos para variar la longitud */
const SPLIT_CONJ_BY_LANG: Record<Lang, string[]> = {
  es: ["y ", "pero ", "aunque ", "porque ", "ya que ", "mientras que ", "si bien "],
  en: ["and ", "but ", "although ", "because ", "since ", "while "],
  fr: ["et ", "mais ", "bien que ", "parce que ", "puisque ", "alors que "],
  it: ["e ", "ma ", "perché ", "poiché ", "mentre ", "sebbene "],
  pt: ["e ", "mas ", "embora ", "porque ", "já que ", "enquanto "],
  de: ["und ", "aber ", "obwohl ", "weil ", "da ", "während "],
};

function splitConnectorsRe(lang: Lang): RegExp {
  return new RegExp(`,\\s+(${SPLIT_CONJ_BY_LANG[lang].map(escapeRegex).join("|")})`, "i");
}

export function balanceRhythm(text: string, forcedLang?: Lang): { text: string; changes: number } {
  const lang = forcedLang ?? detectLanguage(text);
  const conjRe = splitConnectorsRe(lang);
  const stripConjRe = new RegExp(`^(${SPLIT_CONJ_BY_LANG[lang].map((c) => escapeRegex(c.trim())).join("|")})\\s+`, "i");
  const paras = text.replace(/\r\n?/g, "\n").split(/\n{2,}/);
  let changes = 0;
  const outParas = paras.map((para) => {
    const sents = para.split(/(?<=[.!?…])\s+/u).map((s) => s.trim()).filter(Boolean);
    if (sents.length < 2) return para;
    const wc = sents.map((s) => s.split(/\s+/).length);
    const m = wc.reduce((a, b) => a + b, 0) / wc.length;
    const sd = Math.sqrt(wc.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, wc.length - 1));
    const cv = m > 0 ? sd / m : 0;
    if (cv >= 0.32) return para; // ya tiene ritmo variado
    // dividir como máximo 2 frases largas de este párrafo
    let splits = 0;
    const newSents: string[] = [];
    for (const s of sents) {
      const nWords = s.split(/\s+/).length;
      if (splits < 2 && nWords > 24) {
        const mid = Math.floor(s.length / 2);
        let best = -1;
        const re = new RegExp(conjRe.source, "gi");
        let match: RegExpExecArray | null;
        while ((match = re.exec(s)) !== null) {
          if (Math.abs(match.index - mid) < Math.abs((best === -1 ? mid + 9999 : best) - mid)) {
            best = match.index;
          }
        }
        if (best > 10) {
          const first = s.slice(0, best).trim() + ".";
          let second = s.slice(s.indexOf(",", best) + 1).trim();
          // quitar el conector del inicio de la segunda frase
          second = second.replace(stripConjRe, "");
          if (second.length > 12) {
            second = second.charAt(0).toUpperCase() + second.slice(1);
            const last = second.charAt(second.length - 1);
            if (!".!?…".includes(last)) second += ".";
            newSents.push(first, second);
            splits++;
            continue;
          }
        }
      }
      newSents.push(s);
    }
    changes += splits;
    return newSents.join(" ");
  });
  return { text: outParas.join("\n\n"), changes };
}

// ---------- reescritura con LLM ----------

const TONE_PROMPTS: Record<Tone, string> = {
  neutral: "Tono neutro y natural, como alguien explicando con claridad.",
  profesional: "Tono profesional pero vivo, como un documento bien escrito por un experto que domina el tema.",
  academico: "Tono académico claro y sobrio, con precisión terminológica, pero sin la rigidez mecánica de una máquina.",
  cercano: "Tono cercano y conversacional, con algún giro coloquial natural, sin llegar a estilo de chat informal.",
  divulgativo: "Tono divulgativo periodístico: explica conceptos con ejemplos cotidianos, frases ágiles y cero jerga innecesaria, como un buen artículo de revista.",
  marketing: "Tono comercial persuasivo y con energía: benefícios claros, frases directas, llamadas a la acción suaves, sin exageraciones vacías ni superlativos de anuncio.",
  tecnico: "Tono técnico y preciso, orientado a datos y procesos, con terminología correcta pero explicaciones accesibles y sin relleno.",
  juridico: "Tono jurídico-formal sobrio: precisión terminológica, frases completas sin ambigüedad, impersonal, sin expresiones coloquiales.",
};

const INTENSITY_PROMPTS: Record<string, string> = {
  light: "Cambia solo lo necesario: suaviza las frases hechas, ajusta el ritmo de las oraciones y elimina la sensación de plantilla. Conserva cerca del 90% del léxico original.",
  medium: "Reescribe cada oración con otras palabras y otras estructuras, conservando el sentido y el orden general de las ideas.",
  deep: "Reescribe con libertad manteniendo intactas las ideas, los datos y las conclusiones: puedes reordenar frases dentro del párrafo, fusionar o dividir oraciones y cambiar el enfoque de cada párrafo. Objetivo: que parezca escrito de un tirón por una persona con criterio propio.",
};

function buildSystemPrompt(opts: HumanizeOptions, lang: Lang): string {
  return [
    "Eres un editor humano experto en reescritura natural de textos.",
    "Tu trabajo: reescribir el texto del usuario para que parezca escrito por una persona real, sin perder el significado.",
    "",
    "Reglas obligatorias:",
    `- Conserva siempre el idioma del fragmento original, que está en ${LANG_NAMES[lang]}. Escribe tu respuesta en ${LANG_NAMES[lang]}. Nunca traduzcas ni mezcles idiomas.`,
    "- Conserva exactamente los datos, nombres propios, cifras, fechas y hechos. No inventes información nueva.",
    "- Conserva aproximadamente la longitud del original (±15%). No resumas ni recortes ideas.",
    "- MUY IMPORTANTE: varía la longitud de las oraciones. En cada párrafo incluye al menos una frase muy corta de 3 a 6 palabras (por ejemplo: «Es más de lo que parece.») y al menos una frase de más de 20 palabras. Nunca escribas tres frases seguidas de longitud parecida.",
    "- Elimina conectores de plantilla: «en conclusión», «es importante destacar que», «cabe señalar que», «asimismo», «no obstante» al inicio de frase, «en el mundo actual», «juega un papel crucial» y similares.",
    "- Evita las rayas (—). Reduce los punto y coma. Prefiere puntos y comas simples.",
    "- Evita estructuras paralelas perfectas, enumeraciones simétricas y tríadas («X, Y y Z») encadenadas.",
    "- Usa voz activa y verbos concretos.",
    "- Mantén los párrafos del original, separados por una línea en blanco. No uses listas salvo que el original las tenga.",
    "- No añadas comentarios, explicaciones, títulos nuevos, ni markdown. Devuelve SOLO el texto reescrito.",
    "",
    `Intensidad: ${INTENSITY_PROMPTS[opts.intensity]}`,
    `Registro: ${TONE_PROMPTS[opts.tone]}`,
  ].join("\n");
}

function chunkText(text: string, maxLen = 2400): string[] {
  const paras = text.split(/\n{2,}/);
  const chunks: string[] = [];
  let cur = "";
  for (const p of paras) {
    if ((cur + "\n\n" + p).length > maxLen && cur) {
      chunks.push(cur.trim());
      cur = p;
    } else {
      cur = cur ? cur + "\n\n" + p : p;
    }
    // Párrafo individual demasiado largo: cortar por frases
    while (cur.length > maxLen * 1.6) {
      const sents = cur.split(/(?<=[.!?…])\s+/u);
      let part = "";
      let i = 0;
      while (i < sents.length && (part + " " + sents[i]).length < maxLen) {
        part += (part ? " " : "") + sents[i];
        i++;
      }
      chunks.push(part.trim());
      cur = sents.slice(i).join(" ");
      if (i === 0) break; // seguridad
    }
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks.filter(Boolean);
}

function cleanLLMOutput(s: string): string {
  return s
    .trim()
    .replace(/^["«”'](.*)["»“']$/s, "$1")
    .replace(/\*\*/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function rewriteChunk(
  zai: Awaited<ReturnType<typeof ZAI.create>>,
  chunk: string,
  opts: HumanizeOptions,
  deadline: number,
  lang: Lang
): Promise<string> {
  const chunkWords = (chunk.match(/[\p{L}\p{N}]+/gu) || []).length;
  const target = Math.max(30, Math.round(chunkWords * 0.95));
  const call = async (strength: "normal" | "firm") => {
    const ask =
      strength === "firm"
        ? `Reescribe este fragmento de texto en ${LANG_NAMES[lang]}. REQUISITO OBLIGATORIO: tu respuesta debe tener al menos ${target} palabras (el original tiene ${chunkWords}). Conserva TODAS las ideas, ejemplos y matices del original; no resumas ni recortes nada.\n\n`
        : `Reescribe este fragmento de texto en ${LANG_NAMES[lang]} (conserva todas sus ideas; tu respuesta debe tener aproximadamente ${target} palabras):\n\n`;
    const completion = await callWithRetry(
      () =>
        zai.chat.completions.create({
          messages: [
            { role: "assistant", content: buildSystemPrompt(opts, lang) },
            { role: "user", content: ask + chunk },
          ],
          thinking: { type: "disabled" },
        }),
      2,
      deadline
    );
    const out = completion.choices[0]?.message?.content;
    if (!out || out.trim().length < Math.max(30, chunk.length * 0.35)) {
      throw new Error("Respuesta del modelo insuficiente");
    }
    return cleanLLMOutput(out);
  };

  const first = await call("normal");
  // Guardia anti-resumen: el resultado debe conservar al menos el 80% de la longitud
  if (first.length >= chunk.length * 0.8) return first;
  // El segundo intento (más estricto) solo si queda holgura suficiente;
  // si no, se devuelve el primero antes que arriesgar el plazo total.
  if (Date.now() > deadline - 12_000) return first;
  const retry = await call("firm");
  return retry.length > first.length ? retry : first;
}

// ---------- orquestador ----------

export async function humanizeText(
  input: string,
  opts: HumanizeOptions,
  signal?: AbortSignal,
  onProgress?: (done: number, total: number) => void
): Promise<HumanizeResponse> {
  const warnings: string[] = [];
  let mode: HumanizeResponse["mode"] = "rules";
  let changes = 0;

  // Idioma del texto: el forzado por el selector manual tiene prioridad;
  // si no, se detecta una vez y se usa en reglas y en el modelo
  const forced = opts.lang !== "auto" ? opts.lang : undefined;
  const lang = forced ?? detectLanguage(input);

  // Pase de reglas siempre (quita muletillas aunque falle el LLM)
  const ruleResult = applyRulePass(input, 0.15, forced);
  let working = ruleResult.text;
  changes += ruleResult.changes;

  if (opts.useLLM) {
    const MAX_CHARS = 72000;
    if (input.length > MAX_CHARS) {
      warnings.push(`El texto supera ${MAX_CHARS} caracteres; se ha reescrito con IA la primera parte y el resto solo con reglas.`);
    }
    const chunks = chunkText(working).filter((c) => c.length > 40);
    const limited = chunks.slice(0, 30);
    if (chunks.length > 30) warnings.push("Texto muy extenso: se ha procesado la primera parte con IA.");

    try {
      await ensureZaiConfig();
      const zai = await withTimeout(ZAI.create(), 10_000, "La conexión con el modelo");
      const results: string[] = new Array(limited.length);
      let ok = 0;
      let fallback = 0;

      // Plazo máximo total. El trabajo se ejecuta en segundo plano (patrón
      // job + sondeo), así que no hay proxy que supere: podemos permitirnos
      // mucho más tiempo que en modo síncrono y reescribir más fragmentos
      // aunque el servicio esté lento o limitado (429).
      const deadline = Date.now() + 150_000;
      const CONCURRENCY = 3;
      let next = 0;
      let done = 0;
      onProgress?.(0, limited.length);

      const worker = async (workerIndex: number): Promise<void> => {
        // arranque escalonado para no golpear el servicio con ráfagas simultáneas
        await sleep(workerIndex * 700);
        while (true) {
          const i = next++;
          if (i >= limited.length) return;
          if (signal?.aborted || Date.now() > deadline - 10_000) {
            results[i] = limited[i];
            fallback++;
            continue;
          }
          try {
            results[i] = await rewriteChunk(zai, limited[i], opts, deadline, lang);
            ok++;
          } catch {
            // si falla un fragmento, conservamos el de reglas
            results[i] = limited[i];
            fallback++;
          } finally {
            done++;
            onProgress?.(done, limited.length);
          }
        }
      };

      await Promise.all(
        Array.from({ length: Math.min(CONCURRENCY, limited.length) }, (_, i) => worker(i))
      );

      if (ok > 0) {
        mode = opts.useRules && ruleResult.changes > 0 ? "mixed" : "llm";
        // el pase final de reglas limpia cualquier muletilla residual del LLM
        const tail = chunks.slice(30).join("\n\n");
        const combined = results.join("\n\n") + (tail ? "\n\n" + tail : "");
        const final = applyRulePass(combined, 0.05, forced);
        const rhythmed = balanceRhythm(final.text, forced);
        working = rhythmed.text;
        changes += ok * 10 + final.changes + rhythmed.changes;
        if (fallback > 0) {
          warnings.push(
            `${fallback} fragmento(s) se han procesado solo con las reglas de limpieza para no superar el tiempo límite; esos tramos pueden sonar menos naturales.`
          );
        }
      } else {
        warnings.push("La reescritura con IA no ha estado disponible; se han aplicado solo las reglas de limpieza de estilo.");
      }
    } catch (e) {
      warnings.push(
        "No se pudo conectar con el modelo de reescritura; se han aplicado solo las reglas de limpieza de estilo. " +
          (e instanceof Error ? e.message : "")
      );
    }
  }

  if (!opts.useLLM) {
    const rhythmed = balanceRhythm(working, forced);
    working = rhythmed.text;
    changes += rhythmed.changes;
  }

  const after = detectAI(working, forced);

  // Aviso si el resultado perdió contenido respecto al original
  const inWords = (input.match(/[\p{L}\p{N}]+/gu) || []).length;
  const outWords = (working.match(/[\p{L}\p{N}]+/gu) || []).length;
  if (inWords > 60 && outWords < inWords * 0.85) {
    warnings.push(
      `El texto final tiene menos contenido que el original (${outWords} de ${inWords} palabras); revíselo para comprobar que no se haya perdido ninguna idea.`
    );
  }

  return { text: working, mode, warnings, changes, after };
}
