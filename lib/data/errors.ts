// Mapeia erros do Postgres para erros de domínio da camada de dados, sem
// vazar detalhes do banco para quem chama (seção 10).

/** Espelha o trigger de mês fechado (SQLSTATE 'MC001', seção 6 / migração 0002). */
export class MonthClosedError extends Error {}

interface PostgrestLikeError {
  code?: string | null;
  message: string;
}

export function mapDataError(error: PostgrestLikeError): Error {
  if (error.code === "MC001") return new MonthClosedError(error.message);
  return new Error(error.message);
}
