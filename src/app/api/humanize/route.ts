import { NextRequest, NextResponse } from "next/server";
import { startHumanizeJob, getJobState } from "@/lib/jobs";
import { parseHumanizeOptions } from "@/lib/shared-types";

export const runtime = "nodejs";
export const maxDuration = 300;

// POST: valida el texto, arranca el trabajo en segundo plano y devuelve el id
// de inmediato. Así ninguna petición larga atraviesa el proxy intermedio
// (que corta las conexiones lentas con un 502).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text = typeof body?.text === "string" ? body.text : "";
    if (text.trim().length < 40) {
      return NextResponse.json(
        { error: "El texto es demasiado corto para humanizarlo (mínimo ~40 caracteres)." },
        { status: 400 }
      );
    }
    const opts = parseHumanizeOptions(body);
    const id = startHumanizeJob(text.slice(0, 200000), opts);
    return NextResponse.json({ id, status: "processing" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "No se pudo iniciar la humanización.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// GET /api/humanize?id=...: estado del trabajo (processing | done | error)
export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id") || "";
  const state = getJobState(id);
  if (!state) {
    return NextResponse.json(
      { error: "No se ha encontrado ese trabajo (el servidor se ha reiniciado). Vuelve a pulsar «Humanizar texto»." },
      { status: 404 }
    );
  }
  return NextResponse.json(state);
}
