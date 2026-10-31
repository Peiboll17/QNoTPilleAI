import { NextRequest, NextResponse } from "next/server";
import { buildExport, outputFileName } from "@/lib/exporters";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_FILES = 12;

interface ZipEntry {
  name: string;
  text: string;
  format: "docx" | "pdf" | "txt";
}

// POST: genera un ZIP con todos los textos humanizados del lote
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const raw = Array.isArray(body?.files) ? body.files : [];
    if (raw.length === 0) {
      return NextResponse.json({ error: "No hay archivos para exportar." }, { status: 400 });
    }
    const entries: ZipEntry[] = [];
    for (const f of raw.slice(0, MAX_FILES)) {
      const text = typeof f?.text === "string" ? f.text.trim() : "";
      if (!text) continue;
      entries.push({
        name: typeof f?.name === "string" && f.name.trim() ? f.name.trim() : "documento",
        text: text.slice(0, 300000),
        format: ["docx", "pdf", "txt"].includes(f?.format) ? f.format : "docx",
      });
    }
    if (entries.length === 0) {
      return NextResponse.json({ error: "No hay contenido para exportar." }, { status: 400 });
    }

    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    const used = new Set<string>();
    for (const e of entries) {
      const { buffer } = await buildExport({
        text: e.text,
        format: e.format,
        fileName: e.name,
      });
      let name = outputFileName(e.name, e.format);
      // evitar colisiones dentro del ZIP
      let n = 2;
      while (used.has(name)) {
        name = name.replace(/(\.\w+)$/, `_${n}$1`);
        n++;
      }
      used.add(name);
      zip.file(name, buffer);
    }

    const out = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
    const zipName = `qnotpillenai-lote-${new Date().toISOString().slice(0, 10)}.zip`;
    return new NextResponse(new Uint8Array(out), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipName}"; filename*=UTF-8''${encodeURIComponent(zipName)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "No se pudo generar el ZIP.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
