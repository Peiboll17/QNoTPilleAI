// Tipos compartidos entre servidor y cliente

/** Idiomas admitidos por el detector y el humanizador */
export type Lang = "es" | "en" | "fr" | "it" | "pt" | "de";

/** Idioma elegido en el selector manual: uno concreto o detección automática */
export type LangChoice = Lang | "auto";

export const VALID_LANGS: Lang[] = ["es", "en", "fr", "it", "pt", "de"];

/** Valida el idioma recibido del cliente ("auto" o uno concreto) */
export function parseLangChoice(v: unknown): LangChoice {
  if (typeof v === "string" && VALID_LANGS.includes(v as Lang)) return v as Lang;
  return "auto";
}

export interface ExtractMeta {
  kind: "pdf" | "doc" | "docx" | "txt";
  chars: number;
  words: number;
  fileName: string;
}

export interface ExtractResponse {
  text: string;
  meta: ExtractMeta;
}

export type LevelKey = "human" | "mixed" | "ai";

export interface DetectIndicator {
  key: string;
  label: string;
  score: number; // 0-100, 100 = típico de IA
  weight: number;
  detail: string;
}

export interface FlaggedSentence {
  sentence: string;
  reason: string;
}

export interface DetectStats {
  words: number;
  sentences: number;
  paragraphs: number;
  avgSentence: number;
  sentenceVariance: number; // coeficiente de variación (burstiness)
  chars: number;
}

export interface DetectResult {
  score: number; // 0-100 probabilidad estimada de IA
  lang: Lang; // idioma detectado del texto
  levelKey: LevelKey;
  level: string;
  summary: string;
  indicators: DetectIndicator[];
  stats: DetectStats;
  flagged: FlaggedSentence[];
  clichesFound: { phrase: string; count: number }[];
  semantic?: boolean; // true = incluye análisis semántico con IA; false = se pidió pero no estuvo disponible
}

export type Intensity = "light" | "medium" | "deep";
export type Tone =
  | "neutral"
  | "profesional"
  | "academico"
  | "cercano"
  | "divulgativo"
  | "marketing"
  | "tecnico"
  | "juridico";

export const VALID_TONES: Tone[] = ["neutral", "profesional", "academico", "cercano", "divulgativo", "marketing", "tecnico", "juridico"];
export const VALID_INTENSITIES: Intensity[] = ["light", "medium", "deep"];

/** Valida y normaliza las opciones de humanización recibidas del cliente */
export function parseHumanizeOptions(body: unknown): HumanizeOptions {
  const b = (body ?? {}) as Record<string, unknown>;
  return {
    intensity: VALID_INTENSITIES.includes(b.intensity as Intensity) ? (b.intensity as Intensity) : "medium",
    tone: VALID_TONES.includes(b.tone as Tone) ? (b.tone as Tone) : "neutral",
    lang: parseLangChoice(b.lang),
    useLLM: b.useLLM !== false,
    useRules: b.useRules !== false,
  };
}

export interface HumanizeOptions {
  intensity: Intensity;
  tone: Tone;
  /** "auto" = detectar; un valor concreto = forzar ese idioma en reglas y modelo */
  lang: LangChoice;
  useLLM: boolean;
  useRules: boolean;
}

export interface HumanizeResponse {
  text: string;
  mode: "llm" | "rules" | "mixed";
  warnings: string[];
  changes: number;
  after: DetectResult;
}

/** Estado de un trabajo de humanización asíncrono (el cliente lo sondea) */
export type HumanizeJobState =
  | { status: "processing"; progress: number; total: number }
  | { status: "done"; result: HumanizeResponse }
  | { status: "error"; error: string };

/** Resultado de un archivo dentro de un lote */
export interface BatchFileResult {
  name: string;
  lang: Lang;
  before: { score: number; level: string };
  after: DetectResult;
  mode: HumanizeResponse["mode"];
  warnings: string[];
  changes: number;
  text: string; // texto humanizado
}

/** Estado de un trabajo por lotes (el cliente lo sondea) */
export type HumanizeBatchJobState =
  | {
      status: "processing";
      filesTotal: number;
      filesDone: number;
      currentFile: string;
      fileProgress: number;
      fileTotal: number;
    }
  | { status: "done"; results: BatchFileResult[] }
  | { status: "error"; error: string; results?: BatchFileResult[] };

export interface ExportRequest {
  text: string;
  format: "docx" | "pdf" | "txt";
  fileName: string;
}
