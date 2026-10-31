// Pruebas: detector multiidioma, humanize en inglés, lote y ZIP
const assert = (cond, msg) => {
  console.log((cond ? "✅" : "❌") + " " + msg);
  if (!cond) process.exitCode = 1;
};

const ES_AI = `En el mundo actual, es importante destacar que la inteligencia artificial juega un papel crucial en la transformación de la sociedad moderna. Además, cabe señalar que la automatización ha demostrado ser un elemento clave para la productividad. Por otro lado, es fundamental tener en cuenta que la formación continua es de vital importancia para los profesionales. Asimismo, resulta imprescindible analizar las complejidades de cada proceso. En conclusión, podemos afirmar que el futuro es prometedor. No solo se trata de mejorar la eficiencia, sino también de transformar la manera en que trabajamos.`;

const ES_HUMANO = `La semana pasada me encontré con Pepe en el bar de siempre. Me dijo que había dejado la fábrica, que ya estaba harto. "¿Y ahora qué harás?", le pregunté. Me encogió los hombros: "Nada, descansar. ¡Ya veremos!". La verdad es que le entendí perfectamente.`;

const EN_AI = `In today's fast-paced world, it is important to note that artificial intelligence plays a crucial role in the transformation of modern society. Furthermore, it is worth noting that automation has proven to be a key element. Moreover, organizations must navigate the complexities of digital transformation. In conclusion, the possibilities are endless, and not only efficiency but also collaboration will improve. Additionally, it is essential to leverage cutting-edge technology to unlock the potential of teams. Delving into the realm of innovation, we must remember that the future is bright.`;

const EN_HUMANO = `I ran into Steve at the coffee shop on Tuesday. He told me he'd quit his job at the bank. "Are you serious?" I asked. He just shrugged. "Honestly, I couldn't stand another meeting about meetings." We laughed about it for a while. You know how it goes. Anyway, he's thinking about restoring old cars now, which sounds messy and wonderful.`;

(async () => {
  // ---------- 1. detector multiidioma ----------
  const det = async (text) => {
    const res = await fetch("http://localhost:3000/api/detect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, useAI: false }),
    });
    return res.json();
  };
  const dEs = await det(ES_AI);
  assert(dEs.lang === "es", `idioma ES detectado: ${dEs.lang}, score ${dEs.score}%`);
  assert(dEs.score >= 55, `texto IA en español puntúa alto: ${dEs.score}%`);
  const dEsH = await det(ES_HUMANO);
  assert(dEsH.score <= 55, `texto humano en español puntúa bajo: ${dEsH.score}%`);
  const dEn = await det(EN_AI);
  assert(dEn.lang === "en", `idioma EN detectado: ${dEn.lang}, score ${dEn.score}%`);
  assert(dEn.score >= 55, `texto IA en inglés puntúa alto: ${dEn.score}%`);
  assert((dEn.clichesFound || []).some((c) => /plays a crucial role|important to note|In conclusion|fast-paced/i.test(c.phrase)),
    `clichés EN encontrados: ${(dEn.clichesFound || []).slice(0, 4).map((c) => c.phrase).join(", ")}`);
  const dEnH = await det(EN_HUMANO);
  assert(dEnH.score <= 55, `texto humano en inglés puntúa bajo: ${dEnH.score}%`);

  // ---------- 2. humanize en inglés (async job) ----------
  const start = await fetch("http://localhost:3000/api/humanize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: EN_AI, intensity: "light", tone: "neutral", useLLM: true, useRules: true }),
  }).then((r) => r.json());
  let rEn = null;
  for (let i = 0; i < 60 && !rEn; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const st = await fetch(`http://localhost:3000/api/humanize?id=${start.id}`).then((r) => r.json());
    if (st.status === "done") rEn = st.result;
    if (st.status === "error") { assert(false, "humanize EN falló: " + st.error); break; }
  }
  if (rEn) {
    assert(/\b(and|the|of)\b/i.test(rEn.text) && !/\b(además|además)\b/i.test(rEn.text.slice(0, 400)), "resultado humanizado sigue en inglés");
    assert(!/plays a crucial role|it is important to note/i.test(rEn.text), "clichés EN eliminados del resultado");
    assert(rEn.after.lang === "en", `detección del resultado: ${rEn.after.score}% (${rEn.after.lang})`);
  } else assert(false, "humanize EN no terminó en 120 s");

  // ---------- 3. lote ----------
  const batchStart = await fetch("http://localhost:3000/api/humanize-batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      files: [
        { name: "informe-es.txt", text: ES_AI },
        { name: "report-en.txt", text: EN_AI },
        { name: "nota-humana.txt", text: ES_HUMANO },
      ],
      intensity: "light",
      tone: "neutral",
      useLLM: true,
      useRules: true,
    }),
  });
  const bs = await batchStart.json();
  assert(batchStart.ok && bs.id, `lote iniciado: id=${bs.id}, archivos=${bs.filesTotal}, omitidos=${(bs.omitted || []).length}`);

  let batchDone = null;
  const t0 = Date.now();
  while (Date.now() - t0 < 300_000 && !batchDone) {
    await new Promise((r) => setTimeout(r, 3000));
    const st = await fetch(`http://localhost:3000/api/humanize-batch?id=${bs.id}`).then((r) => r.json());
    if (st.status === "processing") continue;
    if (st.status === "error") { assert(false, "lote con error: " + st.error); batchDone = st; break; }
    batchDone = st;
  }
  if (batchDone?.results) {
    const rs = batchDone.results;
    assert(rs.length === 3, `lote completado con ${rs.length} resultados`);
    const es = rs.find((x) => x.name === "informe-es.txt");
    const en = rs.find((x) => x.name === "report-en.txt");
    assert(es && es.lang === "es", `informe-es.txt: ${es?.before.score}% → ${es?.after.score}% (español)`);
    assert(en && en.lang === "en", `report-en.txt: ${en?.before.score}% → ${en?.after.score}% (inglés)`);
    assert(en && !/plays a crucial role/i.test(en.text), "report-en.txt sin clichés EN tras humanizar");

    // ---------- 4. ZIP del lote ----------
    const zipRes = await fetch("http://localhost:3000/api/export-batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files: rs.map((x) => ({ name: x.name, text: x.text, format: "docx" })) }),
    });
    const buf = Buffer.from(await zipRes.arrayBuffer());
    const isZip = buf.length > 1000 && buf[0] === 0x50 && buf[1] === 0x4b;
    assert(isZip, `ZIP válido: ${buf.length} bytes (PK header)`);
    require("fs").writeFileSync("/tmp/lote_test.zip", buf);
  } else if (!batchDone) assert(false, "lote no terminó en 300 s");

  process.exit(process.exitCode || 0);
})();
