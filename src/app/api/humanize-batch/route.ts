import { NextRequest, NextResponse } from "next/server";
import { startHumanizeBatchJob, getBatchJobState } from "@/lib/jobs";
import { parseHumanizeOptions } from "@/lib/shared-types";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_FILES = 12;
const MAX_CHARS_PER_FILE = 200_000;
const MIN_CHARS = 40;

// POST: arranca el lote en segundo plano y devuelve el id al instante
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawFiles = Array.isArray(body?.files) ? body.files : [];
    if (rawFiles.length === 0) {
      return NextResponse.json({ error: "No se ha recibido ningún archivo." }, { status: 400 });
    }
    if (rawFiles.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Máximo ${MAX_FILES} archivos por lote; has enviado ${rawFiles.length}.` },
        { status: 400 }
      );
    }
    const files: { name: string; text: string }[] = [];
    const tooShort: string[] = [];
    for (const f of rawFiles) {
      const name = typeof f?.name === "string" && f.name.trim() ? f.name.trim() : "documento";
      const text = typeof f?.text === "string" ? f.text : "";
      if (text.trim().length < MIN_CHARS) {
        tooShort.push(name);
        continue;
      }
      files.push({ name, text: text.slice(0, MAX_CHARS_PER_FILE) });
    }
    if (files.length === 0) {
      return NextResponse.json(
        { error: "Ninguno de los archivos tiene texto suficiente (mínimo ~40 caracteres)." },
        { status: 400 }
      );
    }
    const opts = parseHumanizeOptions(body);
    const id = startHumanizeBatchJob(files, opts);
    return NextResponse.json({
      id,
      status: "processing",
      filesTotal: files.length,
      omitted: tooShort,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "No se pudo iniciar el lote.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// GET /api/humanize-batch?id=...: estado del lote
export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id") || "";
  const state = getBatchJobState(id);
  if (!state) {
    return NextResponse.json(
      { error: "No se ha encontrado ese lote (el servidor se ha reiniciado). Vuelve a procesarlo." },
      { status: 404 }
    );
  }
  return NextResponse.json(state);
}
