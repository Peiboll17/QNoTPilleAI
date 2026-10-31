// Verifica que callWithRetry/withTimeout acotan el tiempo aunque la llamada se cuelgue
import { callWithRetry, withTimeout } from "../src/lib/llm-call";

const hang = () => new Promise<string>(() => {}); // nunca resuelve

async function main() {
  // 1. withTimeout rechaza una promesa colgada
  let t0 = Date.now();
  try {
    await withTimeout(hang(), 2000, "prueba");
    console.log("❌ 1: no rechazó");
  } catch (e) {
    console.log(`✅ 1: withTimeout rechazó en ${Date.now() - t0} ms →`, (e as Error).message);
  }

  // 2. callWithRetry con deadline: una llamada colgada no supera el presupuesto
  t0 = Date.now();
  const deadline = Date.now() + 8000;
  try {
    await callWithRetry(hang, 2, deadline, 5000);
    console.log("❌ 2: no rechazó");
  } catch (e) {
    const dt = Date.now() - t0;
    console.log(`${dt <= 9500 ? "✅" : "❌"} 2: falló en ${dt} ms (presupuesto 8 s) →`, (e as Error).message);
  }

  // 3. llamada que responde rápido pasa sin problema
  t0 = Date.now();
  const r = await callWithRetry(async () => "ok", 2, Date.now() + 8000, 5000);
  console.log(`✅ 3: resultado "${r}" en ${Date.now() - t0} ms`);

  // 4. error no-429 no se reintenta
  t0 = Date.now();
  try {
    await callWithRetry(async () => { throw new Error("error cualquiera"); }, 2, Date.now() + 20000);
    console.log("❌ 4: no rechazó");
  } catch (e) {
    const dt = Date.now() - t0;
    console.log(`${dt < 1500 ? "✅" : "❌"} 4: falló sin reintentos en ${dt} ms →`, (e as Error).message);
  }

  // 5. 429 con presupuesto justo: reintenta pero no supera el plazo
  t0 = Date.now();
  try {
    await callWithRetry(async () => { throw new Error("HTTP 429 Too many requests"); }, 2, Date.now() + 9000);
    console.log("❌ 5: no rechazó");
  } catch (e) {
    const dt = Date.now() - t0;
    console.log(`${dt <= 9500 ? "✅" : "❌"} 5: 429 con esperas acotadas al presupuesto, falló en ${dt} ms →`, (e as Error).message);
  }
  process.exit(0);
}
main();
