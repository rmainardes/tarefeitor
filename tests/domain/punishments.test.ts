import { describe, expect, it } from "vitest";
import { PUNISHMENT_IDS, isPunishmentId, pickPunishment } from "@/lib/domain/punishments";

describe("pickPunishment", () => {
  it("escolhe o primeiro castigo perto de 0", () => {
    expect(pickPunishment(0)).toBe("arlete");
  });

  it("escolhe o do meio em torno de 1/3 a 2/3", () => {
    expect(pickPunishment(0.5)).toBe("nonna");
  });

  it("escolhe o último perto de 1 (exclusivo)", () => {
    expect(pickPunishment(0.999999)).toBe("vanderlei");
  });

  it("nunca sai do catálogo mesmo fora de [0,1]", () => {
    expect(PUNISHMENT_IDS).toContain(pickPunishment(-1));
    expect(PUNISHMENT_IDS).toContain(pickPunishment(1));
    expect(PUNISHMENT_IDS).toContain(pickPunishment(2));
  });
});

describe("isPunishmentId", () => {
  it("aceita só os três ids do catálogo", () => {
    expect(isPunishmentId("arlete")).toBe(true);
    expect(isPunishmentId("nonna")).toBe(true);
    expect(isPunishmentId("outro")).toBe(false);
    expect(isPunishmentId(123)).toBe(false);
  });
});
