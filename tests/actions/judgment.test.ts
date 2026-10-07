import { beforeEach, describe, expect, it, vi } from "vitest";

const createExtraData = vi.fn();
const createReportData = vi.fn();
const castVoteData = vi.fn();
const getExtraById = vi.fn();
const getReportById = vi.fn();
const listVotesFor = vi.fn();
const setReportDefense = vi.fn();
const isMonthClosed = vi.fn();
const personExists = vi.fn();
const recordAuditLog = vi.fn();
const broadcastChanged = vi.fn();
const revalidatePath = vi.fn();
const getNumberSetting = vi.fn();
const upsertOccurrence = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/data/judgment", () => ({
  createExtra: createExtraData,
  createReport: createReportData,
  castVote: castVoteData,
  getExtraById,
  getReportById,
  listVotesFor,
  setReportDefense,
  REPORT_VOTES_NEEDED: 3,
}));
vi.mock("@/lib/data/months", () => ({ isMonthClosed }));
vi.mock("@/lib/data/people", () => ({ personExists }));
vi.mock("@/lib/data/auditLog", () => ({ recordAuditLog }));
vi.mock("@/lib/data/broadcast", () => ({ broadcastChanged }));
vi.mock("@/lib/data/settings", () => ({ getNumberSetting }));
vi.mock("@/lib/data/taskOccurrences", () => ({ upsertOccurrence }));

const { createExtra, createReport, setDefense, castVote } = await import("@/app/actions/judgment");

const AUTHOR_ID = 1;
const ACCUSED_ID = 2;
const VOTER_ID = 3;
const HAPPENED_ON = "2026-10-05";
const EXTRA_ID = "550e8400-e29b-41d4-a716-446655440000";
const REPORT_ID = "660e8400-e29b-41d4-a716-446655440000";

beforeEach(() => {
  vi.clearAllMocks();
  isMonthClosed.mockResolvedValue(false);
  personExists.mockResolvedValue(true);
  createExtraData.mockResolvedValue(EXTRA_ID);
  createReportData.mockResolvedValue(EXTRA_ID);
  castVoteData.mockResolvedValue(undefined);
  setReportDefense.mockResolvedValue(undefined);
  listVotesFor.mockResolvedValue([]);
  getNumberSetting.mockResolvedValue(3);
  upsertOccurrence.mockResolvedValue(undefined);
  recordAuditLog.mockResolvedValue(undefined);
  broadcastChanged.mockResolvedValue(undefined);
});

describe("createExtra", () => {
  it("grava, registra audit_log e revalida o Painel", async () => {
    const result = await createExtra({
      authorId: AUTHOR_ID,
      description: "lavei o carro sem ninguém pedir",
      happenedOn: HAPPENED_ON,
    });

    expect(result).toEqual({ ok: true, data: { id: EXTRA_ID } });
    expect(createExtraData).toHaveBeenCalledWith({
      authorId: AUTHOR_ID,
      description: "lavei o carro sem ninguém pedir",
      happenedOn: HAPPENED_ON,
    });
    expect(recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: AUTHOR_ID, action: "createExtra" }),
    );
    expect(broadcastChanged).toHaveBeenCalledWith({ type: "extra_created", personId: AUTHOR_ID });
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });

  it("rejeita descrição vazia sem gravar", async () => {
    const result = await createExtra({ authorId: AUTHOR_ID, description: "", happenedOn: HAPPENED_ON });

    expect(result).toEqual({ ok: false, code: "INVALID_INPUT", message: expect.any(String) });
    expect(createExtraData).not.toHaveBeenCalled();
  });

  it("recusa quando o mês já fechou", async () => {
    isMonthClosed.mockResolvedValue(true);

    const result = await createExtra({ authorId: AUTHOR_ID, description: "fiz algo", happenedOn: HAPPENED_ON });

    expect(result).toEqual({ ok: false, code: "MONTH_CLOSED", message: expect.any(String) });
    expect(createExtraData).not.toHaveBeenCalled();
  });
});

