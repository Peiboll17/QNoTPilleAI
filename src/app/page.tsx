"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  BrainCircuit,
  Check,
  ClipboardPaste,
  Copy,
  Download,
  FileDown,
  FileSearch,
  FileText,
  FileUp,
  Layers,
  Loader2,
  MessageSquareWarning,
  Pencil,
  RefreshCw,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import type {
  BatchFileResult,
  DetectResult,
  ExtractMeta,
  HumanizeBatchJobState,
  HumanizeJobState,
  HumanizeResponse,
  Intensity,
  Lang,
  LangChoice,
  Tone,
} from "@/lib/shared-types";

// Etiquetas visibles de los idiomas admitidos
const LANG_LABELS: Record<Lang, string> = {
  es: "español",
  en: "inglés",
  fr: "francés",
  it: "italiano",
  pt: "portugués",
  de: "alemán",
};

// ---------- utilidades visuales ----------

function scoreHex(score: number): string {
  if (score < 35) return "#1F8A44";
  if (score < 65) return "#d97706";
  return "#dc2626";
}

function scoreBg(score: number): string {
  if (score < 35) return "bg-emerald-600";
  if (score < 65) return "bg-amber-600";
  return "bg-red-600";
}

function levelBadgeClass(key: string): string {
  if (key === "human") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (key === "mixed") return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-red-100 text-red-800 border-red-200";
}

