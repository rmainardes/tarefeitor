import { beforeEach, describe, expect, it, vi } from "vitest";

const isMonthClosed = vi.fn();
const closeMonthTransaction = vi.fn();
const getMonthResult = vi.fn();
const setPunishmentIfEmpty = vi.fn();
const getMonthReadiness = vi.fn();
const resolveLastDayPendencies = vi.fn();
const buildMonthSnapshot = vi.fn();
const personExists = vi.fn();
const recordAuditLog = vi.fn();
const broadcastChanged = vi.fn();
const revalidatePath = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/data/months", async () => {
  const actual = await vi.importActual<typeof import("@/lib/data/months")>("@/lib/data/months");
  return {
    AlreadyClosedError: actual.AlreadyClosedError,
    isMonthClosed,
    closeMonthTransaction,
    getMonthResult,
    setPunishmentIfEmpty,
  };
});
vi.mock("@/lib/data/monthScoring", () => ({
  getMonthReadiness,
  resolveLastDayPendencies,
  buildMonthSnapshot,
}));
vi.mock("@/lib/data/people", () => ({ personExists }));
vi.mock("@/lib/data/auditLog", () => ({ recordAuditLog }));
vi.mock("@/lib/data/broadcast", () => ({ broadcastChanged }));

const { closeMonth, spinPunishment } = await import("@/app/actions/month");
const { AlreadyClosedError } = await import("@/lib/data/months");

const MONTH = "2026-09-01";
const ACTOR_ID = 1;

beforeEach(() => {
  vi.clearAllMocks();
  personExists.mockResolvedValue(true);
  isMonthClosed.mockResolvedValue(false);
  getMonthReadiness.mockResolvedValue({
    monthOver: true,
    votesComplete: true,
    pendingJudgments: 0,
    ready: true,
  });
  resolveLastDayPendencies.mockResolvedValue(undefined);
  buildMonthSnapshot.mockResolvedValue({ scores: [{ personId: 1, rank: 1 }], summary: {} });
  closeMonthTransaction.mockResolvedValue(undefined);
  recordAuditLog.mockResolvedValue(undefined);
  broadcastChanged.mockResolvedValue(undefined);
  setPunishmentIfEmpty.mockResolvedValue(true);
});

describe("closeMonth", () => {
  it("resolve as pendências, grava a transação e revalida as páginas", async () => {
    const result = await closeMonth({ month: MONTH, actorId: ACTOR_ID });

    expect(result).toEqual({ ok: true, data: { month: MONTH } });
    expect(resolveLastDayPendencies).toHaveBeenCalledWith(MONTH, ACTOR_ID);
    expect(buildMonthSnapshot).toHaveBeenCalledWith(MONTH);
    expect(closeMonthTransaction).toHaveBeenCalledWith({
      month: MONTH,
      closedBy: ACTOR_ID,
      summary: {},
      scores: [{ personId: 1, rank: 1 }],
    });
    expect(broadcastChanged).toHaveBeenCalledWith({ type: "month_closed", personId: ACTOR_ID });
    expect(revalidatePath).toHaveBeenCalledWith("/julgamento");
    expect(revalidatePath).toHaveBeenCalledWith("/cerimonia/2026-09");
    expect(revalidatePath).toHaveBeenCalledWith("/hall-da-fama");
  });

  it("rejeita mês que não é dia 1", async () => {
    const result = await closeMonth({ month: "2026-09-15", actorId: ACTOR_ID });

    expect(result).toEqual({ ok: false, code: "INVALID_INPUT", message: expect.any(String) });
    expect(closeMonthTransaction).not.toHaveBeenCalled();
  });

  it("recusa mês já fechado", async () => {
    isMonthClosed.mockResolvedValue(true);

    const result = await closeMonth({ month: MONTH, actorId: ACTOR_ID });

    expect(result).toEqual({ ok: false, code: "MONTH_CLOSED", message: expect.any(String) });
    expect(closeMonthTransaction).not.toHaveBeenCalled();
  });

  it("recusa fechar antes do mês acabar", async () => {
    getMonthReadiness.mockResolvedValue({
      monthOver: false,
      votesComplete: true,
      pendingJudgments: 0,
      ready: false,
    });

    const result = await closeMonth({ month: MONTH, actorId: ACTOR_ID });

    expect(result).toEqual({ ok: false, code: "MONTH_NOT_READY", message: expect.any(String) });
    expect(closeMonthTransaction).not.toHaveBeenCalled();
  });

  it("recusa fechar com votos pendentes", async () => {
    getMonthReadiness.mockResolvedValue({
      monthOver: true,
      votesComplete: false,
      pendingJudgments: 2,
      ready: false,
    });

    const result = await closeMonth({ month: MONTH, actorId: ACTOR_ID });

    expect(result).toEqual({ ok: false, code: "MONTH_NOT_READY", message: expect.stringContaining("2") });
    expect(closeMonthTransaction).not.toHaveBeenCalled();
  });

  it("mapeia a corrida de fechamento duplo para MONTH_CLOSED", async () => {
    closeMonthTransaction.mockRejectedValue(new AlreadyClosedError("duplicate key"));

    const result = await closeMonth({ month: MONTH, actorId: ACTOR_ID });

    expect(result).toEqual({ ok: false, code: "MONTH_CLOSED", message: expect.any(String) });
  });
});

