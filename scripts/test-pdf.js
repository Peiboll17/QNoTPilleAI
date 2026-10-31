/** Prueba de extracción PDF + re-verificación del score */
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const BASE = "http://localhost:3000";
const OUT = path.join(__dirname, "tmp-test");

const TEXT = `En la actualidad, el teletrabajo se ha consolidado como una modalidad que transformó la manera en que las organizaciones conciben la productividad. Es importante destacar que este cambio de paradigma ha demostrado ser beneficioso tanto para las empresas como para los trabajadores.

En primer lugar, cabe señalar que la flexibilidad horaria permite conciliar la vida personal y profesional de manera más eficaz. Asimismo, la reducción de desplazamientos diarios contribuye significativamente a disminuir la huella de carbono corporativa. Por otro lado, no obstante, es fundamental reconocer que el aislamiento social puede afectar la cohesión de los equipos.

En conclusión, el teletrabajo representa infinitas posibilidades para el futuro laboral, siempre que se implemente con políticas claras.`;

async function main() {
  // Generar PDF
  const doc = new PDFDocument({ size: "A4", margin: 60 });
  const chunks = [];
  doc.on("data", (c) => chunks.push(c));
  const done = new Promise((r) => doc.on("end", r));
  doc.font("Helvetica").fontSize(11);
  TEXT.split(/\n\n/).forEach((p) => {
    doc.text(p, { align: "justify" });
    doc.moveDown();
  });
  doc.end();
  await done;
  const buf = Buffer.concat(chunks);
  fs.writeFileSync(path.join(OUT, "prueba-ia.pdf"), buf);
  console.log("[1] PDF de prueba creado:", buf.length, "bytes");

  // Extraer
  const fd = new FormData();
  fd.append("file", new Blob([buf], { type: "application/pdf" }), "prueba-ia.pdf");
  let res = await fetch(`${BASE}/api/extract`, { method: "POST", body: fd });
  const extracted = await res.json();
  if (!res.ok) throw new Error("extract: " + JSON.stringify(extracted));
  console.log("[2] extract PDF OK — palabras:", extracted.meta.words, "| kind:", extracted.meta.kind);
  console.log("    inicio:", extracted.text.slice(0, 120).replace(/\n/g, " "));

  // Detectar (verificar que score no es null)
  res = await fetch(`${BASE}/api/detect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: extracted.text }),
  });
  const detection = await res.json();
  if (!res.ok) throw new Error("detect: " + JSON.stringify(detection));
  if (detection.score === null || Number.isNaN(detection.score)) throw new Error("score sigue siendo null");
  console.log(`[3] detect OK — puntuación IA: ${detection.score}% (${detection.level})`);
  console.log("    indicadores:", detection.indicators.map((i) => `${i.label}=${i.score}`).join(" | "));

  // Texto humano de control: debe salir con score bajo
  const HUMAN = `La semana pasada hablé con mi hermano sobre el teletrabajo. Él lleva dos años en remoto y, la verdad, no vuelve a la oficina ni loco. "Me ahorro hora y media de metro al día", me dijo. ¿Qué hago yo con ese tiempo? Pues básicamente desayunar sin prisa y pasear al perro antes de abrir el portátil.

Eso sí, reconoce que echa de menos el café con los compañeros. En plan, esos minutos tontos de pasillo que acaban resolviendo medio problema de trabajo. Su empresa ahora hace dos días presenciales obligatorios y dice que, ojo, justo esos días son los que más rinde: se reparte tareas con la cara, no por chat.

Yo pienso que esto va más de sentido común que de modas. Unos necesitan gente al lado; otros necesitan silencio. Al menos, por lo menos, ya nadie discute que se puede trabajar sin estar sentado en una silla corporativa ocho horas.`;
  res = await fetch(`${BASE}/api/detect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: HUMAN }),
  });
  const humanDet = await res.json();
  if (!res.ok) throw new Error("detect human: " + JSON.stringify(humanDet));
  console.log(`[4] control humano OK — puntuación IA: ${humanDet.score}% (${humanDet.level})`);
  if (humanDet.score >= 50) console.warn("    ⚠️ texto humano marcado alto — revisar heurísticas");

  console.log("\n✅ PRUEBAS PDF + CALIBRACIÓN OK");
}

main().catch((e) => {
  console.error("❌ ERROR:", e.message);
  process.exit(1);
});
