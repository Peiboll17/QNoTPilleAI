// Prueba el detector corregido con varios tipos de texto
const BASE = "http://localhost:3000/api/detect";

const TEXTS = {
  ia_tipico: `En el mundo actual, es importante destacar que la inteligencia artificial juega un papel crucial en la transformación de nuestra sociedad. En la era digital, las empresas se enfrentan a una amplia gama de desafíos. Además, cabe señalar que la automatización ha demostrado ser un elemento clave. En conclusión, el futuro es prometedor para quienes adopten estas tecnologías.`,

  ia_formal_sin_muletillas: `El tratamiento automatizado de datos personales plantea tensiones jurídicamente relevantes entre la eficiencia administrativa y la garantía de derechos fundamentales. Los reglamentos sectoriales establecen límites diferenciados según la naturaleza del organismo tratante, aunque la jurisprudencia reciente ha matizado el alcance de dichas excepciones en materia de supervisión efectiva. Resulta necesario examinar la evolución interpretativa de los tribunales constitucionales respecto al estándar de proporcionalidad aplicable, así como las implicaciones de las directrices europeas sobre minimización de datos para los sistemas públicos de decisión automatizada.`,

  humano_colloquial: `La verdad que no esperaba que el proyecto saliera tan bien. Al principio íbamos fatal, o sea, el primer prototipo no funcionaba ni de broma, pero el otro día probamos la versión nueva y sorpresa: funcionó. Mi jefe se quedó con la boca abierta, la semana pasada nos dijo que si no mejoraba esto nos quedábamos sin presupuesto, y fíjate, ahora nos ha subido la partida para el año que viene. Un poco locura, sí.`,
};

async function detect(name, text, useAI) {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, useAI }),
  });
  const r = await res.json();
  if (r.error) return `${name}: ERROR ${r.error}`;
  const sem = r.indicators?.find((i) => i.key === "semantic");
  return [
    `${name} [${useAI ? "heur+sem" : "solo-heur"}]:`,
    `  score=${r.score}% (${r.level}) | semantic=${r.semantic}`,
    sem ? `  semántico=${sem.score}% — ${sem.detail.slice(0, 140)}` : "",
  ].filter(Boolean).join("\n");
}

for (const [name, text] of Object.entries(TEXTS)) {
  console.log(await detect(name, text, false));
}
// con capa semántica (1 llamada por texto, con pausa)
await new Promise((r) => setTimeout(r, 3000));
for (const [name, text] of Object.entries(TEXTS)) {
  console.log(await detect(name, text, true));
  await new Promise((r) => setTimeout(r, 4000));
}