describe("createReport", () => {
  it("grava, registra audit_log e revalida o Painel", async () => {
    const result = await createReport({
      authorId: AUTHOR_ID,
      accusedId: ACCUSED_ID,
      description: "não tirou o lixo direito",
      happenedOn: HAPPENED_ON,
    });

    expect(result).toEqual({ ok: true, data: { id: EXTRA_ID } });
    expect(createReportData).toHaveBeenCalledWith({
      authorId: AUTHOR_ID,
      accusedId: ACCUSED_ID,
      description: "não tirou o lixo direito",
      happenedOn: HAPPENED_ON,
    });
    expect(broadcastChanged).toHaveBeenCalledWith({ type: "report_created", personId: AUTHOR_ID });
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });

  it("recusa dedurar a si mesmo", async () => {
    const result = await createReport({
      authorId: AUTHOR_ID,
      accusedId: AUTHOR_ID,
      description: "não tirou o lixo",
      happenedOn: HAPPENED_ON,
    });

    expect(result).toEqual({ ok: false, code: "IS_SELF", message: expect.any(String) });
    expect(createReportData).not.toHaveBeenCalled();
  });

  it("recusa acusado inexistente", async () => {
    personExists.mockResolvedValue(false);

    const result = await createReport({
      authorId: AUTHOR_ID,
      accusedId: ACCUSED_ID,
      description: "não tirou o lixo",
      happenedOn: HAPPENED_ON,
    });

    expect(result).toEqual({ ok: false, code: "PERSON_NOT_FOUND", message: expect.any(String) });
    expect(createReportData).not.toHaveBeenCalled();
  });
});

describe("setDefense", () => {
  beforeEach(() => {
    getReportById.mockResolvedValue({
      id: REPORT_ID,
      authorId: AUTHOR_ID,
      accusedId: ACCUSED_ID,
      happenedOn: HAPPENED_ON,
      taskId: null,
      dueDate: null,
    });
  });

  it("grava a defesa quando o ator é o acusado", async () => {
    const result = await setDefense({ reportId: REPORT_ID, actorId: ACCUSED_ID, defense: "eu tirei o lixo!" });

    expect(result).toEqual({ ok: true, data: undefined });
    expect(setReportDefense).toHaveBeenCalledWith(REPORT_ID, "eu tirei o lixo!");
    expect(broadcastChanged).toHaveBeenCalledWith({ type: "defense_set", personId: ACCUSED_ID });
    expect(revalidatePath).toHaveBeenCalledWith("/julgamento");
  });

  it("recusa quando quem escreve não é o acusado", async () => {
    const result = await setDefense({ reportId: REPORT_ID, actorId: AUTHOR_ID, defense: "não fiz nada" });

    expect(result).toEqual({ ok: false, code: "NOT_ACCUSED", message: expect.any(String) });
    expect(setReportDefense).not.toHaveBeenCalled();
  });

  it("recusa dedurada inexistente", async () => {
    getReportById.mockResolvedValue(null);

    const result = await setDefense({ reportId: REPORT_ID, actorId: ACCUSED_ID, defense: "defesa" });

    expect(result).toEqual({ ok: false, code: "REPORT_NOT_FOUND", message: expect.any(String) });
  });

  it("recusa quando o mês já fechou", async () => {
    isMonthClosed.mockResolvedValue(true);

    const result = await setDefense({ reportId: REPORT_ID, actorId: ACCUSED_ID, defense: "defesa" });

    expect(result).toEqual({ ok: false, code: "MONTH_CLOSED", message: expect.any(String) });
    expect(setReportDefense).not.toHaveBeenCalled();
  });
});

describe("castVote — extra", () => {
  beforeEach(() => {
    getExtraById.mockResolvedValue({ id: EXTRA_ID, authorId: AUTHOR_ID, happenedOn: HAPPENED_ON });
  });

  it("grava o voto de quem não é o autor", async () => {
    const result = await castVote({ targetKind: "extra", targetId: EXTRA_ID, voterId: VOTER_ID, value: 2 });

    expect(result).toEqual({ ok: true, data: undefined });
    expect(castVoteData).toHaveBeenCalledWith({
      targetKind: "extra",
      targetId: EXTRA_ID,
      voterId: VOTER_ID,
      value: 2,
    });
    expect(broadcastChanged).toHaveBeenCalledWith({ type: "vote_cast", personId: VOTER_ID });
  });

  it("recusa o autor votando no próprio extra", async () => {
    const result = await castVote({ targetKind: "extra", targetId: EXTRA_ID, voterId: AUTHOR_ID, value: 2 });

    expect(result).toEqual({ ok: false, code: "IS_AUTHOR", message: expect.any(String) });
    expect(castVoteData).not.toHaveBeenCalled();
  });

  it("recusa nota fora do intervalo de extra_max", async () => {
    getNumberSetting.mockResolvedValue(3);

    const result = await castVote({ targetKind: "extra", targetId: EXTRA_ID, voterId: VOTER_ID, value: 4 });

    expect(result).toEqual({ ok: false, code: "INVALID_INPUT", message: expect.any(String) });
    expect(castVoteData).not.toHaveBeenCalled();
  });

  it("recusa extra inexistente", async () => {
    getExtraById.mockResolvedValue(null);

    const result = await castVote({ targetKind: "extra", targetId: EXTRA_ID, voterId: VOTER_ID, value: 2 });

    expect(result).toEqual({ ok: false, code: "EXTRA_NOT_FOUND", message: expect.any(String) });
  });

  it("recusa quando o mês já fechou", async () => {
    isMonthClosed.mockResolvedValue(true);

    const result = await castVote({ targetKind: "extra", targetId: EXTRA_ID, voterId: VOTER_ID, value: 2 });

    expect(result).toEqual({ ok: false, code: "MONTH_CLOSED", message: expect.any(String) });
    expect(castVoteData).not.toHaveBeenCalled();
  });
});