describe("spinPunishment", () => {
  beforeEach(() => {
    getMonthResult.mockResolvedValue({
      result: { month: MONTH, closedAt: "2026-10-01T00:00:00Z", closedBy: 1, punishment: null, summary: {} },
      scores: [],
    });
  });

  it("sorteia e grava quando ainda não houver castigo", async () => {
    const result = await spinPunishment({ month: MONTH, actorId: ACTOR_ID });

    expect(result.ok).toBe(true);
    expect(setPunishmentIfEmpty).toHaveBeenCalled();
    expect(broadcastChanged).toHaveBeenCalledWith({ type: "punishment_spun", personId: ACTOR_ID });
  });

  it("recusa mês ainda não fechado", async () => {
    getMonthResult.mockResolvedValue(null);

    const result = await spinPunishment({ month: MONTH, actorId: ACTOR_ID });

    expect(result).toEqual({ ok: false, code: "MONTH_NOT_CLOSED", message: expect.any(String) });
    expect(setPunishmentIfEmpty).not.toHaveBeenCalled();
  });

  it("devolve o castigo já sorteado sem sortear de novo", async () => {
    getMonthResult.mockResolvedValue({
      result: { month: MONTH, closedAt: "2026-10-01T00:00:00Z", closedBy: 1, punishment: "nonna", summary: {} },
      scores: [],
    });

    const result = await spinPunishment({ month: MONTH, actorId: ACTOR_ID });

    expect(result).toEqual({ ok: true, data: { punishmentId: "nonna" } });
    expect(setPunishmentIfEmpty).not.toHaveBeenCalled();
    expect(broadcastChanged).not.toHaveBeenCalled();
  });

  it("numa corrida, devolve o valor que a outra chamada gravou", async () => {
    setPunishmentIfEmpty.mockResolvedValue(false);
    getMonthResult.mockResolvedValueOnce({
      result: { month: MONTH, closedAt: "2026-10-01T00:00:00Z", closedBy: 1, punishment: null, summary: {} },
      scores: [],
    });
    getMonthResult.mockResolvedValueOnce({
      result: { month: MONTH, closedAt: "2026-10-01T00:00:00Z", closedBy: 1, punishment: "arlete", summary: {} },
      scores: [],
    });

    const result = await spinPunishment({ month: MONTH, actorId: ACTOR_ID });

    expect(result).toEqual({ ok: true, data: { punishmentId: "arlete" } });
    expect(broadcastChanged).not.toHaveBeenCalled();
  });
});
