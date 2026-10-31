// Diagnóstico: 4 llamadas paralelas al SDK para ver errores de concurrencia
import ZAI from "z-ai-web-dev-sdk";

const zai = await ZAI.create();
const ask = "Reescribe esta frase con otras palabras: «En el mundo actual, la IA juega un papel crucial». Devuelve solo la frase reescrita.";

const one = async (n) => {
  const t0 = Date.now();
  try {
    const c = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: "Eres un editor que reescribe frases en español." },
        { role: "user", content: `${ask} (variante ${n})` },
      ],
      thinking: { type: "disabled" },
    });
    return `#${n} OK en ${Date.now() - t0}ms: ${c.choices[0]?.message?.content?.slice(0, 60)}`;
  } catch (e) {
    return `#${n} ERROR en ${Date.now() - t0}ms: ${e?.message || e}`;
  }
};

console.log("Secuencial 1:");
console.log(await one(1));
console.log("4 paralelas:");
console.log((await Promise.all([one(2), one(3), one(4), one(5)])).join("\n"));
