import { NextRequest, NextResponse } from "next/server";
import { combineWithLLM, detectAI } from "@/lib/detector";
import { llmJudge } from "@/lib/llm-judge";
import { parseLangChoice, type Lang } from "@/lib/shared-types";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text = typeof body?.text === "string" ? body.text : "";
    if (text.trim().length < 40) {
      return NextResponse.json(
        { error: "El texto es demasiado corto para analizarlo (mínimo ~40 caracteres)." },
        { status: 400 }
      );
    }
    // idioma forzado por el selector manual ("auto" o un código válido)
    const langChoice = parseLangChoice(body?.lang);
    const forcedLang: Lang | undefined = langChoice === "auto" ? undefined : langChoice;
    let result = detectAI(text.slice(0, 200000), forcedLang);

    // Capa opcional: análisis semántico con modelo de lenguaje
    if (body?.useAI === true) {
      const llm = await llmJudge(text.slice(0, 12000));
      if (llm) {
        result = combineWithLLM(result, llm);
      } else {
        result = { ...result, semantic: false };
      }
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "No se pudo analizar el texto." }, { status: 500 });
  }
}
