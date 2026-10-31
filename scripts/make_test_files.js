// Genera archivos de prueba: DOCX, PDF y DOC con texto estilo IA
const { Document, Packer, Paragraph, TextRun } = require("docx");
const PDFDocument = require("pdfkit");
const fs = require("fs");

const AI_TEXT = `En el mundo actual, es importante destacar que la inteligencia artificial juega un papel crucial en la transformación de nuestra sociedad. En la era digital, las empresas de todo el planeta se enfrentan a una amplia gama de desafíos tecnológicos que requieren soluciones innovadoras y holísticas.

Es fundamental señalar que la automatización ha demostrado ser un elemento clave en el panorama actual. Además, no solo mejora la eficiencia operativa, sino también permite a las organizaciones desbloquear su potencial y aprovechar el poder de los datos. En este sentido, resulta meticuloso analizar las complejidades de cada proceso.

Por otro lado, cabe mencionar que la formación continua es de vital importancia para los profesionales. En conclusión, podemos afirmar que el futuro es prometedor para quienes sepan adaptarse. Asimismo, las posibilidades son infinitas para quienes adopten estas tecnologías emergentes, pues sin lugar a dudas estamos ante una revolución transformadora.`;

async function makeDocx() {
  const paras = AI_TEXT.split("\n\n").map(
    (p) =>
      new Paragraph({
        children: [new TextRun({ text: p, size: 24, font: "Calibri" })],
      })
  );
  const doc = new Document({
    creator: "ChatGPT",
    title: "Documento de prueba",
    sections: [{ properties: {}, children: paras }],
  });
  const buf = await Packer.toBuffer(doc);
  fs.writeFileSync("/tmp/test_ai.docx", buf);
  console.log("DOCX creado:", buf.length, "bytes");
}

function makePdf() {
  const doc = new PDFDocument({ size: "A4", margin: 60 });
  const ws = fs.createWriteStream("/tmp/test_ai.pdf");
  doc.pipe(ws);
  doc.font("Times-Roman").fontSize(11);
  doc.text(AI_TEXT, { align: "justify" });
  doc.end();
  ws.on("finish", () => console.log("PDF creado:", fs.statSync("/tmp/test_ai.pdf").size, "bytes"));
}

async function main() {
  await makeDocx();
  makePdf();
}
main().catch((e) => { console.error(e); process.exit(1); });
