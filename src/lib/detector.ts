import {
  CLICHES_BY_LANG,
  HUMAN_MARKERS_BY_LANG,
  CONNECTORS_BY_LANG,
  STRUCT_REGEX_BY_LANG,
  STRUCT_LABEL_BY_LANG,
  LANG_NAMES,
  detectLanguage,
} from "./ai-patterns";
import type { Lang } from "./shared-types";
import type {
  DetectIndicator,
  DetectResult,
  FlaggedSentence,
  LevelKey,
} from "./shared-types";

// ---------- utilidades ----------

export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+|\n+/u)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function words(text: string): string[] {
  const m = text.toLowerCase().match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu);
  return m ? m : [];
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const round1 = (x: number) => Math.round(x * 10) / 10;

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}
function std(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---------- indicadores ----------

interface RawIndicator {
  key: string;
  label: string;
  aiScore: number; // 0-1
  weight: number;
  detail: string;
}

/** 1. Burstiness: variación de longitud entre frases. IA = uniforme */
function burstiness(sents: string[], wc: number[]): RawIndicator {
  if (wc.length < 3) {
    return { key: "burstiness", label: "Variabilidad del ritmo", aiScore: 0.5, weight: 0.2, detail: "Texto demasiado corto para medir el ritmo." };
  }
  const m = mean(wc);
  const cv = m > 0 ? std(wc) / m : 0;
  const ai = clamp01((0.62 - cv) / 0.4);
  return {
    key: "burstiness",
    label: "Variabilidad del ritmo",
    aiScore: ai,
    weight: 0.2,
    detail: `Longitud media de frase: ${round1(m)} palabras; variabilidad ${(cv * 100).toFixed(0)}% (${cv < 0.3 ? "muy uniforme, típico de IA" : cv < 0.5 ? "algo uniforme" : "variable, aspecto humano"}).`,
  };
}

/** 2. Frases hechas de IA */
function cliches(text: string, nWords: number, lang: Lang): { ind: RawIndicator; found: { phrase: string; count: number }[] } {
  const list = CLICHES_BY_LANG[lang];
  const structRegex = STRUCT_REGEX_BY_LANG[lang];
  const structLabel = STRUCT_LABEL_BY_LANG[lang];
  const norm = normalize(text);
  const found: { phrase: string; count: number }[] = [];
  let weighted = 0;
  for (const c of list) {
    const re = new RegExp(`\\b${escapeRegex(normalize(c.phrase))}\\b`, "g");
    const hits = (norm.match(re) || []).length;
    if (hits > 0) {
      weighted += hits * c.weight;
      found.push({ phrase: c.phrase, count: hits });
    }
  }
  // estructura "no solo ... sino también" / "not only ... but also"
  const noSolo = (text.match(structRegex) || []).length;
  if (noSolo > 0) {
    weighted += noSolo * 1.5;
    found.push({ phrase: structLabel, count: noSolo });
  }
  const density = nWords > 0 ? (weighted * 1000) / nWords : 0;
  found.sort((a, b) => b.count - a.count);
  return {
    ind: {
      key: "cliches",
      label: "Frases hechas de IA",
      aiScore: clamp01(density / 10),
      weight: 0.24,
      detail:
        weighted === 0
          ? "No se han detectado muletillas típicas de IA."
          : `${found.length} patrón(es) distinto(s), densidad ${density.toFixed(1)} por cada 1.000 palabras (${density > 5 ? "muy alta" : density > 2 ? "alta" : "moderada"}).`,
    },
    found: found.slice(0, 10),
  };
}

/** 3. Densidad de conectores al inicio de frase */
function connectors(sents: string[], lang: Lang): RawIndicator {
  if (sents.length < 3) {
    return { key: "connectors", label: "Conectores formulaicos", aiScore: 0.5, weight: 0.14, detail: "Texto demasiado corto para medir conectores." };
  }
  const list = CONNECTORS_BY_LANG[lang];
  let hits = 0;
  for (const s of sents) {
    const first = normalize(s).split(/[\s,]+/).slice(0, 4).join(" ");
    if (list.some((c) => first.startsWith(normalize(c)))) hits++;
  }
  const ratio = hits / sents.length;
  return {
    key: "connectors",
    label: "Conectores formulaicos",
    aiScore: clamp01((ratio - 0.1) / 0.32),
    weight: 0.14,
    detail: `${hits} de ${sents.length} frases empiezan con conector de plantilla (${(ratio * 100).toFixed(0)}%; ${ratio > 0.35 ? "patrón muy típico de IA" : ratio > 0.18 ? "por encima de lo habitual" : "dentro de lo normal"}).`,
  };
}

/** 4. Uniformidad de párrafos */
function paragraphs(paras: string[]): RawIndicator {
  if (paras.length < 3) {
    return { key: "paragraphs", label: "Uniformidad de párrafos", aiScore: 0.5, weight: 0.05, detail: "Pocos párrafos para evaluar." };
  }
  const lens = paras.map((p) => words(p).length);
  const m = mean(lens);
  const cv = m > 0 ? std(lens) / m : 0;
  const ai = clamp01((0.45 - cv) / 0.45);
  return {
    key: "paragraphs",
    label: "Uniformidad de párrafos",
    aiScore: ai,
    weight: 0.05,
    detail: `${paras.length} párrafos, media de ${round1(m)} palabras, variabilidad ${(cv * 100).toFixed(0)}% (${cv < 0.2 ? "bloques casi idénticos, muy mecánico" : cv < 0.4 ? "bastante uniformes" : "tamaños variados, aspecto humano"}).`,
  };
}

/** 5. Repeticiones léxicas (n-gramas repetidos) */
function lexical(text: string, nWords: number): RawIndicator {
  const w = words(text);
  if (w.length < 80) {
    return { key: "lexical", label: "Repetición de estructuras", aiScore: 0.5, weight: 0.05, detail: "Texto demasiado corto para analizar repeticiones." };
  }
  const sample = w.slice(0, 1500);
  const ngrams = new Map<string, number>();
  const N = 4;
  for (let i = 0; i <= sample.length - N; i++) {
    const g = sample.slice(i, i + N).join(" ");
    ngrams.set(g, (ngrams.get(g) || 0) + 1);
  }
  let repeated = 0;
  for (const c of ngrams.values()) if (c > 1) repeated += c - 1;
  const ratio = repeated / Math.max(1, sample.length - N);
  // IA: repite estructuras de 4 palabras más que un humano
  const ai = clamp01((ratio - 0.012) / 0.05);
  return {
    key: "lexical",
    label: "Repetición de estructuras",
    aiScore: ai,
    weight: 0.05,
    detail: `${(ratio * 100).toFixed(1)}% de estructuras de 4 palabras repetidas (${ratio > 0.05 ? "mucha repetición de fórmulas" : ratio > 0.02 ? "repetición notable" : "variedad léxica razonable"}).`,
  };
}

/** 6. Puntuación típica de IA */
function punctuation(text: string, nWords: number, lang: Lang): RawIndicator {
  const perK = (n: number) => (nWords > 0 ? (n * 1000) / nWords : 0);
  const emdash = perK((text.match(/—|–/g) || []).length);
  const semicolon = perK((text.match(/;/g) || []).length);
  const colon = perK((text.match(/:/g) || []).length);
  const structRegex = STRUCT_REGEX_BY_LANG[lang];
  const structLabel = `"${STRUCT_LABEL_BY_LANG[lang]}"`;
  const noSolo = (text.match(structRegex) || []).length;
  let score = 0;
  score += clamp01(emdash / 4) * 0.45;
  score += clamp01(semicolon / 6) * 0.25;
  score += clamp01(colon / 12) * 0.1;
  score += clamp01(noSolo / Math.max(1, nWords / 300)) * 0.2;
  const parts: string[] = [];
  if (emdash > 1.5) parts.push(`${emdash.toFixed(1)} rayas (—) por 1.000 palabras`);
  if (semicolon > 2.5) parts.push(`${semicolon.toFixed(1)} punto y coma por 1.000 palabras`);
  if (noSolo >= 2) parts.push(`${noSolo} construcciones ${structLabel}`);
  return {
    key: "punctuation",
    label: "Puntuación y construcción",
    aiScore: clamp01(score),
    weight: 0.1,
    detail: parts.length ? parts.join("; ") + " (uso característico de modelos de IA)." : "Puntuación sin patrones llamativos de IA.",
  };
}

/** 7. Ausencia de marcas humanas */
function humanMarks(text: string, nWords: number, lang: Lang): RawIndicator {
  const markers = HUMAN_MARKERS_BY_LANG[lang];
  const norm = " " + normalize(text) + " ";
  let hits = 0;
  for (const m of markers) {
    // límite de palabra al inicio Y al final: sin el \\b final, «mi»
    // coincidía con «mismo», «mientras», «millones»… inflando la señal humana
    const phrase = normalize(m).replace(/[^\p{L}\p{N}]+$/u, "");
    if (!phrase) continue;
    const re = new RegExp(`\\b${escapeRegex(phrase)}\\b`, "g");
    hits += (norm.match(re) || []).length;
  }
  const excl = (text.match(/[!¡]/g) || []).length;
  const question = (text.match(/[?¿]/g) || []).length;
  const typos = (text.match(/\b(\p{L}+)\s\1\b/giu) || []).length;
  const density = nWords > 0 ? (hits * 1000) / nWords : 0;
  const express = nWords > 0 ? ((excl + question) * 1000) / nWords : 0;
  const humanScore =
    clamp01(density / 8) * 0.6 + clamp01(express / 15) * 0.3 + clamp01(typos / 2) * 0.1;
  return {
    key: "humanMarks",
    label: "Marcas de voz humana",
    aiScore: Math.min(0.85, 1 - humanScore),
    weight: 0.12,
    detail:
      hits === 0 && excl + question === 0
        ? "Sin coloquialismos, primera persona ni exclamaciones: voz neutral típica de IA."
        : `${hits} marca(s) conversacional(es) y ${excl + question} signo(s) de exclamación/interrogación (${humanScore > 0.5 ? "voz con personalidad" : "voz algo plana"}).`,
  };
}

/** 8. Arranques repetidos de frase */
function sentenceOpeners(sents: string[]): RawIndicator {
  if (sents.length < 5) {
    return { key: "openers", label: "Arranques de frase", aiScore: 0.5, weight: 0.05, detail: "Texto demasiado corto para evaluar arranques." };
  }
  const starts = sents.map((s) => {
    const w = words(s).slice(0, 2);
    return w.join(" ");
  });
  const counts = new Map<string, number>();
  for (const s of starts) counts.set(s, (counts.get(s) || 0) + 1);
  let maxRep = 0;
  for (const c of counts.values()) if (c > maxRep) maxRep = c;
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  const ai = clamp01((maxRep / sents.length - 0.15) / 0.3);
  return {
    key: "openers",
    label: "Arranques de frase",
    aiScore: ai,
    weight: 0.05,
    detail: `El arranque más repetido "${top ? top[0] : "—"}" aparece en ${maxRep} de ${sents.length} frases (${maxRep / sents.length > 0.3 ? "monotonía notable" : "variedad correcta"}).`,
  };
}

export function detectAI(rawText: string, forcedLang?: Lang): DetectResult {
  const text = rawText.replace(/\r\n?/g, "\n").trim();
  // idioma: el forzado por el selector manual tiene prioridad sobre la detección
  const lang = forcedLang ?? detectLanguage(text);
  const clicheList = CLICHES_BY_LANG[lang];
  const sents = splitSentences(text);
  const wc = sents.map((s) => words(s).length);
  const nWords = wc.reduce((a, b) => a + b, 0) || words(text).length;
  const paras = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  const clicheRes = cliches(text, nWords, lang);

  const raws: RawIndicator[] = [
    burstiness(sents, wc),
    clicheRes.ind,
    connectors(sents, lang),
    paragraphs(paras),
    lexical(text, nWords),
    punctuation(text, nWords, lang),
    humanMarks(text, nWords, lang),
    sentenceOpeners(sents),
  ];

  const totalWeight = raws.reduce((a, r) => a + r.weight, 0);
  let score = raws.reduce((a, r) => a + r.aiScore * r.weight, 0) / (totalWeight || 1);
  // ajuste fino: los clichés muy densos empujan con fuerza
  if (clicheRes.ind.aiScore > 0.7) score = Math.max(score, 0.66);

  const finalScore = Math.round(clamp(score, 0, 1) * 100);
  const levelKey: LevelKey = finalScore >= 65 ? "ai" : finalScore >= 35 ? "mixed" : "human";

  const indicators: DetectIndicator[] = raws
    .sort((a, b) => b.weight * b.aiScore - a.weight * a.aiScore)
    .map((r) => ({
      key: r.key,
      label: r.label,
      score: Math.round(r.aiScore * 100),
      weight: r.weight,
      detail: r.detail,
    }));

  // Frases sospechosas
  const flagged: FlaggedSentence[] = [];
  const seen = new Set<string>();
  for (const s of sents) {
    if (flagged.length >= 8) break;
    if (words(s).length < 6 || seen.has(s)) continue;
    const normS = normalize(s);
    const hit = clicheList.find((c) => normS.includes(normalize(c.phrase)));
    const nW = words(s).length;
    if (hit && hit.weight >= 1.5) {
      flagged.push({ sentence: s.length > 240 ? s.slice(0, 240) + "…" : s, reason: `Contiene la muletilla «${hit.phrase}»` });
      seen.add(s);
    } else if (nW > 34) {
      flagged.push({ sentence: s.length > 240 ? s.slice(0, 240) + "…" : s, reason: `Frase muy larga (${nW} palabras), ritmo poco natural` });
      seen.add(s);
    }
  }

  return {
    score: finalScore,
    lang,
    levelKey: levelKey,
    level: LEVELS[levelKey].label + (lang === "es" ? "" : ` (texto en ${LANG_NAMES[lang]})`),
    summary: LEVELS[levelKey].summary,
    indicators,
    stats: {
      words: nWords,
      sentences: sents.length,
      paragraphs: paras.length || 1,
      avgSentence: sents.length ? round1(nWords / sents.length) : 0,
      sentenceVariance: wc.length ? round1((std(wc) / (mean(wc) || 1)) * 100) : 0,
      chars: text.length,
    },
    flagged,
    clichesFound: clicheRes.found,
  };
}

// ---------- combinación con el análisis semántico ----------

const LEVELS: Record<LevelKey, { label: string; summary: string }> = {
  human: {
    label: "Probablemente humano",
    summary: "El texto muestra rasgos de escritura humana: ritmo variado y vocabulario con personalidad.",
  },
  mixed: {
    label: "Indeterminado / mixto",
    summary: "El texto combina rasgos humanos y automáticos; podría ser IA revisada por una persona o un texto humano muy formal.",
  },
  ai: {
    label: "Probablemente generado por IA",
    summary: "El texto presenta patrones típicos de modelos de lenguaje: ritmo uniforme, muletillas formulaicas y estructuras repetidas.",
  },
};

/** Combina el resultado de heurísticas con la valoración del análisis semántico (50/50) */
export function combineWithLLM(
  base: DetectResult,
  llm: { score: number; reasons: string[] }
): DetectResult {
  const finalScore = Math.round(base.score * 0.5 + llm.score * 0.5);
  const levelKey: LevelKey = finalScore >= 65 ? "ai" : finalScore >= 35 ? "mixed" : "human";

  const semanticIndicator: DetectIndicator = {
    key: "semantic",
    label: "Análisis semántico con IA",
    score: Math.round(llm.score),
    weight: 1,
    detail: llm.reasons.length
      ? llm.reasons.join(" ")
      : "Valoración de un modelo de lenguaje sobre la previsibilidad, la uniformidad y la voz del texto.",
  };

  return {
    ...base,
    score: finalScore,
    levelKey,
    level: LEVELS[levelKey].label,
    summary:
      LEVELS[levelKey].summary +
      " Método: heurísticas de estilo combinadas con análisis semántico de un modelo de lenguaje.",
    indicators: [...base.indicators, semanticIndicator],
    semantic: true,
  };
}