describe("castVote — report", () => {
  beforeEach(() => {
    getReportById.mockResolvedValue({
      id: REPORT_ID,
      authorId: AUTHOR_ID,
      accusedId: ACCUSED_ID,
      happenedOn: HAPPENED_ON,
      taskId: null,
      dueDate: null,
    });
  });

  it("aceita voto 0 ou 1 de qualquer um dos três, inclusive o acusado", async () => {
    const result = await castVote({ targetKind: "report", targetId: REPORT_ID, voterId: ACCUSED_ID, value: 0 });

    expect(result).toEqual({ ok: true, data: undefined });
    expect(castVoteData).toHaveBeenCalledWith({
      targetKind: "report",
      targetId: REPORT_ID,
      voterId: ACCUSED_ID,
      value: 0,
    });
  });

  it("recusa valor fora de 0/1", async () => {
    const result = await castVote({ targetKind: "report", targetId: REPORT_ID, voterId: VOTER_ID, value: 2 });

    expect(result).toEqual({ ok: false, code: "INVALID_INPUT", message: expect.any(String) });
    expect(castVoteData).not.toHaveBeenCalled();
  });

  it("recusa dedurada inexistente", async () => {
    getReportById.mockResolvedValue(null);

    const result = await castVote({ targetKind: "report", targetId: REPORT_ID, voterId: VOTER_ID, value: 1 });

    expect(result).toEqual({ ok: false, code: "REPORT_NOT_FOUND", message: expect.any(String) });
  });

  it("vira a ocorrência contestada para 'missed' quando a contestação fica procedente", async () => {
    getReportById.mockResolvedValue({
      id: REPORT_ID,
      authorId: AUTHOR_ID,
      accusedId: ACCUSED_ID,
      happenedOn: HAPPENED_ON,
      taskId: "task-1",
      dueDate: "2026-10-05",
    });
    listVotesFor.mockResolvedValue([
      { voterId: AUTHOR_ID, value: 1 },
      { voterId: VOTER_ID, value: 1 },
      { voterId: ACCUSED_ID, value: 0 },
    ]);

    const result = await castVote({ targetKind: "report", targetId: REPORT_ID, voterId: VOTER_ID, value: 1 });

    expect(result).toEqual({ ok: true, data: undefined });
    expect(upsertOccurrence).toHaveBeenCalledWith(
      expect.objectContaining({ taskId: "task-1", dueDate: "2026-10-05", status: "missed" }),
    );
  });

  it("não toca na ocorrência quando a contestação fica improcedente", async () => {
    getReportById.mockResolvedValue({
      id: REPORT_ID,
      authorId: AUTHOR_ID,
      accusedId: ACCUSED_ID,
      happenedOn: HAPPENED_ON,
      taskId: "task-1",
      dueDate: "2026-10-05",
    });
    listVotesFor.mockResolvedValue([
      { voterId: AUTHOR_ID, value: 0 },
      { voterId: VOTER_ID, value: 0 },
      { voterId: ACCUSED_ID, value: 0 },
    ]);

    const result = await castVote({ targetKind: "report", targetId: REPORT_ID, voterId: VOTER_ID, value: 0 });

    expect(result).toEqual({ ok: true, data: undefined });
    expect(upsertOccurrence).not.toHaveBeenCalled();
  });

  it("não toca na ocorrência quando a dedurada não tem task_id (não é contestação)", async () => {
    listVotesFor.mockResolvedValue([
      { voterId: AUTHOR_ID, value: 1 },
      { voterId: VOTER_ID, value: 1 },
      { voterId: ACCUSED_ID, value: 0 },
    ]);

    const result = await castVote({ targetKind: "report", targetId: REPORT_ID, voterId: VOTER_ID, value: 1 });

    expect(result).toEqual({ ok: true, data: undefined });
    expect(upsertOccurrence).not.toHaveBeenCalled();
  });
});
