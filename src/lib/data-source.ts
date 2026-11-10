import "reflect-metadata";
import fs from "fs";
import { DataSource } from "typeorm";
import { Agendamento } from "@/entities/Agendamento";
import { Usuario } from "@/entities/Usuario";

// Carrega .env caso exista (útil para scripts isolados como o seed fora do Next.js)
if (fs.existsSync(".env")) {
  try {
    if (typeof process.loadEnvFile === "function") {
      process.loadEnvFile(".env");
    }
  } catch {
    // Silencioso se variáveis já estiverem no ambiente
  }
}

const port = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306;
const useSsl = process.env.DB_SSL === "true" || process.env.DB_SSL === "1";

declare global {
  // eslint-disable-next-line no-var
  var typeormDataSource: DataSource | undefined;
  // eslint-disable-next-line no-var
  var typeormInitPromise: Promise<DataSource> | undefined;
}

export const AppDataSource =
  globalThis.typeormDataSource ??
  new DataSource({
    type: "mysql",
    host: process.env.DB_HOST || "localhost",
    port: isNaN(port) ? 3306 : port,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    synchronize: false,
    logging: process.env.NODE_ENV === "development",
    entities: [Agendamento, Usuario],
    migrations: [],
    subscribers: [],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.typeormDataSource = AppDataSource;
}

export async function getDataSource(): Promise<DataSource> {
  if (AppDataSource.isInitialized) {
    return AppDataSource;
  }

  if (!globalThis.typeormInitPromise) {
    globalThis.typeormInitPromise = AppDataSource.initialize().catch((error) => {
      globalThis.typeormInitPromise = undefined;
      throw error;
    });
  }

  return globalThis.typeormInitPromise;
}

