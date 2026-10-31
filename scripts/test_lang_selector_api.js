// Test del selector manual de idioma:
//  1) /api/detect respeta el idioma forzado (fr sobre texto francés; de forzado sobre texto francés)
//  2) /api/humanize (solo reglas) procesa con lang forzado y el after conserva ese idioma
//  3) /api/humanize-batch con lang auto detecta fr y de por separado
//  4) /api/export-report genera un DOCX válido con esos resultados
const BASE = "http://localhost:3000";

const TEXTO_FR = `Dans le monde actuel, il est important de souligner que l'intelligence artificielle transforme profondément nos sociétés. De nos jours, les entreprises adoptent ces technologies à un rythme soutenu, et il est crucial de comprendre leurs implications. Non seulement ces outils automatisent des tâches répétitives, mais ils ouvrent également de nouvelles perspectives créatives. En conclusion, il est essentiel de souligner que l'avenir du travail dépendra de notre capacité à intégrer ces innovations de manière responsable. À l'ère du numérique, la formation continue devient un enjeu majeur pour tous les travailleurs, car les compétences évoluent rapidement. Il convient de noter que les gouvernements commencent à réguler ce secteur. En résumé, la clé du succès résidera dans l'équilibre entre innovation et éthique, un défi que chaque organisation devra relever dans les années à venir.`;

const TEXTO_DE = `In der heutigen Zeit ist es wichtig zu beachten, dass künstliche Intelligenz unsere Arbeitswelt tiefgreifend verändert. Im digitalen Zeitalter passen Unternehmen ihre Prozesse immer schneller an, und es ist wichtig zu beachten, dass dies sowohl Chancen als auch Risiken birgt. Nicht nurRoutineaufgaben werden automatisiert, sondern es entstehen auch völlig neue Berufsfelder. Zusammenfassend lässt sich sagen, dass der Erfolg von der Fähigkeit abhängt, Innovation und Verantwortung in Einklang zu bringen. In der modernen Welt ist lebenslanges Lernen zu einer Grundvoraussetzung geworden, denn die Anforderungen ändern sich ständig. Abschließend lässt sich festhalten, dass jede Organisation diese Herausforderung meistern muss.`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function json(url, init, timeoutMs = 60000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctl.signal });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${JSON.stringify(data)}`);
    return data;
  } finally {
    clearTimeout(t);
  }
}

let fallos = 0;
const check = (cond, label, extra = "") => {
  console.log(`${cond ? "✅" : "❌"} ${label}${extra ? ` — ${extra}` : ""}`);
  if (!cond) fallos++;
};

// ---------- 1) detect con idioma forzado ----------
const dAuto = await json(`${BASE}/api/detect`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ text: TEXTO_FR, useAI: false, lang: "auto" }),
});
check(dAuto.lang === "fr", "detect auto detecta francés", `lang=${dAuto.lang}, score=${dAuto.score}`);

const dForzado = await json(`${BASE}/api/detect`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ text: TEXTO_FR, useAI: false, lang: "de" }),
});
check(dForzado.lang === "de", "detect respeta el idioma forzado (de)", `lang=${dForzado.lang}, score=${dForzado.score}`);
check(
  dForzado.level.includes("alemán"),
  "el nivel menciona el idioma forzado",
  dForzado.level
);

const dInvalido = await json(`${BASE}/api/detect`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ text: TEXTO_FR, useAI: false, lang: "zz" }),
});
check(dInvalido.lang === "fr", "lang inválido cae en automático", `lang=${dInvalido.lang}`);

// ---------- 2) humanize con lang forzado (solo reglas, rápido) ----------
const { id } = await json(`${BASE}/api/humanize`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ text: TEXTO_FR, lang: "fr", useLLM: false, useRules: true }),
});
let h = null;
for (let i = 0; i < 40; i++) {
  await sleep(1500);
  h = await json(`${BASE}/api/humanize?id=${encodeURIComponent(id)}`, {}, 20000);
  if (h.status !== "processing") break;
}
check(h?.status === "done", "humanize (fr forzado) termina", h?.status);
if (h?.status === "done") {
  check(h.result.after.lang === "fr", "after conserva el idioma forzado", `after.lang=${h.result.after.lang}`);
  check(h.result.text.length > 100, "texto humanizado no vacío", `${h.result.text.length} chars`);
  check(
    !/dans le monde actuel/i.test(h.result.text),
    "muletilla francesa sustituida por las reglas fr",
    h.result.text.slice(0, 80)
  );
}

// ---------- 3) lote con lang auto: fr + de ----------
const { id: bid } = await json(`${BASE}/api/humanize-batch`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    files: [
      { name: "Informe FR", text: TEXTO_FR },
      { name: "Bericht DE", text: TEXTO_DE },
    ],
    lang: "auto",
    useLLM: false,
    useRules: true,
  }),
});
let b = null;
for (let i = 0; i < 60; i++) {
  await sleep(2000);
  b = await json(`${BASE}/api/humanize-batch?id=${encodeURIComponent(bid)}`, {}, 20000);
  if (b.status !== "processing") break;
}
check(b?.status === "done", "lote (auto) termina", b?.status);
const langs = (b?.results || []).map((r) => r.lang);
check(langs[0] === "fr" && langs[1] === "de", "el lote detecta fr y de por separado", langs.join(","));

// ---------- 4) informe comparativo con esos resultados ----------
if (b?.status === "done") {
  const res = await fetch(`${BASE}/api/export-report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      format: "docx",
      options: "idioma: detección automática · prueba del selector",
      items: b.results.map((r) => ({
        name: r.name,
        lang: r.lang,
        beforeScore: r.before.score,
        beforeLevel: r.before.level,
        afterScore: r.after.score,
        afterLevel: r.after.level,
        mode: r.mode,
        changes: r.changes,
        warnings: r.warnings,
        originalExcerpt: r.name === "Informe FR" ? TEXTO_FR.slice(0, 300) : TEXTO_DE.slice(0, 300),
        humanizedExcerpt: r.text.slice(0, 300),
      })),
    }),
  });
  const buf = Buffer.from(await res.arrayBuffer());
  check(res.ok && buf.length > 1000, "informe DOCX generado", `${buf.length} bytes`);
  check(buf.slice(0, 2).toString() === "PK", "el informe es un DOCX válido (firma PK)");
}

console.log(fallos === 0 ? "\nTODO OK" : `\n${fallos} FALLOS`);
process.exit(fallos === 0 ? 0 : 1);
