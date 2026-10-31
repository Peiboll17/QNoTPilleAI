import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

// Informe comparativo del lote: resume antes/después de cada elemento y añade
// un detalle por elemento con extractos del original y del texto humanizado.
// Se genera desde cero, sin metadatos (igual que las exportaciones normales).

const LANG_LABELS: Record<string, string> = {
  es: "español",
  en: "inglés",
  fr: "francés",
  it: "italiano",
  pt: "portugués",
  de: "alemán",
};

const MODE_LABELS: Record<string, string> = {
  llm: "reescritura con IA",
  mixed: "IA + reglas de limpieza",
  rules: "reglas de limpieza",
};

interface ReportItem {
  name: string;
  lang?: string;
  beforeScore?: number;
  beforeLevel?: string;
  afterScore?: number;
  afterLevel?: string;
  mode?: string;
  changes?: number;
  warnings?: string[];
  originalExcerpt?: string;
  humanizedExcerpt?: string;
}

const MAX_ITEMS = 12;
const MAX_EXCERPT = 1500;

function clampInt(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : fallback;
}

function cut(s: unknown, max: number): string {
  if (typeof s !== "string") return "";
  const t = s.trim();
  if (t.length <= max) return t;
  return t.slice(0, max) + " […]";
}

function langLabel(lang?: string): string {
  return LANG_LABELS[lang ?? ""] ?? (lang || "—");
}

function modeLabel(mode?: string): string {
  return MODE_LABELS[mode ?? ""] ?? "—";
}

function parseItems(body: Record<string, unknown>): ReportItem[] {
  const raw = Array.isArray(body?.items) ? body.items : [];
  return raw.slice(0, MAX_ITEMS).map((x) => {
    const o = (x ?? {}) as Record<string, unknown>;
    return {
      name: cut(o.name, 120) || "Elemento",
      lang: typeof o.lang === "string" ? o.lang : undefined,
      beforeScore: clampInt(o.beforeScore),
      beforeLevel: cut(o.beforeLevel, 120),
      afterScore: clampInt(o.afterScore),
      afterLevel: cut(o.afterLevel, 120),
      mode: typeof o.mode === "string" ? o.mode : undefined,
      changes: Number.isFinite(Number(o.changes)) ? Math.max(0, Math.round(Number(o.changes))) : 0,
      warnings: Array.isArray(o.warnings)
        ? (o.warnings as unknown[]).filter((w): w is string => typeof w === "string").slice(0, 5).map((w) => cut(w, 300))
        : [],
      originalExcerpt: cut(o.originalExcerpt, MAX_EXCERPT),
      humanizedExcerpt: cut(o.humanizedExcerpt, MAX_EXCERPT),
    };
  });
}

// ---------- DOCX ----------

