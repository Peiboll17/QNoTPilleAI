// Prueba multilingüe: detección de idioma (es/en/fr/it/pt/de) vía /api/detect
// y pase de reglas en francés vía /api/humanize (sin IA, rápido).
const BASE = "http://localhost:3000";

const SAMPLES = [
  {
    lang: "es",
    text: `En la actualidad, la inteligencia artificial ha transformado la gestión de la información en las organizaciones. Además, es importante destacar que los procesos automatizados permiten optimizar recursos. No solo se trata de reducir costes, sino también de mejorar la calidad del servicio para los usuarios.`,
  },
  {
    lang: "en",
    text: `It is important to note that machine learning models have revolutionized data analysis. Furthermore, these systems play a crucial role in modern businesses. In conclusion, organizations must adapt to this new technological landscape to remain competitive today.`,
  },
  {
    lang: "fr",
    text: `De nos jours, l'intelligence artificielle a transformé la gestion de l'information dans les organisations. En outre, il est important de noter que les processus automatisés permettent d'optimiser les ressources. Non seulement il s'agit de réduire les coûts, mais aussi d'améliorer la qualité du service pour les utilisateurs.`,
  },
  {
    lang: "it",
    text: `Nella società odierna, l'intelligenza artificiale ha trasformato la gestione delle informazioni nelle organizzazioni. Inoltre, è importante sottolineare che i processi automatizzati permettono di ottimizzare le risorse. Non solo si tratta di ridurre i costi, ma anche di migliorare la qualità del servizio per gli utenti.`,
  },
  {
    lang: "pt",
    text: `Na sociedade atual, a inteligência artificial tem transformado a gestão da informação nas organizações. Além disso, é importante destacar que os processos automatizados permitem otimizar recursos. Não apenas se trata de reduzir custos, mas também de melhorar a qualidade do serviço para os usuários.`,
  },
  {
    lang: "de",
    text: `In der heutigen Zeit hat die künstliche Intelligenz die Verwaltung von Informationen in Organisationen verändert. Außerdem ist es wichtig zu beachten, dass automatisierte Prozesse die Ressourcen optimieren. Es geht nicht nur darum, Kosten zu senken, sondern auch die Qualität des Dienstes für die Nutzer zu verbessern.`,
  },
];

async function main() {
  let fallos = 0;

  // 1) detección de idioma
  for (const s of SAMPLES) {
    const res = await fetch(`${BASE}/api/detect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: s.text, useAI: false }),
    });
    const data = await res.json();
    const ok = data.lang === s.lang;
    console.log(`detect: esperado=${s.lang} obtenido=${data.lang} score=${data.score} ${ok ? "OK" : "FALLO"}`);
    if (!ok) fallos++;
  }

  // 2) pase de reglas en francés: los clichés deben sustituirse y el idioma conservarse
  const frText = SAMPLES[2].text;
  const hres = await fetch(`${BASE}/api/humanize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: frText, intensity: "medium", tone: "neutral", useLLM: false, useRules: true }),
  });
  const { id } = await hres.json();
  let st;
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const r = await fetch(`${BASE}/api/humanize?id=${encodeURIComponent(id)}`);
    st = await r.json();
    if (st.status !== "processing") break;
  }
  if (st.status !== "done") throw new Error("humanize fr falló: " + JSON.stringify(st).slice(0, 200));
  const out = st.result.text;
  const lower = out.toLowerCase();
  const clichesGone = !lower.includes("il est important de noter que") && !lower.includes("de nos jours");
  const stillFrench = /(les|des|aux|pour)\b/.test(lower) && !/\b(the|and of|der die das)\b/.test(lower);
  console.log(`humanize fr: cambios=${st.result.changes} mode=${st.result.mode} lang=${st.result.after.lang}`);
  console.log(`  clichés eliminados: ${clichesGone ? "OK" : "FALLO"} · sigue en francés: ${stillFrench ? "OK" : "FALLO"}`);
  console.log("  resultado:", out.slice(0, 200));
  if (!clichesGone || !stillFrench || st.result.after.lang !== "fr") fallos++;

  if (fallos > 0) throw new Error(`${fallos} comprobación(es) fallida(s)`);
  console.log("TODO OK");
}

main().catch((e) => {
  console.error("FALLO:", e.message);
  process.exit(1);
});