function Gauge({ value, size = 190 }: { value: number; size?: number }) {
  const r = 70;
  const c = 2 * Math.PI * r;
  const color = scoreHex(value);
  return (
    <svg width={size} height={size} viewBox="0 0 180 180" role="img" aria-label={`Probabilidad de IA: ${value}%`}>
      <circle cx="90" cy="90" r={r} stroke="#e8ebe8" strokeWidth="14" fill="none" />
      <circle
        cx="90"
        cy="90"
        r={r}
        stroke={color}
        strokeWidth="14"
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${(value / 100) * c} ${c}`}
        transform="rotate(-90 90 90)"
        style={{ transition: "stroke-dasharray 0.8s ease, stroke 0.8s ease" }}
      />
      <text x="90" y="92" textAnchor="middle" fontSize="42" fontWeight="700" fill={color}>
        {value}%
      </text>
      <text x="90" y="118" textAnchor="middle" fontSize="12.5" fill="#6b7280">
        probabilidad de IA
      </text>
    </svg>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/40 px-3 py-2.5 text-center">
      <div className="text-lg font-semibold leading-tight">{value}</div>
      <div className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

// ---------- cliente fetch tolerante ----------

// Parser JSON seguro: si el servidor o un proxy intermedio devuelve HTML,
// una respuesta vacía o corta la conexión, mostramos un mensaje claro
// en lugar del error críptico "JSON.parse: unexpected character".
async function fetchJson<T>(url: string, init: RequestInit, timeoutMs = 60_000): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: ctrl.signal });
  } catch {
    clearTimeout(timer);
    throw new Error(
      "No se pudo contactar con el servidor o la petición ha tardado demasiado. Comprueba tu conexión e inténtalo de nuevo; si el texto es muy largo, prueba con uno más corto."
    );
  }
  clearTimeout(timer);

  const raw = await res.text().catch(() => "");
  let data: unknown = null;
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = null;
    }
  }

  if (data === null || typeof data !== "object") {
    throw new Error(
      res.ok
        ? "El servidor devolvió una respuesta no válida. Inténtalo de nuevo."
        : `El servidor no ha podido procesar la petición (código ${res.status}). Si el texto es muy largo, prueba con uno más corto o desactiva «Reescritura con IA».`
    );
  }
  if (!res.ok) {
    const msg = (data as { error?: string }).error;
    throw new Error(msg || `Error del servidor (código ${res.status}).`);
  }
  return data as T;
}

function IndicatorBar({ label, score, detail }: { label: string; score: number; detail: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">{label}</span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold text-white ${scoreBg(score)}`}>
          {score}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all duration-700 ${scoreBg(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">{detail}</p>
    </div>
  );
}

// ---------- página ----------

type InputMode = "file" | "paste" | "batch";

interface BatchItem {
  file: File | null; // null = texto pegado manualmente (no es un archivo)
  label: string; // nombre visible y base del nombre de archivo exportado
  status: "pendiente" | "extrayendo" | "listo" | "error";
  detail: string; // mensaje de estado o error
  text: string;
  result?: BatchFileResult;
}

// Ilustración del hero: recreación vectorial del diseño de la landing
// (texto IA caótico → «Human Touch» → texto humano indetectable, con los
// «ojos» de los detectores tachados).
function HeroIllustration() {
  return (
    <svg
      viewBox="0 0 520 380"
      className="mx-auto h-auto w-full max-w-[520px] drop-shadow-sm"
      role="img"
      aria-label="Ilustración: un texto generado por IA se convierte, con un toque humano, en texto humano indetectable mientras los detectores quedan tachados"
    >
      <defs>
        <linearGradient id="gradGreen" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#48C956" />
          <stop offset="100%" stopColor="#2AB552" />
        </linearGradient>
        <linearGradient id="gradPerson" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1D81F3" />
          <stop offset="100%" stopColor="#1D73C8" />
        </linearGradient>
      </defs>

      {/* circuitos decorativos */}
      <g stroke="#dbe7fb" strokeWidth="2" fill="none">
        <polyline points="14,52 58,52 58,104 96,104" />
        <polyline points="22,330 66,330 66,286" />
        <polyline points="492,306 506,306 506,346" />
      </g>
      <g fill="#c6dbf8">
        <circle cx="96" cy="104" r="3.5" />
        <circle cx="66" cy="286" r="3.5" />
        <circle cx="506" cy="346" r="3.5" />
      </g>

      {/* pantalla */}
      <rect x="120" y="70" width="360" height="230" rx="14" fill="#ffffff" stroke="#d7e2f2" strokeWidth="2" />
      <path d="M120 84 a14 14 0 0 1 14 -14 h332 a14 14 0 0 1 14 14 v12 h-360 Z" fill="#e8eff9" />
      <circle cx="140" cy="83" r="4" fill="#f87171" />
      <circle cx="154" cy="83" r="4" fill="#fbbf24" />
      <circle cx="168" cy="83" r="4" fill="#48C956" />
      <line x1="300" y1="112" x2="300" y2="284" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="5 6" />

      {/* tarjeta AI Text (caos) */}
      <rect x="138" y="128" width="124" height="124" rx="10" fill="#ffffff" stroke="#d7e2f2" strokeWidth="2" />
      <text x="200" y="151" textAnchor="middle" fontSize="12" fontWeight="600" fill="#334155">
        AI Text
      </text>
      <g stroke="#2FB557" strokeWidth="2.4" fill="none" strokeLinecap="round">
        <path d="M152 172 q10 -14 20 0 t20 0 t20 0 t20 0" />
        <path d="M152 196 q12 12 24 -2 t24 2 t22 -4 t14 2" />
        <path d="M152 220 q9 -12 19 0 t19 0 t20 -3 t18 1" />
        <path d="M158 240 q14 -8 26 2 t26 -4 t20 2" />
      </g>

      {/* flecha Human Touch */}
      <polygon points="272,166 318,166 318,148 358,184 318,220 318,202 272,202" fill="url(#gradGreen)" />
      <text x="309" y="181" textAnchor="middle" fontSize="11" fontWeight="700" fill="#ffffff">
        Human
      </text>
      <text x="309" y="196" textAnchor="middle" fontSize="11" fontWeight="700" fill="#ffffff">
        Touch
      </text>

      {/* tarjeta Undetectable Human Text */}
      <rect x="366" y="128" width="126" height="124" rx="10" fill="#ffffff" stroke="#d7e2f2" strokeWidth="2" />
      <text x="429" y="152" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#1D7D3B">
        Undetectable
      </text>
      <text x="429" y="166" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#1D7D3B">
        Human Text
      </text>
      <g fill="#48C956" opacity="0.9">
        <rect x="380" y="178" width="98" height="4" rx="2" />
        <rect x="380" y="190" width="86" height="4" rx="2" />
        <rect x="380" y="202" width="98" height="4" rx="2" />
        <rect x="380" y="214" width="72" height="4" rx="2" />
        <rect x="380" y="226" width="56" height="4" rx="2" />
      </g>

      {/* fleja de flujo inferior */}
      <path d="M200 276 C240 306 360 306 398 280" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 5" fill="none" />
      <polygon points="398,280 388,278 393,289" fill="#94a3b8" />

      {/* ojos de detectores tachados */}
      {[
        { cx: 395, cy: 46, n: "92" },
        { cx: 495, cy: 170, n: "87" },
        { cx: 300, cy: 330, n: "96" },
      ].map((e) => (
        <g key={e.n}>
          <ellipse cx={e.cx} cy={e.cy} rx="17" ry="11" fill="#ffffff" stroke="#1e293b" strokeWidth="2" />
          <circle cx={e.cx} cy={e.cy} r="7" fill="#216ED6" />
          <text x={e.cx} y={e.cy + 2.5} textAnchor="middle" fontSize="7" fontWeight="700" fill="#ffffff">
            AI
          </text>
          <circle cx={e.cx + 14} cy={e.cy - 12} r="9.5" fill="#ef4444" />
          <text x={e.cx + 14} y={e.cy - 9} textAnchor="middle" fontSize="8" fontWeight="700" fill="#ffffff">
            {e.n}
          </text>
          <line
            x1={e.cx - 20}
            y1={e.cy + 14}
            x2={e.cx + 20}
            y2={e.cy - 14}
            stroke="#ef4444"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </g>
      ))}

      {/* persona */}
      <circle cx="95" cy="204" r="24" fill="#1e3a8a" />
      <path d="M48 350 C48 276 66 240 95 234 C124 240 142 276 142 350 Z" fill="url(#gradPerson)" />
      <path d="M118 268 C148 256 166 238 180 222" stroke="#1D73C8" strokeWidth="15" fill="none" strokeLinecap="round" />
      <circle cx="184" cy="218" r="8.5" fill="#f3c6a5" />
    </svg>
  );
}

export default function Home() {
  const [inputMode, setInputMode] = useState<InputMode>("file");
  const [fileMeta, setFileMeta] = useState<ExtractMeta | null>(null);
  const [originalText, setOriginalText] = useState("");
  const [pasteText, setPasteText] = useState("");

  const [extracting, setExtracting] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [humanizing, setHumanizing] = useState(false);
  const [hProgress, setHProgress] = useState<{ done: number; total: number } | null>(null);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);

  const [detection, setDetection] = useState<DetectResult | null>(null);
  const [humanized, setHumanized] = useState<HumanizeResponse | null>(null);
  const [humanizedText, setHumanizedText] = useState("");
  const [afterDetect, setAfterDetect] = useState<DetectResult | null>(null);

  const [intensity, setIntensity] = useState<Intensity>("medium");
  const [tone, setTone] = useState<Tone>("neutral");
  const [useLLM, setUseLLM] = useState(true);
  const [useRules, setUseRules] = useState(true);
  const [semantic, setSemantic] = useState(true);
  // Idioma del texto: "auto" (detección) o uno fijado a mano en el selector
  const [langChoice, setLangChoice] = useState<LangChoice>("auto");

  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [dragging, setDragging] = useState(false);
  // Entrada rápida de la landing: pega un texto y lo analiza directamente
  const [quickText, setQuickText] = useState("");

  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [batchStatus, setBatchStatus] = useState<string | null>(null);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchPasteText, setBatchPasteText] = useState("");
  const [batchPasteLabel, setBatchPasteLabel] = useState("");
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editText, setEditText] = useState("");

  const analysisRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const batchInputRef = useRef<HTMLInputElement>(null);
  const inicioRef = useRef<HTMLDivElement>(null);

  const workingText = inputMode === "file" ? originalText : pasteText;
  const canAnalyze = workingText.trim().length >= 40 && !detecting;

  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>) =>
    setTimeout(() => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);

  // ---------- acciones ----------

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setExtracting(true);
    setDetection(null);
    setHumanized(null);
    setAfterDetect(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const data = await fetchJson<{ text: string; meta: ExtractMeta }>(
        "/api/extract",
        { method: "POST", body: fd },
        90_000
      );
      setOriginalText(data.text);
      setFileMeta(data.meta);
      scrollTo(analysisRef);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al procesar el archivo.");
      setFileMeta(null);
    } finally {
      setExtracting(false);
    }
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  // Cambiar el idioma invalida los resultados: se calcularon con otras reglas
  const changeLang = (v: string) => {
    setLangChoice(v as LangChoice);
    setDetection(null);
    setHumanized(null);
    setAfterDetect(null);
  };

  const analyze = async (textOverride?: string) => {
    const source = typeof textOverride === "string" ? textOverride : workingText;
    if (source.trim().length < 40) return;
    setError(null);
    setDetecting(true);
    setHumanized(null);
    setAfterDetect(null);
    try {
      const data = await fetchJson<DetectResult>("/api/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: source.slice(0, 200000), useAI: semantic, lang: langChoice }),
      });
      setDetection(data);
      scrollTo(analysisRef);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al analizar el texto.");
    } finally {
      setDetecting(false);
    }
  };

  // Botón «HUMANIZAR Y VERIFICAR» de la landing: carga el texto pegado y lo analiza
  const quickStart = () => {
    const t = quickText.trim();
    if (t.length < 40) {
      setError("Pega al menos ~40 caracteres en el campo de texto para analizarlos.");
      return;
    }
    setError(null);
    setPasteText(t);
    setQuickText("");
    setInputMode("paste");
    setDetection(null);
    setHumanized(null);
    setAfterDetect(null);
    void analyze(t);
  };

  const humanize = async () => {
    setError(null);
    setHumanizing(true);
    setHProgress(null);
    try {
      // 1) iniciar el trabajo: el servidor responde al instante con un id.
      //    La reescritura ocurre en segundo plano; así ninguna petición HTTP
      //    larga atraviesa el proxy intermedio (que las corta con un 502).
      const { id } = await fetchJson<{ id: string; status: string }>(
        "/api/humanize",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: workingText.slice(0, 200000),
            intensity,
            tone,
            lang: langChoice,
            useLLM,
            useRules,
          }),
        },
        30_000
      );

      // 2) sondear el estado cada 2 s hasta que termine
      const started = Date.now();
      let fallos = 0;
      while (Date.now() - started < 420_000) {
        await new Promise((r) => setTimeout(r, 2000));
        let st: HumanizeJobState;
        try {
          st = await fetchJson<HumanizeJobState>(`/api/humanize?id=${encodeURIComponent(id)}`, {}, 20_000);
          fallos = 0;
        } catch {
          // un fallo puntual de red no cancela el trabajo: reintentar
          fallos++;
          if (fallos >= 4) {
            throw new Error(
              "Se ha perdido la conexión con el servidor mientras se humanizaba el texto. Comprueba tu conexión e inténtalo de nuevo."
            );
          }
          continue;
        }
        if (st.status === "processing") {
          if (st.total > 0) setHProgress({ done: st.progress, total: st.total });
          continue;
        }
        if (st.status === "error") throw new Error(st.error);
        const data = st.result;
        setHumanized(data);
        setHumanizedText(data.text);
        setAfterDetect(data.after);
        scrollTo(resultRef);
        return;
      }
      throw new Error(
        "La reescritura está tardando demasiado. Inténtalo de nuevo; si persiste, prueba con un texto más corto o desactiva «Reescritura con IA»."
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al humanizar el texto.");
    } finally {
      setHumanizing(false);
      setHProgress(null);
    }
  };

  const reanalyze = async () => {
    setError(null);
    setReanalyzing(true);
    try {
      const data = await fetchJson<DetectResult>("/api/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: humanizedText.slice(0, 200000), useAI: semantic, lang: langChoice }),
      });
      setAfterDetect(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al reanalizar.");
    } finally {
      setReanalyzing(false);
    }
  };

  const download = async (format: "docx" | "pdf" | "txt") => {
    setError(null);
    setExporting(format);
    try {
      const base = (fileMeta?.fileName || "texto").replace(/\.[A-Za-z0-9]+$/, "") || "texto";
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: humanizedText, format, fileName: base }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "No se pudo generar el archivo.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${base}_humanizado.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al exportar.");
    } finally {
      setExporting(null);
    }
  };

  const copyResult = async () => {
    try {
      await navigator.clipboard.writeText(humanizedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("No se pudo copiar al portapapeles.");
    }
  };

  const resetAll = () => {
    setOriginalText("");
    setPasteText("");
    setFileMeta(null);
    setDetection(null);
    setHumanized(null);
    setHumanizedText("");
    setAfterDetect(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ---------- lote ----------

  const addBatchFiles = (list: FileList | File[]) => {
    const files = Array.from(list).filter((f) => /\.(pdf|doc|docx|txt|md)$/i.test(f.name));
    if (!files.length) {
      setError("Formato no admitido en el lote: usa PDF, DOC, DOCX o TXT.");
      return;
    }
    setError(null);
    setBatchItems((prev) => {
      const merged = [...prev];
      for (const f of files) {
        if (merged.length >= 12) break;
        if (merged.some((m) => m.file?.name === f.name && m.file?.size === f.size)) continue;
        merged.push({ file: f, label: f.name, status: "pendiente", detail: "En espera", text: "" });
      }
      return merged;
    });
  };

  const removeBatchItem = (idx: number) => {
    setBatchItems((prev) => prev.filter((_, j) => j !== idx));
  };

  // Añadir un texto pegado al lote, con un nombre único y seguro como nombre de archivo
  const addBatchPaste = () => {
    const t = batchPasteText.trim();
    if (t.length < 40) {
      setError("El texto pegado es demasiado corto (mínimo ~40 caracteres).");
      return;
    }
    if (batchItems.length >= 12) {
      setError("Máximo 12 elementos por lote.");
      return;
    }
    const raw = batchPasteLabel
      .trim()
      .replace(/[\\/:*?"<>|]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 60);
    const taken = new Set(batchItems.map((b) => b.label.toLowerCase()));
    let label: string;
    if (raw) {
      label = raw;
      let k = 2;
      while (taken.has(label.toLowerCase())) {
        label = `${raw} (${k})`;
        k++;
      }
    } else {
      let k = 1;
      do {
        label = `Texto ${batchItems.length + k}`;
        k++;
      } while (taken.has(label.toLowerCase()));
    }
    setError(null);
    setBatchItems((prev) => [...prev, { file: null, label, status: "pendiente", detail: "En espera", text: t }]);
    setBatchPasteText("");
    setBatchPasteLabel("");
  };

  // ---------- edición de un texto pegado ya añadido ----------

  const startEditItem = (idx: number) => {
    const it = batchItems[idx];
    if (!it || it.file || batchRunning) return;
    setError(null);
    setEditingIdx(idx);
    setEditLabel(it.label);
    setEditText(it.text);
  };

  const cancelEditItem = () => {
    setEditingIdx(null);
    setEditLabel("");
    setEditText("");
  };

  const saveEditItem = () => {
    if (editingIdx === null) return;
    const t = editText.trim();
    if (t.length < 40) {
      setError("El texto editado es demasiado corto (mínimo ~40 caracteres).");
      return;
    }
    const current = batchItems[editingIdx];
    if (!current) return;
    const raw = editLabel
      .trim()
      .replace(/[\\/:*?"<>|]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 60);
    const base = raw || current.label;
    const taken = new Set(
      batchItems.map((b, j) => (j === editingIdx ? "" : b.label.toLowerCase())).filter(Boolean)
    );
    let label = base;
    let k = 2;
    while (taken.has(label.toLowerCase())) {
      label = `${base} (${k})`;
      k++;
    }
    setBatchItems((prev) =>
      prev.map((b, j) =>
        j === editingIdx
          ? { ...b, label, text: t, status: "pendiente" as const, detail: "Editado, sin procesar", result: undefined }
          : b
      )
    );
    cancelEditItem();
  };

  const applyBatchResults = (results: BatchFileResult[]) => {
    setBatchItems((prev) =>
      prev.map((b) => {
        const r = results.find((x) => x.name === b.label);
        return r ? { ...b, status: "listo" as const, detail: "Humanizado", result: r } : b;
      })
    );
  };

  const processBatch = async () => {
    if (batchItems.length === 0 || batchRunning) return;
    setError(null);
    setBatchRunning(true);
    try {
      // 1) extraer el texto de cada archivo (los que ya tienen texto se saltan)
      const texts: { name: string; text: string }[] = [];
      let fallas = 0;
      for (let i = 0; i < batchItems.length; i++) {
        const it = batchItems[i];
        if (it.text.trim().length >= 40) {
          texts.push({ name: it.label, text: it.text });
          continue;
        }
        if (!it.file) {
          // texto pegado demasiado corto (no debería ocurrir, pero por seguridad)
          fallas++;
          setBatchItems((prev) =>
            prev.map((b, j) =>
              j === i ? { ...b, status: "error", detail: "Texto demasiado corto (mínimo ~40 caracteres)." } : b
            )
          );
          continue;
        }
        setBatchItems((prev) =>
          prev.map((b, j) => (j === i ? { ...b, status: "extrayendo", detail: "Extrayendo texto…" } : b))
        );
        setBatchStatus(`Extrayendo texto (${i + 1} de ${batchItems.length}): ${it.label}`);
        try {
          const fd = new FormData();
          fd.append("file", it.file);
          const data = await fetchJson<{ text: string }>("/api/extract", { method: "POST", body: fd }, 90_000);
          texts.push({ name: it.label, text: data.text });
          setBatchItems((prev) =>
            prev.map((b, j) => (j === i ? { ...b, status: "listo", detail: "Texto extraído", text: data.text } : b))
          );
        } catch (e) {
          fallas++;
          setBatchItems((prev) =>
            prev.map((b, j) =>
              j === i
                ? { ...b, status: "error", detail: e instanceof Error ? e.message : "No se pudo extraer el texto." }
                : b
            )
          );
        }
      }
      if (texts.length === 0) {
        throw new Error("Ninguno de los archivos tiene texto utilizable (mínimo ~40 caracteres).");
      }

      // 2) lanzar el trabajo por lotes en el servidor (responde al instante)
      setBatchStatus(`Iniciando la reescritura de ${texts.length} elemento(s)…`);
      const { id } = await fetchJson<{ id: string }>(
        "/api/humanize-batch",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ files: texts, intensity, tone, lang: langChoice, useLLM, useRules }),
        },
        30_000
      );

      // 3) sondear el estado cada 3 s (máx. 1 h)
      const started = Date.now();
      let fallos = 0;
      while (Date.now() - started < 3_600_000) {
        await new Promise((r) => setTimeout(r, 3000));
        let st: HumanizeBatchJobState;
        try {
          st = await fetchJson<HumanizeBatchJobState>(
            `/api/humanize-batch?id=${encodeURIComponent(id)}`,
            {},
            20_000
          );
          fallos = 0;
        } catch {
          fallos++;
          if (fallos >= 4) {
            throw new Error("Se ha perdido la conexión con el servidor durante el lote. Inténtalo de nuevo.");
          }
          continue;
        }
        if (st.status === "processing") {
          setBatchStatus(
            `Archivo ${Math.min(st.filesDone + 1, st.filesTotal)} de ${st.filesTotal}: ${st.currentFile}` +
              (st.fileTotal > 0 ? ` · fragmento ${st.fileProgress}/${st.fileTotal}` : "")
          );
          continue;
        }
        if (st.status === "error") {
          if (st.results?.length) applyBatchResults(st.results);
          throw new Error(st.error);
        }
        applyBatchResults(st.results);
        setBatchStatus(`Lote completado: ${st.results.length} elemento(s) humanizados.`);
        if (fallas > 0) {
          setError(`${fallas} elemento(s) no pudieron procesarse y se han omitido.`);
        }
        return;
      }
      throw new Error("El lote está tardando demasiado. Reinténtalo con menos archivos.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al procesar el lote.");
      setBatchStatus(null);
    } finally {
      setBatchRunning(false);
    }
  };

  const downloadBlob = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const downloadBatchFile = async (item: BatchItem, format: "docx" | "pdf" | "txt") => {
    if (!item.result) return;
    setError(null);
    setExporting(`batch:${item.label}:${format}`);
    try {
      const base = item.label.replace(/\.[A-Za-z0-9]+$/, "") || "texto";
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: item.result.text, format, fileName: base }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error || "No se pudo generar el archivo.");
      }
      downloadBlob(await res.blob(), `${base}_humanizado.${format}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al exportar.");
    } finally {
      setExporting(null);
    }
  };

  const downloadBatchZip = async (format: "docx" | "pdf" | "txt") => {
    const ready = batchItems.filter((b) => b.result);
    if (!ready.length) return;
    setError(null);
    setExporting("zip");
    try {
      const res = await fetch("/api/export-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: ready.map((b) => ({ name: b.label, text: b.result!.text, format })),
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error || "No se pudo generar el ZIP.");
      }
      downloadBlob(await res.blob(), `qnotpillenai-lote-${format}.zip`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al exportar el ZIP.");
    } finally {
      setExporting(null);
    }
  };

  // Informe comparativo del lote (DOCX/PDF): resumen antes/después + extractos
  const downloadReport = async (format: "docx" | "pdf") => {
    const ready = batchItems.filter((b) => b.result);
    if (!ready.length) return;
    setError(null);
    setExporting(`report:${format}`);
    try {
      const optionsLine = [
        `intensidad ${intensity === "light" ? "ligera" : intensity === "medium" ? "media" : "profunda"}`,
        `tono ${tone === "neutral" ? "neutro" : tone === "academico" ? "académico" : tone === "tecnico" ? "técnico" : tone === "juridico" ? "jurídico" : tone}`,
        langChoice === "auto" ? "idioma: detección automática" : `idioma fijado manualmente: ${LANG_LABELS[langChoice]}`,
        useLLM ? "reescritura con IA activada" : "reescritura con IA desactivada",
        useRules ? "limpieza de frases hechas activada" : "limpieza de frases hechas desactivada",
      ].join(" · ");
      const res = await fetch("/api/export-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format,
          options: optionsLine,
          items: ready.map((b) => ({
            name: b.label,
            lang: b.result!.lang,
            beforeScore: b.result!.before.score,
            beforeLevel: b.result!.before.level,
            afterScore: b.result!.after.score,
            afterLevel: b.result!.after.level,
            mode: b.result!.mode,
            changes: b.result!.changes,
            warnings: b.result!.warnings,
            originalExcerpt: b.text.slice(0, 900),
            humanizedExcerpt: b.result!.text.slice(0, 900),
          })),
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error || "No se pudo generar el informe.");
      }
      downloadBlob(await res.blob(), `qnotpillenai-informe.${format}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al generar el informe.");
    } finally {
      setExporting(null);
    }
  };

  // ---------- render ----------

  // Opciones de reescritura: un solo bloque compartido por el modo individual y el lote
  const opcionesReescritura = (
    <>
      <div>
        <p className="mb-2 text-sm font-medium">Intensidad de la reescritura</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {(
            [
              { v: "light", t: "Ligera", d: "Pule el ritmo y quita frases hechas. Conserva casi todo el original." },
              { v: "medium", t: "Media", d: "Reescribe cada frase con otras palabras manteniendo el sentido." },
              { v: "deep", t: "Profunda", d: "Reescritura libre: reordena, fusiona y divide frases. Máxima naturalidad." },
            ] as const
          ).map((o) => (
            <button
              key={o.v}
              type="button"
              onClick={() => setIntensity(o.v)}
              className={`rounded-xl border p-3 text-left transition-all ${
                intensity === o.v
                  ? "border-primary bg-accent ring-1 ring-primary"
                  : "hover:border-primary/40 hover:bg-muted/50"
              }`}
              aria-pressed={intensity === o.v}
            >
              <span className="block text-sm font-semibold">{o.t}</span>
              <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{o.d}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-medium">Tono del texto final</p>
          <Select value={tone} onValueChange={(v) => setTone(v as Tone)}>
            <SelectTrigger aria-label="Tono">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="neutral">Neutro y claro</SelectItem>
              <SelectItem value="profesional">Profesional</SelectItem>
              <SelectItem value="academico">Académico</SelectItem>
              <SelectItem value="cercano">Cercano y conversacional</SelectItem>
              <SelectItem value="divulgativo">Divulgativo</SelectItem>
              <SelectItem value="marketing">Marketing y comercial</SelectItem>
              <SelectItem value="tecnico">Técnico</SelectItem>
              <SelectItem value="juridico">Jurídico y formal</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4 rounded-lg border px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">Reescritura con IA</p>
              <p className="text-xs text-muted-foreground">Reescribe el texto con un modelo lingüístico.</p>
            </div>
            <Switch checked={useLLM} onCheckedChange={setUseLLM} aria-label="Reescritura con IA" />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">Limpieza de frases hechas</p>
              <p className="text-xs text-muted-foreground">Sustituye muletillas típicas de IA por alternativas naturales.</p>
            </div>
            <Switch checked={useRules} onCheckedChange={setUseRules} aria-label="Limpieza de frases hechas" />
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen flex-col">
      {/* Cabecera */}
      <header className="sticky top-0 z-40 border-b bg-card/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Logo de QnoTPillenAI" className="h-10 w-10" />
            <div>
              <div className="text-base font-bold leading-tight">
                QnoTPillen<span className="text-primary">AI</span>
              </div>
              <div className="text-[11px] text-muted-foreground leading-tight">
                Humaniza Textos | Elimina Rastro de IA | Análisis Documental
              </div>
            </div>
          </div>
          <nav className="hidden items-center gap-5 text-sm font-medium text-muted-foreground md:flex">
            <a href="#funciones" className="transition-colors hover:text-foreground">
              Funciones
            </a>
            <a href="#empieza" className="transition-colors hover:text-foreground">
              Empieza
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        {/* Hero */}
        <section className="mb-10 grid items-center gap-8 lg:grid-cols-2">
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Humaniza tus Textos,
              <br className="hidden sm:block" /> Asegura tu Futuro.
            </h1>
            <p className="mt-4 max-w-xl text-muted-foreground">
              Transformamos el contenido generado por IA en <strong className="text-foreground">prosa natural e indetectable</strong>.
              Elimina cualquier rastro y optimiza tu análisis documental con QnoTPillenAI: sube un
              archivo <strong className="text-foreground">PDF, DOC o DOCX</strong> o pega tu texto directamente.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button size="lg" className="px-6 font-bold tracking-wide" onClick={() => scrollTo(inicioRef)}>
                EMPIEZA GRATIS AHORA
              </Button>
              <Badge variant="outline" className="gap-1.5 border-emerald-300 bg-emerald-50 text-emerald-800">
                <ShieldCheck className="h-3.5 w-3.5" />
                Metadatos limpios
              </Badge>
              <Badge variant="outline">ES · EN · FR · IT · PT · DE</Badge>
            </div>
          </div>
          <HeroIllustration />
        </section>

        {error && (
          <div className="mb-6 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto shrink-0 text-red-600 hover:text-red-800" aria-label="Cerrar aviso">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Funciones destacadas + entrada rápida de la landing */}
        <section id="funciones" className="mb-10 scroll-mt-24">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                Icon: BrainCircuit,
                tone: "bg-primary/10 text-primary",
                title: "Humanización inteligente",
                text: "Nuestros algoritmos reescriben tu texto con matices naturales y variaciones estilísticas, imitando la escritura humana.",
              },
              {
                Icon: ShieldCheck,
                tone: "bg-emerald-100 text-emerald-700",
                title: "Eliminación de rastro",
                text: "Limpiamos las huellas típicas de IA para que detectores como GPTZero, Originality.ai y Turnitin no reconozcan patrones automáticos.",
              },
              {
                Icon: FileSearch,
                tone: "bg-primary/10 text-primary",
                title: "Análisis documental",
                text: "Verifica la calidad y autenticidad de tus documentos, identificando patrones y mejorando la legibilidad.",
              },
            ].map(({ Icon, tone, title, text }) => (
              <div key={title} className="rounded-xl border bg-card p-5">
                <div className="flex items-center gap-3">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tone}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="text-sm font-bold uppercase tracking-tight">{title}</h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Input
              className="h-12 flex-1 bg-card"
              placeholder="Pega tu texto aquí..."
              value={quickText}
              onChange={(e) => setQuickText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") quickStart();
              }}
              aria-label="Pega tu texto aquí"
            />
            <Button size="lg" className="h-12 px-6 font-bold tracking-wide" onClick={quickStart}>
              HUMANIZAR Y VERIFICAR
            </Button>
          </div>
        </section>

        {/* Paso 1: entrada */}
        <div ref={inicioRef} id="empieza" className="scroll-mt-24">
        <Card className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">1</span>
              Añade tu texto
            </CardTitle>
            <CardDescription>
              Sube un documento o pega el texto directamente. El texto nunca se almacena: solo se procesa en memoria.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as InputMode)}>
              <TabsList className="mb-4">
                <TabsTrigger value="file" className="gap-1.5">
                  <FileUp className="h-4 w-4" /> Subir archivo
                </TabsTrigger>
                <TabsTrigger value="paste" className="gap-1.5">
                  <ClipboardPaste className="h-4 w-4" /> Pegar texto
                </TabsTrigger>
                <TabsTrigger value="batch" className="gap-1.5">
                  <Layers className="h-4 w-4" /> En lote
                </TabsTrigger>
              </TabsList>

              <TabsContent value="file">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.md"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleFile(f);
                  }}
                />
                {!fileMeta ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={onDrop}
                    className={`flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
                      dragging ? "border-primary bg-accent" : "border-border hover:border-primary/50 hover:bg-muted/50"
                    }`}
                  >
                    {extracting ? (
                      <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    ) : (
                      <FileUp className="h-10 w-10 text-primary" />
                    )}
                    <div>
                      <p className="font-medium">
                        {extracting ? "Extrayendo texto…" : "Arrastra un archivo aquí o haz clic para elegirlo"}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        PDF, DOC, DOCX o TXT · máximo 25 MB
                      </p>
                    </div>
                  </button>
                ) : (
                  <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-muted/40 px-4 py-3">
                    <FileText className="h-8 w-8 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{fileMeta.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {fileMeta.kind.toUpperCase()} · {fileMeta.words.toLocaleString("es-ES")} palabras ·{" "}
                        {fileMeta.chars.toLocaleString("es-ES")} caracteres
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={resetAll} className="gap-1.5">
                      <Trash2 className="h-3.5 w-3.5" /> Quitar
                    </Button>
                  </div>
                )}
                {fileMeta && (
                  <Textarea
                    className="mt-4 min-h-40 max-h-72 overflow-y-auto font-mono text-sm"
                    value={originalText}
                    onChange={(e) => {
                      setOriginalText(e.target.value);
                      setDetection(null);
                      setHumanized(null);
                    }}
                    aria-label="Texto extraído del documento"
                  />
                )}
              </TabsContent>

              <TabsContent value="paste">
                <Textarea
                  className="min-h-52"
                  placeholder="Pega aquí el texto que quieres analizar y humanizar…"
                  value={pasteText}
                  onChange={(e) => {
                    setPasteText(e.target.value);
                    setDetection(null);
                    setHumanized(null);
                  }}
                  aria-label="Texto pegado"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  {pasteText.trim() ? `${pasteText.trim().split(/\s+/).length.toLocaleString("es-ES")} palabras` : "Espera un resultado mejor con 100 palabras o más."}
                </p>
              </TabsContent>

              <TabsContent value="batch">
                <input
                  ref={batchInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt,.md"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.length) addBatchFiles(e.target.files);
                    if (batchInputRef.current) batchInputRef.current.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => batchInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    if (e.dataTransfer.files?.length) addBatchFiles(e.dataTransfer.files);
                  }}
                  disabled={batchRunning}
                  className={`flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors disabled:opacity-60 ${
                    dragging ? "border-primary bg-accent" : "border-border hover:border-primary/50 hover:bg-muted/50"
                  }`}
                >
                  <Layers className="h-10 w-10 text-primary" />
                  <div>
                    <p className="font-medium">Arrastra varios archivos o haz clic para elegirlos</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      PDF, DOC, DOCX o TXT · hasta 12 elementos (archivos o textos pegados) · se procesan uno a uno
                    </p>
                  </div>
                </button>

                {/* Añadir un texto pegado al lote */}
                <div className="mt-4 rounded-xl border bg-muted/20 p-4">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <ClipboardPaste className="h-4 w-4 text-primary" />
                    …o pega un texto y añádelo al lote
                  </p>
                  <Input
                    className="mt-3"
                    placeholder="Nombre del texto (opcional): p. ej. «Capítulo 3»"
                    value={batchPasteLabel}
                    maxLength={80}
                    onChange={(e) => setBatchPasteLabel(e.target.value)}
                    disabled={batchRunning}
                    aria-label="Nombre del texto pegado"
                  />
                  <Textarea
                    className="mt-2 min-h-28"
                    placeholder="Pega aquí el texto… (mínimo ~40 caracteres)"
                    value={batchPasteText}
                    onChange={(e) => setBatchPasteText(e.target.value)}
                    disabled={batchRunning}
                    aria-label="Texto para añadir al lote"
                  />
                  <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                      {batchPasteText.trim()
                        ? `${batchPasteText.trim().split(/\s+/).length.toLocaleString("es-ES")} palabras`
                        : "Cada texto se procesa junto a los archivos con las mismas opciones."}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addBatchPaste}
                      disabled={batchRunning || batchPasteText.trim().length < 40 || batchItems.length >= 12}
                      className="gap-1.5"
                    >
                      <Layers className="h-3.5 w-3.5" />
                      Añadir al lote ({batchItems.length}/12)
                    </Button>
                  </div>
                </div>

                {/* Opciones de reescritura del lote */}
                <div className="mt-4 rounded-xl border p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Opciones de reescritura
                  </p>
                  <p className="mb-4 mt-0.5 text-xs text-muted-foreground">
                    Se aplican a todos los elementos del lote.
                  </p>
                  <div className="space-y-5">
                    {opcionesReescritura}
                  </div>
                </div>

                {batchItems.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {batchItems.map((b, i) => (
                      <div key={`${b.label}-${i}`} className="space-y-2">
                      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-muted/30 px-3 py-2.5">
                        {b.status === "extrayendo" || (batchRunning && b.status === "pendiente") ? (
                          <Loader2 className="h-6 w-6 shrink-0 animate-spin text-primary" />
                        ) : b.status === "error" ? (
                          <AlertTriangle className="h-6 w-6 shrink-0 text-red-600" />
                        ) : b.result ? (
                          <Check className="h-6 w-6 shrink-0 text-emerald-600" />
                        ) : !b.file ? (
                          <ClipboardPaste className="h-6 w-6 shrink-0 text-primary" />
                        ) : (
                          <FileText className="h-6 w-6 shrink-0 text-muted-foreground" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{b.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {b.file
                              ? `${(b.file.size / 1024).toFixed(0)} KB · ${b.detail}`
                              : `${b.text.trim().split(/\s+/).length.toLocaleString("es-ES")} palabras · ${b.detail}`}
                          </p>
                        </div>
                        {b.result && (
                          <>
                            <Badge variant="outline" className="gap-1">
                              antes {b.result.before.score}% → ahora {b.result.after.score}%
                            </Badge>
                            <span className="text-xs text-muted-foreground">{LANG_LABELS[b.result.lang]}</span>
                            <div className="flex gap-1">
                              {(["docx", "pdf", "txt"] as const).map((fmt) => (
                                <Button
                                  key={fmt}
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2 text-xs"
                                  onClick={() => void downloadBatchFile(b, fmt)}
                                  disabled={exporting !== null}
                                >
                                  {exporting === `batch:${b.label}:${fmt}` ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Download className="h-3 w-3" />
                                  )}
                                  {fmt.toUpperCase()}
                                </Button>
                              ))}
                            </div>
                          </>
                        )}
                        {!b.file && editingIdx !== i && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-muted-foreground"
                            onClick={() => startEditItem(i)}
                            disabled={batchRunning}
                            aria-label={`Editar ${b.label}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-muted-foreground"
                          onClick={() => removeBatchItem(i)}
                          disabled={batchRunning}
                          aria-label={`Quitar ${b.label}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      {editingIdx === i && !b.file && (
                        <div className="rounded-xl border border-primary/40 bg-accent/30 p-3">
                          <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                            <Pencil className="h-4 w-4 text-primary" />
                            Editar «{batchItems[i]?.label}»
                          </p>
                          <Input
                            value={editLabel}
                            maxLength={80}
                            onChange={(e) => setEditLabel(e.target.value)}
                            placeholder="Nombre del texto"
                            disabled={batchRunning}
                            aria-label="Nombre del texto en edición"
                          />
                          <Textarea
                            className="mt-2 min-h-32 font-mono text-sm"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            disabled={batchRunning}
                            aria-label="Texto en edición"
                          />
                          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs text-muted-foreground">
                              {editText.trim()
                                ? `${editText.trim().split(/\s+/).length.toLocaleString("es-ES")} palabras`
                                : "Sin cambios aún"}
                            </span>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={cancelEditItem} disabled={batchRunning}>
                                Cancelar
                              </Button>
                              <Button
                                size="sm"
                                onClick={saveEditItem}
                                disabled={batchRunning || editText.trim().length < 40}
                                className="gap-1.5"
                              >
                                <Check className="h-3.5 w-3.5" /> Guardar
                              </Button>
                            </div>
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">
                            Al guardar, el elemento vuelve a «pendiente»: procesa el lote de nuevo para actualizar su resultado.
                          </p>
                        </div>
                      )}
                      </div>
                    ))}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <Button variant="outline" size="sm" onClick={() => setBatchItems([])} disabled={batchRunning} className="gap-1.5">
                        <Trash2 className="h-3.5 w-3.5" /> Vaciar lista
                      </Button>
                      <Button onClick={processBatch} disabled={batchRunning || batchItems.length === 0} className="gap-2">
                        {batchRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        {batchRunning ? "Procesando lote…" : `Procesar lote (${batchItems.length})`}
                      </Button>
                    </div>
                  </div>
                )}

                {batchStatus && (
                  <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> {batchStatus}
                  </p>
                )}

                {batchItems.some((b) => b.result) && !batchRunning && (
                  <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                    <span className="mr-auto text-xs text-muted-foreground">Descargar todo en ZIP:</span>
                    {(["docx", "pdf", "txt"] as const).map((fmt) => (
                      <Button
                        key={fmt}
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => void downloadBatchZip(fmt)}
                        disabled={exporting !== null}
                      >
                        {exporting === "zip" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
                        {fmt.toUpperCase()}
                      </Button>
                    ))}
                  </div>
                )}
                {batchItems.some((b) => b.result) && !batchRunning && (
                  <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
                    <span className="mr-auto text-xs text-muted-foreground">Informe comparativo del lote:</span>
                    {(["docx", "pdf"] as const).map((fmt) => (
                      <Button
                        key={fmt}
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => void downloadReport(fmt)}
                        disabled={exporting !== null}
                      >
                        {exporting === `report:${fmt}` ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <FileDown className="h-3.5 w-3.5" />
                        )}
                        Informe {fmt.toUpperCase()}
                      </Button>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <div className="mt-4 flex flex-wrap items-stretch justify-between gap-3">
              <div className="flex min-w-56 flex-1 flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Idioma del texto</p>
                  <p className="text-xs text-muted-foreground">
                    Automático por defecto; fíjalo si el detector se equivoca.
                  </p>
                </div>
                <Select value={langChoice} onValueChange={changeLang}>
                  <SelectTrigger className="w-44" aria-label="Idioma del texto">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Detección automática</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="it">Italiano</SelectItem>
                    <SelectItem value="pt">Português</SelectItem>
                    <SelectItem value="de">Deutsch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex min-w-64 flex-1 flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Análisis semántico con IA</p>
                  <p className="text-xs text-muted-foreground">
                    Un modelo de lenguaje evalúa previsibilidad, uniformidad y voz. Más preciso, tarda unos segundos más.
                  </p>
                </div>
                <Switch checked={semantic} onCheckedChange={setSemantic} aria-label="Análisis semántico con IA" />
              </div>
              <Button onClick={() => void analyze()} disabled={!canAnalyze} className="gap-2 self-center">
                {detecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
                {detecting ? "Analizando…" : "Analizar texto"}
              </Button>
            </div>
          </CardContent>
        </Card>
        </div>

        {/* Paso 2: detección */}
        <div ref={analysisRef} className="scroll-mt-24">
          {detection && (
            <Card className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">2</span>
                  Resultado de la detección
                </CardTitle>
                <CardDescription>{detection.summary}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-[220px_1fr]">
                  <div className="flex flex-col items-center gap-3">
                    <Gauge value={detection.score} />
                    <Badge variant="outline" className={`px-3 py-1 text-sm font-semibold ${levelBadgeClass(detection.levelKey)}`}>
                      {detection.level}
                    </Badge>
                    {detection.semantic === false && (
                      <p className="max-w-56 text-center text-[11px] leading-snug text-muted-foreground">
                        El análisis semántico no estuvo disponible en este momento; resultado basado solo en las heurísticas de estilo.
                      </p>
                    )}
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                      <StatTile label="Palabras" value={detection.stats.words.toLocaleString("es-ES")} />
                      <StatTile label="Frases" value={String(detection.stats.sentences)} />
                      <StatTile label="Párrafos" value={String(detection.stats.paragraphs)} />
                      <StatTile label="Palabras/frase" value={String(detection.stats.avgSentence)} />
                      <StatTile label="Variabilidad" value={`${detection.stats.sentenceVariance}%`} />
                    </div>
                    <Separator />
                    <div className="grid gap-4 sm:grid-cols-2">
                      {detection.indicators.map((ind) => (
                        <IndicatorBar key={ind.key} label={ind.label} score={ind.score} detail={ind.detail} />
                      ))}
                    </div>
                  </div>
                </div>

                {(detection.flagged.length > 0 || detection.clichesFound.length > 0) && (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {detection.clichesFound.length > 0 && (
                      <div className="rounded-lg border bg-muted/30 p-4">
                        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                          <MessageSquareWarning className="h-4 w-4 text-amber-600" />
                          Frases hechas detectadas
                        </h4>
                        <div className="flex max-h-44 flex-wrap gap-2 overflow-y-auto">
                          {detection.clichesFound.map((c) => (
                            <Badge key={c.phrase} variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
                              «{c.phrase}» ×{c.count}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {detection.flagged.length > 0 && (
                      <div className="rounded-lg border bg-muted/30 p-4">
                        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                          <ScanSearch className="h-4 w-4 text-primary" />
                          Frases sospechosas
                        </h4>
                        <ul className="max-h-44 space-y-2 overflow-y-auto pr-1">
                          {detection.flagged.map((f, i) => (
                            <li key={i} className="text-xs leading-relaxed">
                              <span className="font-medium text-foreground">“{f.sentence}”</span>
                              <span className="ml-1 text-muted-foreground">— {f.reason}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Paso 3: humanizar */}
        <div>
          {detection && inputMode !== "batch" && (
            <Card className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">3</span>
                  Humanizar el texto
                </CardTitle>
                <CardDescription>
                  Reescribe el texto con ritmo, vocabulario y estructura de escritura humana, y limpia
                  las huellas típicas de IA.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {opcionesReescritura}

                <div className="flex flex-col items-end gap-3">
                  {humanizing && (
                    <p className="text-xs text-muted-foreground">
                      {hProgress && hProgress.total > 0
                        ? `Reescribiendo el texto… fragmento ${hProgress.done} de ${hProgress.total}.`
                        : "Preparando la reescritura…"}
                    </p>
                  )}
                  {!humanizing && workingText.trim().length > 40000 && (
                    <p className="text-xs text-muted-foreground">
                      Tu texto es largo ({workingText.length.toLocaleString("es-ES")} caracteres): el
                      proceso puede tardar más de un minuto. Verás el progreso fragmento a fragmento.
                    </p>
                  )}
                  <Button onClick={humanize} disabled={humanizing} size="lg" className="gap-2">
                    {humanizing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                    {humanizing ? "Humanizando…" : "Humanizar texto"}
                  </Button>
                </div>

                {humanized?.warnings && humanized.warnings.length > 0 && (
                  <div className="space-y-1 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    {humanized.warnings.map((w, i) => (
                      <p key={i} className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {w}
                      </p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Paso 4: resultado */}
        <div ref={resultRef} className="scroll-mt-24">
          {humanized && (
            <Card className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">4</span>
                  Texto humanizado
                </CardTitle>
                <CardDescription>
                  Compara el resultado, edítalo si quieres y descárgalo en el formato que necesites.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Comparativa de puntuaciones */}
                {afterDetect && (
                  <div className="flex flex-wrap items-center justify-center gap-4 rounded-xl border bg-muted/30 p-5 sm:justify-between sm:px-8">
                    <div className="text-center">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Antes</p>
                      <p className="text-3xl font-bold" style={{ color: scoreHex(detection?.score ?? 0) }}>
                        {detection?.score ?? "—"}%
                      </p>
                      <p className="text-xs text-muted-foreground">probabilidad IA</p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <RefreshCw className="h-5 w-5 rotate-90 text-primary" />
                    </div>
                    <div className="text-center">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Después</p>
                      <p className="text-3xl font-bold" style={{ color: scoreHex(afterDetect.score) }}>
                        {afterDetect.score}%
                      </p>
                      <Badge variant="outline" className={`mt-1 ${levelBadgeClass(afterDetect.levelKey)}`}>
                        {afterDetect.level}
                      </Badge>
                    </div>
                    <div className="w-full sm:w-auto">
                      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                        <span>Reducción estimada</span>
                        <span className="font-semibold text-emerald-700">
                          −{Math.max(0, (detection?.score ?? 0) - afterDetect.score)} puntos
                        </span>
                      </div>
                      <div className="h-2 w-56 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-emerald-600 transition-all duration-700"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round(
                                (Math.max(0, (detection?.score ?? 0) - afterDetect.score) /
                                  Math.max(1, detection?.score ?? 1)) *
                                  100
                              )
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Textos */}
                <Tabs defaultValue="humanized">
                  <TabsList>
                    <TabsTrigger value="humanized">Texto humanizado</TabsTrigger>
                    <TabsTrigger value="original">Original</TabsTrigger>
                  </TabsList>
                  <TabsContent value="humanized" className="mt-3 space-y-3">
                    <Textarea
                      className="min-h-64 font-mono text-sm leading-relaxed"
                      value={humanizedText}
                      onChange={(e) => setHumanizedText(e.target.value)}
                      aria-label="Texto humanizado editable"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="mr-auto text-xs text-muted-foreground">
                        {humanizedText.trim() ? `${humanizedText.trim().split(/\s+/).length.toLocaleString("es-ES")} palabras` : "0 palabras"}
                        {humanized.mode === "llm" && " · reescrito con IA"}
                        {humanized.mode === "mixed" && " · IA + reglas de limpieza"}
                        {humanized.mode === "rules" && " · reglas de limpieza"}
                      </span>
                      <Button variant="outline" size="sm" onClick={copyResult} className="gap-1.5">
                        {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                        {copied ? "Copiado" : "Copiar"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={reanalyze} disabled={reanalyzing} className="gap-1.5">
                        {reanalyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                        Reanalizar
                      </Button>
                    </div>
                  </TabsContent>
                  <TabsContent value="original" className="mt-3">
                    <div className="max-h-80 overflow-y-auto whitespace-pre-wrap rounded-lg border bg-muted/30 p-4 text-sm leading-relaxed text-muted-foreground">
                      {workingText}
                    </div>
                  </TabsContent>
                </Tabs>

                {/* Descargas */}
                <Separator />
                <div>
                  <div className="mb-3 flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <p>
                      <strong>Archivos generados desde cero:</strong> el documento exportado no conserva
                      metadatos del original (autor, programa, historial de revisiones ni marcas de
                      herramientas de IA). Se crea limpio, como si lo hubieras escrito tú.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => download("docx")} disabled={exporting !== null} className="gap-2">
                      {exporting === "docx" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                      Descargar DOCX
                    </Button>
                    <Button onClick={() => download("pdf")} disabled={exporting !== null} variant="outline" className="gap-2">
                      {exporting === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                      Descargar PDF
                    </Button>
                    <Button onClick={() => download("txt")} disabled={exporting !== null} variant="outline" className="gap-2">
                      {exporting === "txt" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                      Descargar TXT
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Pie */}
      <footer className="mt-auto border-t bg-card">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
            <img src="/logo.png" alt="" className="h-6 w-6" />
            <span className="font-semibold">QnoTPillenAI</span>
            <span className="text-muted-foreground">
              · © {new Date().getFullYear()} · Humaniza Textos | Elimina Rastro de IA | Análisis Documental
            </span>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            <strong className="text-foreground">Uso responsable:</strong> el análisis de detección es una
            estimación que combina heurísticas de estilo (ritmo, muletillas, estructura) y, si lo activas,
            un análisis semántico con un modelo de lenguaje; no equivale a un veredicto de ningún detector
            comercial, y ningún método puede garantizar un resultado concreto frente a todas las
            herramientas existentes (los detectores comerciales también discrepan entre sí y dan falsos
            positivos). Usa esta aplicación para mejorar la naturalidad de tus textos y respeta siempre las
            normas de tu centro, empresa o plataforma. Los textos se procesan en memoria y no se almacenan.
          </p>
        </div>
      </footer>
    </div>
  );
}
