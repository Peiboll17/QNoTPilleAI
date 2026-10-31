// Prueba del endpoint /api/humanize con un texto de ~3900 palabras (como el del usuario)
const fs = require("fs");

const P = [
  "En el mundo actual, es importante destacar que la inteligencia artificial juega un papel crucial en la transformación de la sociedad moderna. En la era digital, las empresas se enfrentan a una amplia gama de desafíos que requieren soluciones innovadoras. Además, cabe señalar que la automatización ha demostrado ser un elemento clave para la productividad.",
  "Por otro lado, es fundamental tener en cuenta que la formación continua es de vital importancia para los profesionales. En este sentido, las organizaciones deben fomentar el desarrollo de habilidades digitales entre sus equipos. Asimismo, resulta imprescindible analizar las complejidades de cada proceso antes de implementar cambios significativos.",
  "En conclusión, podemos afirmar que el futuro es prometedor para quienes adopten estas tecnologías emergentes. Sin lugar a dudas, las posibilidades son infinitas y el panorama actual ofrece una gran variedad de oportunidades. No solo se trata de mejorar la eficiencia, sino también de transformar la manera en que trabajamos y vivimos.",
  "En la actualidad, el uso de herramientas basadas en IA se ha convertido en una práctica habitual en multitud de sectores. Desde la sanidad hasta la educación, pasando por la industria y el comercio, todas las áreas muestran un interés creciente. Es importante mencionar que la inversión en tecnología ha crecido de forma sostenida durante los últimos años.",
  "A lo largo de la historia, los avances tecnológicos han transformado la manera en que las personas trabajan. En el panorama actual, la velocidad del cambio es mayor que nunca y las organizaciones deben adaptarse con rapidez. Cabe destacar que la capacidad de aprender y desaprender se ha convertido en una habilidad esencial para los equipos de trabajo.",
  "Por consiguiente, las empresas que inviertan en formación y tecnología estarán mejor posicionadas para afrontar los retos del mañana. En este sentido, no basta con adquirir herramientas: es necesario construir una cultura organizativa abierta al cambio. Del mismo modo, los líderes deben dar ejemplo y acompañar a sus equipos durante la transición.",
];

const TARGET_WORDS = 3900;
let text = "";
while ((text.match(/[\p{L}\p{N}]+/gu) || []).length < TARGET_WORDS) {
  text += P.join("\n\n") + "\n\n";
}
// recortar recorriendo el texto palabra a palabra hasta la 3900
let acc = 0, cutIdx = text.length, mm;
const reW = /[\p{L}\p{N}]+/gu;
while ((mm = reW.exec(text)) !== null) {
  acc++;
  if (acc === TARGET_WORDS) { cutIdx = mm.index + mm[0].length; break; }
}
text = text.slice(0, cutIdx) + ".";
fs.writeFileSync("/tmp/text_3900.txt", text);
console.log("Texto de prueba:", text.length, "caracteres,", (text.match(/[\p{L}\p{N}]+/gu) || []).length, "palabras");

const body = JSON.stringify({
  text,
  intensity: "medium",
  tone: "neutral",
  useLLM: true,
  useRules: true,
});

(async () => {
  const t0 = Date.now();
  try {
    const res = await fetch("http://localhost:3000/api/humanize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    const ms = Date.now() - t0;
    const raw = await res.text();
    let json = null;
    try {
      json = JSON.parse(raw);
    } catch {
      console.log(`❌ HTTP ${res.status} en ${ms} ms — respuesta NO es JSON. Primeros 200 chars:`, raw.slice(0, 200));
      process.exit(1);
    }
    if (!res.ok) {
      console.log(`❌ HTTP ${res.status} en ${ms} ms —`, json);
      process.exit(1);
    }
    console.log(`✅ HTTP ${res.status} en ${(ms / 1000).toFixed(1)} s`);
    console.log("   modo:", json.mode, "| cambios:", json.changes, "| warnings:", json.warnings.length);
    console.log("   detección tras humanizar:", json.after?.score + "%", json.after?.level);
    console.log("   palabras salida:", (json.text.match(/[\p{L}\p{N}]+/gu) || []).length);
    const llmOk = !json.warnings.some((w) => w.includes("solo con las reglas"));
    console.log(llmOk ? "   ✅ todos los fragmentos reescritos con IA" : "   ⚠️ algunos fragmentos degradados a reglas (esperado bajo 429)");
    process.exit(0);
  } catch (e) {
    console.log("❌ fallo de red en", ((Date.now() - t0) / 1000).toFixed(1), "s:", e.message);
    process.exit(1);
  }
})();
