import { NextRequest, NextResponse } from "next/server";
import { extractText } from "@/lib/extract";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Falta el archivo." }, { status: 400 });
    }
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: "El archivo supera los 25 MB." }, { status: 413 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await extractText(buffer, file.name);
    return NextResponse.json({
      text: result.text,
      meta: { ...result.meta, fileName: file.name },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al extraer el texto del archivo.";
    return NextResponse.json({ error: msg }, { status: 422 });
  }
}
