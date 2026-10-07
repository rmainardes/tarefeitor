import { beforeEach, describe, expect, it, vi } from "vitest";

const insertBirthday = vi.fn();
const personExists = vi.fn();
const recordAuditLog = vi.fn();
const revalidatePath = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/data/birthdays", () => ({ insertBirthday }));
vi.mock("@/lib/data/people", () => ({ personExists }));
vi.mock("@/lib/data/auditLog", () => ({ recordAuditLog }));

const { createBirthday } = await import("@/app/actions/birthdays");

const CREATED_BY = 1;
const BIRTHDAY_ID = "b1111111-1111-1111-1111-111111111111";

beforeEach(() => {
  vi.clearAllMocks();
  personExists.mockResolvedValue(true);
  insertBirthday.mockResolvedValue(BIRTHDAY_ID);
  recordAuditLog.mockResolvedValue(undefined);
});

describe("createBirthday", () => {
  it("cadastra com nome, dia, mês e ano", async () => {
    const result = await createBirthday({
      name: "Tio Vanderlei",
      day: 6,
      month: 10,
      birthYear: 1970,
      createdBy: CREATED_BY,
    });

    expect(result).toEqual({ ok: true, data: { id: BIRTHDAY_ID } });
    expect(insertBirthday).toHaveBeenCalledWith({
      name: "Tio Vanderlei",
      day: 6,
      month: 10,
      birthYear: 1970,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "createBirthday", actorId: CREATED_BY }),
    );
  });

  it("ano é opcional", async () => {
    const result = await createBirthday({
      name: "Pingo",
      day: 28,
      month: 10,
      birthYear: null,
      createdBy: CREATED_BY,
    });

    expect(result.ok).toBe(true);
    expect(insertBirthday).toHaveBeenCalledWith({ name: "Pingo", day: 28, month: 10, birthYear: null });
  });

  it("rejeita nome vazio sem consultar o banco", async () => {
    const result = await createBirthday({ name: "  ", day: 6, month: 10, birthYear: null, createdBy: CREATED_BY });

    expect(result).toEqual({ ok: false, code: "INVALID_INPUT", message: expect.any(String) });
    expect(insertBirthday).not.toHaveBeenCalled();
  });

  it("rejeita dia fora de 1-31", async () => {
    const result = await createBirthday({ name: "Alguém", day: 32, month: 10, birthYear: null, createdBy: CREATED_BY });
    expect(result).toEqual({ ok: false, code: "INVALID_INPUT", message: expect.any(String) });
  });

  it("rejeita mês fora de 1-12", async () => {
    const result = await createBirthday({ name: "Alguém", day: 6, month: 13, birthYear: null, createdBy: CREATED_BY });
    expect(result).toEqual({ ok: false, code: "INVALID_INPUT", message: expect.any(String) });
  });

  it("rejeita ano de nascimento implausível", async () => {
    const result = await createBirthday({ name: "Alguém", day: 6, month: 10, birthYear: 1800, createdBy: CREATED_BY });
    expect(result).toEqual({ ok: false, code: "INVALID_INPUT", message: expect.any(String) });
  });

  it("rejeita quando quem cadastra não existe", async () => {
    personExists.mockResolvedValue(false);
    const result = await createBirthday({ name: "Alguém", day: 6, month: 10, birthYear: null, createdBy: CREATED_BY });

    expect(result).toEqual({ ok: false, code: "PERSON_NOT_FOUND", message: expect.any(String) });
    expect(insertBirthday).not.toHaveBeenCalled();
  });
});
