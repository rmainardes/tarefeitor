import { beforeEach, describe, expect, it, vi } from "vitest";

const createExtraData = vi.fn();
const createReportData = vi.fn();
const isMonthClosed = vi.fn();
const personExists = vi.fn();
const recordAuditLog = vi.fn();
const revalidatePath = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/data/judgment", () => ({
  createExtra: createExtraData,
  createReport: createReportData,
}));
vi.mock("@/lib/data/months", () => ({ isMonthClosed }));
vi.mock("@/lib/data/people", () => ({ personExists }));
vi.mock("@/lib/data/auditLog", () => ({ recordAuditLog }));

const { createExtra, createReport } = await import("@/app/actions/judgment");

const AUTHOR_ID = 1;
const ACCUSED_ID = 2;
const HAPPENED_ON = "2026-10-05";
const EXTRA_ID = "550e8400-e29b-41d4-a716-446655440000";

beforeEach(() => {
  vi.clearAllMocks();
  isMonthClosed.mockResolvedValue(false);
  personExists.mockResolvedValue(true);
  createExtraData.mockResolvedValue(EXTRA_ID);
  createReportData.mockResolvedValue(EXTRA_ID);
  recordAuditLog.mockResolvedValue(undefined);
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
