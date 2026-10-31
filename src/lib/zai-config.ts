import fs from "fs/promises";
import os from "os";
import path from "path";

let attempted = false;

/**
 * Permite usar el modelo de lenguaje fuera de este entorno de desarrollo
 * (p. ej. en Vercel) sin archivo de credenciales en el repositorio.
 *
 * El SDK `z-ai-web-dev-sdk` lee su configuración de un archivo `.z-ai-config`
 * en el directorio de trabajo, el HOME del usuario o /etc. En una plataforma
 * serverless esos directorios no son accesibles, así que si el usuario define
 * las variables de entorno `ZAI_API_KEY` y `ZAI_BASE_URL` escribimos ese
 * archivo por nosotros en tiempo de ejecución (HOME=/tmp en Vercel es
 * escribible y el SDK lo admite vía HOME).
 *
 * Sin estas variables no hace nada: la app degrada al modo reglas.
 */
export async function ensureZaiConfig(): Promise<void> {
  if (attempted) return;
  attempted = true;

  const apiKey = process.env.ZAI_API_KEY;
  const baseUrl = process.env.ZAI_BASE_URL;
  if (!apiKey || !baseUrl) return;

  const payload = JSON.stringify({ baseUrl, apiKey });

  // HOME (Vercel: /tmp; el SDK lo consulta vía os.homedir())
  try {
    await fs.writeFile(path.join(os.homedir(), ".z-ai-config"), payload, {
      encoding: "utf-8",
      flag: "wx", // no sobrescribir una configuración existente
    });
  } catch {
    /* ya existe o HOME no escribible: sin importancia */
  }

  // directorio de trabajo (primer lugar que consulta el SDK)
  try {
    await fs.writeFile(path.join(process.cwd(), ".z-ai-config"), payload, {
      encoding: "utf-8",
      flag: "wx",
    });
  } catch {
    /* solo lectura en serverless: sin importancia */
  }
}
