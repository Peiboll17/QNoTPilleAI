// Genera un texto largo estilo IA en español para probar rendimiento
const fs = require("fs");

const P = [
  "En el mundo actual, es importante destacar que la inteligencia artificial juega un papel crucial en la transformación de la sociedad moderna. En la era digital, las empresas se enfrentan a una amplia gama de desafíos que requieren soluciones innovadoras. Además, cabe señalar que la automatización ha demostrado ser un elemento clave para la productividad.",
  "Por otro lado, es fundamental tener en cuenta que la formación continua es de vital importancia para los profesionales. En este sentido, las organizaciones deben fomentar el desarrollo de habilidades digitales entre sus equipos. Asimismo, resulta meticuloso analizar las complejidades de cada proceso antes de implementar cambios significativos.",
  "En conclusión, podemos afirmar que el futuro es prometedor para quienes adopten estas tecnologías emergentes. Sin lugar a dudas, las posibilidades son infinitas y el panorama actual ofrece una gran variedad de oportunidades. No solo se trata de mejorar la eficiencia, sino también de transformar la manera en que trabajamos y vivimos.",
  "En la actualidad, el uso de herramientas basadas en IA se ha convertido en una práctica habitual en multitud de sectores. Desde la sanidad hasta la educación, pasando por la industria y el comercio, todas las áreas muestran un interés creciente. Es importante mencionar que la inversión en tecnología ha crecido de forma sostenida durante los últimos años.",
  "A lo largo de la historia, los avances tecnológicos han transformado la manera en que las personas trabajan. En el panorama actual, la velocidad del cambio es mayor que nunca y las organizaciones deben adaptarse con rapidez. Cabe destacar que la capacidad de aprender y desaprender se ha convertido en una habilidad esencial para los equipos de trabajo.",
  "Por consiguiente, las empresas que inviertan en formación y tecnología estarán mejor posicionadas para afrontar los retos del mañana. En este sentido, no basta con adquirir herramientas: es necesario construir una cultura organizativa abierta al cambio. Del mismo modo, los líderes deben dar ejemplo y acompañar a sus equipos durante la transición.",
];

let text = "";
while (text.length < 45000) {
  text += P.join("\n\n") + "\n\n";
}
text = text.slice(0, 45000);
fs.writeFileSync("/tmp/long_text.txt", text);
console.log("Texto:", text.length, "caracteres,", (text.match(/[\p{L}\p{N}]+/gu) || []).length, "palabras");
