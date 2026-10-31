// Prueba del flujo asíncrono: POST devuelve id al instante, luego se sondea
const fs = require("fs");

const text = fs.readFileSync("/tmp/text_3900.txt", "utf8");
console.log("Texto:", text.length, "caracteres");

(async () => {
  const t0 = Date.now();
  // 1) POST de inicio: debe responder MUY rápido
  const post = await fetch("http://localhost:3000/api/humanize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, intensity: "medium", tone: "neutral", useLLM: true, useRules: true }),
  });
  const postMs = Date.now() - t0;
  const start = await post.json().catch(() => null);
  if (!post.ok || !start?.id) {
    console.log(`❌ POST ${post.status} en ${postMs} ms:`, start);
    process.exit(1);
  }
  console.log(`✅ POST ${post.status} en ${postMs} ms → id=${start.id} (status: ${start.status})`);
  if (postMs > 3000) {
    console.log("❌ el POST tardó demasiado; el objetivo es <3 s");
    process.exit(1);
  }

  // 2) sondear cada 2 s
  let last = "";
  const t1 = Date.now();
  while (Date.now() - t1 < 420_000) {
    await new Promise((r) => setTimeout(r, 2000));
    const res = await fetch(`http://localhost:3000/api/humanize?id=${start.id}`);
    const st = await res.json().catch(() => null);
    if (!res.ok) {
      console.log(`❌ GET ${res.status}:`, st);
      process.exit(1);
    }
    const line = st.status === "processing" ? `procesando ${st.progress}/${st.total}` : st.status;
    if (line !== last) {
      console.log(`   [+${((Date.now() - t1) / 1000).toFixed(0)} s] ${line}`);
      last = line;
    }
    if (st.status === "error") {
      console.log("❌ trabajo terminó con error:", st.error);
      process.exit(1);
    }
    if (st.status === "done") {
      const r = st.result;
      const words = (r.text.match(/[\p{L}\p{N}]+/gu) || []).length;
      console.log(`✅ done en ${((Date.now() - t1) / 1000).toFixed(0)} s | modo: ${r.mode} | cambios: ${r.changes} | palabras: ${words}`);
      console.log(`   detección tras humanizar: ${r.after.score}% (${r.after.level})`);
      console.log(`   warnings: ${r.warnings.length ? JSON.stringify(r.warnings) : "ninguno"}`);
      // 3) id desconocido debe dar 404 con mensaje claro
      const nf = await fetch("http://localhost:3000/api/humanize?id=no-existe");
      console.log(nf.status === 404 ? "✅ id desconocido → 404 con mensaje" : `❌ id desconocido → ${nf.status}`);
      process.exit(0);
    }
  }
  console.log("❌ timeout de sondeo (7 min)");
  process.exit(1);
})();
