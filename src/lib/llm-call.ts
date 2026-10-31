// Utilidad compartida para llamadas al modelo de lenguaje con reintentos

export const sleep = (ms: number): Promise<void> =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Rechaza si la promesa no se resuelve en `ms` milisegundos.
 * Imprescindible: la librería del modelo no tiene timeout propio y una
 * conexión colgada dejaría la petición HTTP esperando indefinidamente
 * (el proxy intermedio la cortaría con un 502).
 */
export function withTimeout<T>(p: Promise<T>, ms: number, label = "La llamada al modelo"): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const guard = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} tardó más de ${Math.round(ms / 1000)} s`)), ms);
  });
  return Promise.race([p, guard]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

const TIMEOUT_MSG = /tardó más de/i;

/**
 * Reintenta una llamada al modelo si el servicio devuelve 429 (límite de
 * peticiones) o si la llamada se queda colgada y salta el timeout.
 *
 * `deadline` es una marca de tiempo absoluta (Date.now() + presupuesto).
 * Cada intento recibe como máximo el tiempo restante, de modo que el total
 * nunca supera el presupuesto: la petición HTTP siempre responde a tiempo.
 */
export async function callWithRetry<T>(
  fn: () => Promise<T>,
  retries = 2,
  deadline?: number,
  perCallMs = 22_000
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; ; attempt++) {
    const remaining = deadline ? deadline - Date.now() : Infinity;
    if (remaining < 5_000) {
      throw new Error("Se agotó el tiempo para reescribir este fragmento");
    }
    // margen de 3 s para procesar la respuesta y devolver el resultado
    const budget = Math.max(4_000, Math.min(perCallMs, remaining - 3_000));
    try {
      return await withTimeout(fn(), budget);
    } catch (e) {
      lastErr = e;
      const msg = e instanceof Error ? e.message : String(e);
      const rateLimited = msg.includes("429") || /too many|rate limit/i.test(msg);
      const timedOut = TIMEOUT_MSG.test(msg);
      if (attempt >= retries || (!rateLimited && !timedOut)) throw e;
      const waitMs = 3000 + attempt * 5000; // espera 3 s y luego 8 s
      // no reintentar si la espera + una llamada rápida no caben en el presupuesto
      if (deadline && Date.now() + waitMs + 6_000 > deadline) throw e;
      await sleep(waitMs);
    }
  }
}
