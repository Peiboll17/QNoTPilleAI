// Registro de trabajos de humanización en segundo plano.
//
// La humanización con IA puede tardar más de un minuto y las peticiones HTTP
// largas son cortadas por la pasarela intermedia (502). Por eso el endpoint
// POST responde al instante con un id de trabajo y el proceso continúa aquí,
// en memoria, mientras el cliente sondea su estado con GET.

import { humanizeText } from "./humanizer";
import { detectAI } from "./detector";
import type {
  BatchFileResult,
  HumanizeBatchJobState,
  HumanizeJobState,
  HumanizeOptions,
} from "./shared-types";

interface Job {
  id: string;
  createdAt: number;
  state: HumanizeJobState;
}

interface BatchJob {
  id: string;
  createdAt: number;
  state: HumanizeBatchJobState;
}

const jobs = new Map<string, Job>();
const batchJobs = new Map<string, BatchJob>();
const JOB_TTL_MS = 45 * 60_000; // limpiar trabajos de hace más de 45 min
const MAX_JOBS = 40;

function cleanup(): void {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (now - job.createdAt > JOB_TTL_MS) jobs.delete(id);
  }
  for (const [id, job] of batchJobs) {
    if (now - job.createdAt > JOB_TTL_MS) batchJobs.delete(id);
  }
  // por si acaso, limitar el número de trabajos vivos (los más viejos primero)
  while (jobs.size >= MAX_JOBS) {
    const oldest = [...jobs.values()].sort((a, b) => a.createdAt - b.createdAt)[0];
    if (!oldest) break;
    jobs.delete(oldest.id);
  }
  while (batchJobs.size >= MAX_JOBS) {
    const oldest = [...batchJobs.values()].sort((a, b) => a.createdAt - b.createdAt)[0];
    if (!oldest) break;
    batchJobs.delete(oldest.id);
  }
}

/** Arranca el trabajo y devuelve su id de inmediato (no esperar el resultado) */
export function startHumanizeJob(text: string, opts: HumanizeOptions): string {
  cleanup();
  const id = crypto.randomUUID();
  const job: Job = {
    id,
    createdAt: Date.now(),
    state: { status: "processing", progress: 0, total: 0 },
  };
  jobs.set(id, job);

  void (async () => {
    try {
      const result = await humanizeText(text, opts, undefined, (done, total) => {
        if (job.state.status === "processing") {
          job.state.progress = done;
          job.state.total = total;
        }
      });
      job.state = { status: "done", result };
    } catch (e) {
      job.state = {
        status: "error",
        error: e instanceof Error ? e.message : "No se pudo humanizar el texto.",
      };
    }
  })();

  return id;
}

export function getJobState(id: string): HumanizeJobState | undefined {
  return jobs.get(id)?.state;
}

/**
 * Arranca un trabajo por lotes: procesa los archivos UNO A UNO (secuencial,
 * para no agotar la cuota del modelo) y devuelve su id de inmediato.
 */
export function startHumanizeBatchJob(
  files: { name: string; text: string }[],
  opts: HumanizeOptions
): string {
  cleanup();
  const id = crypto.randomUUID();
  const job: BatchJob = {
    id,
    createdAt: Date.now(),
    state: {
      status: "processing",
      filesTotal: files.length,
      filesDone: 0,
      currentFile: files[0]?.name ?? "",
      fileProgress: 0,
      fileTotal: 0,
    },
  };
  batchJobs.set(id, job);

  void (async () => {
    const results: BatchFileResult[] = [];
    try {
      for (const f of files) {
        if (job.state.status !== "processing") return; // seguridad
        job.state = {
          status: "processing",
          filesTotal: files.length,
          filesDone: results.length,
          currentFile: f.name,
          fileProgress: 0,
          fileTotal: 0,
        };
        const before = detectAI(f.text, opts.lang !== "auto" ? opts.lang : undefined);
        const r = await humanizeText(f.text, opts, undefined, (done, total) => {
          if (job.state.status === "processing") {
            job.state.fileProgress = done;
            job.state.fileTotal = total;
          }
        });
        results.push({
          name: f.name,
          lang: before.lang,
          before: { score: before.score, level: before.level },
          after: r.after,
          mode: r.mode,
          warnings: r.warnings,
          changes: r.changes,
          text: r.text,
        });
      }
      job.state = { status: "done", results };
    } catch (e) {
      // conservar los archivos ya procesados junto al error
      job.state = {
        status: "error",
        error:
          (e instanceof Error ? e.message : "Error al procesar el lote.") +
          (results.length ? ` (${results.length} archivo(s) sí se habían procesado.)` : ""),
        results: results.length ? results : undefined,
      };
    }
  })();

  return id;
}

export function getBatchJobState(id: string): HumanizeBatchJobState | undefined {
  return batchJobs.get(id)?.state;
}
