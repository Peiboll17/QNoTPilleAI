import type { ExportRequest } from "./shared-types";

// Exportación de documentos "desde cero": los archivos generados no contienen
// rastros de metadatos de herramientas de IA (sin historial, sin autor original,
// sin generador previo). El creador se deja en blanco a propósito.

export async function buildDocx(text: string): Promise<Buffer> {
  const { Document, Packer, Paragraph, TextRun } = await import("docx");
  const paras = text
    .replace(/\r\n?/g, "\n")
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const doc = new Document({
    creator: "",
    title: "",
    description: "",
    subject: "",
    keywords: "",
    sections: [
      {
        properties: {},
        children: paras.map(
          (p) =>
            new Paragraph({
              children: [new TextRun({ text: p, size: 24, font: "Calibri" })],
              spacing: { after: 200, line: 340 },
              alignment: "both",
            })
        ),
      },
    ],
  });

  const buf = await Packer.toBuffer(doc);
  return Buffer.from(buf);
}

export async function buildPdf(text: string): Promise<Buffer> {
  const PDFDocument = (await import("pdfkit")).default;
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 64, bottom: 64, left: 64, right: 64 },
    info: {}, // sin metadatos de autor/creador
  });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));

  const done = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  doc.font("Helvetica").fontSize(11).lineGap(4.5);

  const paras = text
    .replace(/\r\n?/g, "\n")
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  paras.forEach((p, i) => {
    doc.text(p, { align: "justify" });
    if (i < paras.length - 1) doc.moveDown(0.8);
  });

  doc.end();
  return done;
}

export function buildTxt(text: string): Buffer {
  return Buffer.from(text.replace(/\r\n?/g, "\n"), "utf8");
}

export async function buildExport(req: ExportRequest): Promise<{ buffer: Buffer; mime: string; ext: string }> {
  switch (req.format) {
    case "docx":
      return { buffer: await buildDocx(req.text), mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ext: "docx" };
    case "pdf":
      return { buffer: await buildPdf(req.text), mime: "application/pdf", ext: "pdf" };
    default:
      return { buffer: buildTxt(req.text), mime: "text/plain;charset=utf-8", ext: "txt" };
  }
}

export function outputFileName(original: string, ext: string): string {
  const base = (original || "texto").replace(/\.[A-Za-z0-9]+$/, "").replace(/[^\p{L}\p{N} _-]/gu, "").trim() || "texto";
  return `${base}_humanizado.${ext}`;
}