async function buildDocxReport(
  items: ReportItem[],
  optionsLine: string
): Promise<Buffer> {
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    Table,
    TableRow,
    TableCell,
    WidthType,
  } = await import("docx");

  const cell = (text: string, bold = false) =>
    new TableCell({
      children: [
        new Paragraph({ children: [new TextRun({ text, bold, size: 20, font: "Calibri" })] }),
      ],
    });

  const heading = (text: string, size: number, after = 160) =>
    new Paragraph({
      children: [new TextRun({ text, bold: true, size, font: "Calibri" })],
      spacing: { before: 240, after },
    });

  const body = (text: string, opts: { italics?: boolean; color?: string; after?: number } = {}) =>
    new Paragraph({
      children: [
        new TextRun({
          text,
          size: 22,
          font: "Calibri",
          italics: opts.italics ?? false,
          color: opts.color,
        }),
      ],
      spacing: { after: opts.after ?? 140 },
      alignment: "both",
    });

  const fecha = new Date().toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const children: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] = [
    new Paragraph({
      children: [new TextRun({ text: "Informe comparativo de humanización", bold: true, size: 40, font: "Calibri" })],
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `QnoTPillenAI · ${fecha}`, size: 20, font: "Calibri", color: "6B7280" })],
      spacing: { after: 160 },
    }),
    body(optionsLine, { color: "374151" }),
    body(
      "Este informe resume el resultado de la humanización por lotes: la probabilidad estimada de IA de cada elemento antes y después de reescribirlo, junto con un extracto del original y del texto final.",
      { color: "4B5563" }
    ),
    heading("Resumen del lote", 28),
  ];

  const header = new TableRow({
    tableHeader: true,
    children: [
      cell("Elemento", true),
      cell("Idioma", true),
      cell("Antes (%)", true),
      cell("Después (%)", true),
      cell("Diferencia", true),
    ],
  });
  const rows = items.map((it) => {
    const d = (it.beforeScore ?? 0) - (it.afterScore ?? 0);
    const diff = d > 0 ? `-${d}` : d < 0 ? `+${Math.abs(d)}` : "0";
    return new TableRow({
      children: [
        cell(it.name),
        cell(langLabel(it.lang)),
        cell(String(it.beforeScore ?? "—")),
        cell(String(it.afterScore ?? "—")),
        cell(diff),
      ],
    });
  });

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [header, ...rows],
    })
  );

  children.push(heading("Detalle por elemento", 28));
  items.forEach((it, i) => {
    const d = (it.beforeScore ?? 0) - (it.afterScore ?? 0);
    children.push(
      heading(`${i + 1}. ${it.name}`, 24, 80),
      body(
        `Idioma: ${langLabel(it.lang)} · Probabilidad de IA: ${it.beforeScore ?? "—"}%${
          it.beforeLevel ? ` (${it.beforeLevel})` : ""
        } → ${it.afterScore ?? "—"}%${it.afterLevel ? ` (${it.afterLevel})` : ""}.`,
        { color: "374151" }
      ),
      body(
        `Reducción: ${d > 0 ? `${d} puntos` : d < 0 ? `subida de ${Math.abs(d)} puntos` : "sin cambios"} · Método: ${modeLabel(it.mode)} · Cambios aplicados: ${it.changes ?? 0}.`,
        { color: "374151" }
      )
    );
    if (it.warnings?.length) {
      children.push(body(`Avisos: ${it.warnings.join(" ")}`, { color: "92400E" }));
    }
    if (it.originalExcerpt) {
      children.push(body("Original (extracto):", { after: 40 }));
      children.push(body(`«${it.originalExcerpt}»`, { italics: true, color: "6B7280" }));
    }
    if (it.humanizedExcerpt) {
      children.push(body("Humanizado (extracto):", { after: 40 }));
      children.push(body(`«${it.humanizedExcerpt}»`, { italics: true, color: "6B7280" }));
    }
  });

  children.push(
    heading("Nota", 24, 80),
    body(
      "Las puntuaciones son estimaciones calculadas por QnoTPillenAI (heurísticas de estilo y análisis semántico); no equivalen al veredicto de ningún detector comercial. Los documentos de este informe se han generado desde cero y no contienen metadatos de herramientas de IA.",
      { color: "6B7280" }
    )
  );

  const doc = new Document({
    creator: "",
    title: "",
    description: "",
    subject: "",
    keywords: "",
    sections: [{ properties: {}, children }],
  });
  const buf = await Packer.toBuffer(doc);
  return Buffer.from(buf);
}

// ---------- PDF ----------

