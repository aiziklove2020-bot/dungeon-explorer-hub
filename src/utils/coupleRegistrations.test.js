import { describe, it, expect } from "vitest";
import { normalizeCoupleRegistrations } from "./coupleRegistrations";

describe("normalizeCoupleRegistrations", () => {
  it("fixes a woman saved as male and pairs the halves", () => {
    const out = normalizeCoupleRegistrations([
      {
        phoneNumber: "0501111111",
        partnerPhone: "0522222222",
        registrationType: "single-male-couple",
        gender: "male",
      },
      {
        phoneNumber: "0522222222",
        partnerPhone: "0501111111",
        registrationType: "single-female-couple",
        gender: "male",
      },
    ]);
    expect(out[1].gender).toBe("female");
    expect(out[0].coupleId).toBeTruthy();
    expect(out[0].coupleId).toBe(out[1].coupleId);
  });
  it("leaves singles untouched", () => {
    const reg = {
      phoneNumber: "0503333333",
      registrationType: "single-male-balance",
      gender: "male",
    };
    expect(normalizeCoupleRegistrations([reg])[0]).toBe(reg);
  });
});
