import { NextRequest, NextResponse } from "next/server";
import { buildExport, outputFileName } from "@/lib/exporters";
import type { ExportRequest } from "@/lib/shared-types";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    const format = ["docx", "pdf", "txt"].includes(body?.format) ? body.format : "docx";
    if (!text) {
      return NextResponse.json({ error: "No hay texto para exportar." }, { status: 400 });
    }
    const reqObj: ExportRequest = {
      text: text.slice(0, 300000),
      format,
      fileName: typeof body?.fileName === "string" ? body.fileName : "texto",
    };
    const { buffer, mime, ext } = await buildExport(reqObj);
    const name = outputFileName(reqObj.fileName, ext);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `attachment; filename="${name.replace(/[^\w.\-]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(name)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "No se pudo generar el archivo.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
