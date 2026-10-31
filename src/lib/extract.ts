export interface ExtractResult {
  text: string;
  meta: {
    kind: "pdf" | "doc" | "docx" | "txt";
    pages?: number;
    chars: number;
    words: number;
  };
}

function countWords(text: string): number {
  const m = text.trim().match(/[\p{L}\p{N}]+/gu);
  return m ? m.length : 0;
}

/** Limpia el texto extraído: separadores de página, espacios repetidos, saltos extraños */
function cleanText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/\u00ad/g, "") // guiones blandos
    .replace(/(\p{L})-\n(\p{Ll})/gu, "$1$2") // palabras cortadas por guion de línea
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extractPdf(buffer: Buffer): Promise<{ text: string; pages?: number }> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    // distintas versiones de pdf-parse exponen el total de páginas en sitios distintos
    const loose = result as { pages?: { total?: number }; total?: number };
    return { text: result.text, pages: loose.pages?.total ?? loose.total ?? undefined };
  } finally {
    await parser.destroy().catch(() => {});
  }
}

async function extractDocx(buffer: Buffer): Promise<{ text: string }> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return { text: result.value };
}

async function extractDoc(buffer: Buffer): Promise<{ text: string }> {
  const WordExtractor = (await import("word-extractor")).default;
  const extractor = new WordExtractor();
  const doc = await extractor.extract(buffer);
  const body = doc.getBody() || "";
  const footnotes = doc.getFootnotes() || "";
  const text = [body, footnotes !== body ? footnotes : ""].filter(Boolean).join("\n\n");
  return { text };
}

export async function extractText(
  buffer: Buffer,
  filename: string
): Promise<ExtractResult> {
  const ext = filename.toLowerCase().split(".").pop() || "";
  let kind: ExtractResult["meta"]["kind"];
  let text = "";

  if (ext === "pdf" || buffer.subarray(0, 4).toString() === "%PDF") {
    kind = "pdf";
    const r = await extractPdf(buffer);
    text = r.text;
  } else if (ext === "docx") {
    kind = "docx";
    const r = await extractDocx(buffer);
    text = r.text;
  } else if (ext === "doc") {
    kind = "doc";
    const r = await extractDoc(buffer);
    text = r.text;
  } else if (ext === "txt" || ext === "md") {
    kind = "txt";
    text = buffer.toString("utf8");
  } else {
    // Intento por firma
    if (buffer.subarray(0, 2).toString("hex") === "504b") {
      kind = "docx";
      const r = await extractDocx(buffer);
      text = r.text;
    } else if (buffer.subarray(0, 8).toString("hex") === "d0cf11e0a1b11ae1") {
      kind = "doc";
      const r = await extractDoc(buffer);
      text = r.text;
    } else {
      kind = "txt";
      text = buffer.toString("utf8");
    }
  }

  text = cleanText(text);
  if (!text || countWords(text) < 10) {
    throw new Error(
      "No se pudo extraer texto legible del archivo (¿es un PDF escaneado/sin texto?)."
    );
  }

  return {
    text,
    meta: { kind, chars: text.length, words: countWords(text) },
  };
}
