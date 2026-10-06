import { beforeEach, describe, expect, it, vi } from "vitest";

const personExists = vi.fn();
const revalidatePath = vi.fn();
const cookieSet = vi.fn();
const cookies = vi.fn(async () => ({ set: cookieSet }));

vi.mock("@/lib/data/people", () => ({ personExists }));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/headers", () => ({ cookies }));

const { selectPerson } = await import("@/app/actions/session");
const { SELECTED_PERSON_COOKIE } = await import("@/lib/session");

beforeEach(() => {
  vi.clearAllMocks();
  personExists.mockResolvedValue(true);
});

describe("selectPerson", () => {
  it("grava o cookie da pessoa selecionada e revalida o Painel", async () => {
    await selectPerson(2);

    expect(cookieSet).toHaveBeenCalledWith(
      SELECTED_PERSON_COOKIE,
      "2",
      expect.objectContaining({ path: "/" }),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });

  it("ignora um id que não é uma pessoa válida (não inteiro positivo)", async () => {
    await selectPerson(-1);

    expect(cookieSet).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("ignora um id que não existe em people", async () => {
    personExists.mockResolvedValue(false);

    await selectPerson(99);

    expect(cookieSet).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