async function buildPdfReport(
  items: ReportItem[],
  optionsLine: string
): Promise<Buffer> {
  const PDFDocument = (await import("pdfkit")).default;
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 64, bottom: 64, left: 64, right: 64 },
    info: {},
  });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  const fecha = new Date().toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const CONTENT_W = 595 - 64 - 64; // A4 ancho menos márgenes

  doc.font("Helvetica-Bold").fontSize(17).fillColor("#111827");
  doc.text("Informe comparativo de humanización");
  doc.moveDown(0.2);
  doc.font("Helvetica").fontSize(10).fillColor("#6B7280");
  doc.text(`QnoTPillenAI · ${fecha}`);
  doc.moveDown(0.8);
  doc.font("Helvetica").fontSize(9.5).fillColor("#374151");
  doc.text(optionsLine, { width: CONTENT_W });
  doc.moveDown(0.3);
  doc.font("Helvetica").fontSize(9.5).fillColor("#4B5563");
  doc.text(
    "Este informe resume el resultado de la humanización por lotes: la probabilidad estimada de IA de cada elemento antes y después de reescribirlo, junto con un extracto del original y del texto final.",
    { width: CONTENT_W }
  );
  doc.moveDown(1);

  // ---- tabla resumen (fuente monoespaciada para columnas alineadas) ----
  doc.font("Helvetica-Bold").fontSize(12).fillColor("#111827");
  doc.text("Resumen del lote");
  doc.moveDown(0.4);

  const COLS = [
    { x: 64, w: 226, title: "Elemento" },
    { x: 294, w: 78, title: "Idioma" },
    { x: 376, w: 62, title: "Antes" },
    { x: 442, w: 70, title: "Después" },
    { x: 516, w: 15, title: "Dif." },
  ];
  const rowH = 15;

  doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#111827");
  for (const c of COLS) doc.text(c.title, c.x, doc.y, { width: c.w, lineBreak: false });
  doc.moveDown(0.5);
  doc.font("Courier").fontSize(8).fillColor("#111827");
  for (const it of items) {
    const y = doc.y;
    const d = (it.beforeScore ?? 0) - (it.afterScore ?? 0);
    const diff = d > 0 ? `-${d}` : d < 0 ? `+${Math.abs(d)}` : "0";
    const cells = [
      it.name.length > 38 ? it.name.slice(0, 37) + "…" : it.name,
      langLabel(it.lang).length > 12 ? langLabel(it.lang).slice(0, 11) + "…" : langLabel(it.lang),
      String(it.beforeScore ?? "—"),
      String(it.afterScore ?? "—"),
      diff,
    ];
    cells.forEach((txt, i) => doc.text(txt, COLS[i].x, y, { width: COLS[i].w, lineBreak: false }));
    doc.text("", 64, y + rowH); // siguiente fila
    doc.moveTo(64, doc.y - 3).lineTo(531, doc.y - 3).lineWidth(0.4).strokeColor("#E5E7EB").stroke();
  }
  doc.moveDown(1.2);

  // ---- detalle ----
  doc.font("Helvetica-Bold").fontSize(12).fillColor("#111827");
  doc.text("Detalle por elemento");
  doc.moveDown(0.4);

  items.forEach((it, i) => {
    // evitar corte a mitad de bloque: si queda poco espacio, página nueva
    if (doc.y > 640) doc.addPage();
    const d = (it.beforeScore ?? 0) - (it.afterScore ?? 0);
    doc.font("Helvetica-Bold").fontSize(10.5).fillColor("#111827");
    doc.text(`${i + 1}. ${it.name}`, { width: CONTENT_W });
    doc.moveDown(0.15);
    doc.font("Helvetica").fontSize(9).fillColor("#374151");
    doc.text(
      `Idioma: ${langLabel(it.lang)} · Probabilidad de IA: ${it.beforeScore ?? "—"}%${
        it.beforeLevel ? ` (${it.beforeLevel})` : ""
      } → ${it.afterScore ?? "—"}%${it.afterLevel ? ` (${it.afterLevel})` : ""}`,
      { width: CONTENT_W }
    );
    doc.text(
      `Reducción: ${d > 0 ? `${d} puntos` : d < 0 ? `subida de ${Math.abs(d)} puntos` : "sin cambios"} · Método: ${modeLabel(it.mode)} · Cambios aplicados: ${it.changes ?? 0}.`,
      { width: CONTENT_W }
    );
    if (it.warnings?.length) {
      doc.fillColor("#92400E").text(`Avisos: ${it.warnings.join(" ")}`, { width: CONTENT_W });
      doc.fillColor("#374151");
    }
    if (it.originalExcerpt) {
      doc.moveDown(0.15);
      doc.font("Helvetica-Bold").fontSize(9).fillColor("#111827");
      doc.text("Original (extracto):", { width: CONTENT_W });
      doc.font("Helvetica-Oblique").fontSize(8.5).fillColor("#6B7280");
      doc.text(`"${it.originalExcerpt}"`, { width: CONTENT_W });
    }
    if (it.humanizedExcerpt) {
      doc.moveDown(0.15);
      doc.font("Helvetica-Bold").fontSize(9).fillColor("#111827");
      doc.text("Humanizado (extracto):", { width: CONTENT_W });
      doc.font("Helvetica-Oblique").fontSize(8.5).fillColor("#6B7280");
      doc.text(`"${it.humanizedExcerpt}"`, { width: CONTENT_W });
    }
    doc.moveDown(0.8);
  });

  if (doc.y > 680) doc.addPage();
  doc.font("Helvetica").fontSize(8.5).fillColor("#6B7280");
  doc.text(
    "Nota: las puntuaciones son estimaciones calculadas por QnoTPillenAI (heurísticas de estilo y análisis semántico); no equivalen al veredicto de ningún detector comercial. Los documentos de este informe se han generado desde cero y no contienen metadatos de herramientas de IA.",
    { width: CONTENT_W }
  );

  doc.end();
  return done;
}

// POST: genera el informe comparativo del lote
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const items = parseItems(body);
    if (items.length === 0) {
      return NextResponse.json(
        { error: "No hay resultados del lote para incluir en el informe." },
        { status: 400 }
      );
    }
    const format = body?.format === "pdf" ? "pdf" : "docx";
    const optionsLine =
      typeof body?.options === "string" && body.options.trim()
        ? `Opciones aplicadas al lote: ${cut(body.options, 300)}.`
        : "Opciones aplicadas al lote: las seleccionadas en la aplicación.";

    const buffer =
      format === "pdf" ? await buildPdfReport(items, optionsLine) : await buildDocxReport(items, optionsLine);
    const mime =
      format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `attachment; filename="qnotpillenai-informe.${format}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "No se pudo generar el informe.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
