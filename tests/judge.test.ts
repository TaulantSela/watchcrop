import { describe, expect, it } from "vitest";
import { afterBrand, judgeGuess } from "@/lib/normalize";

const brandAliases = new Map([
  ["ap", "audemars piguet"],
  ["gshock", "casio"],
]);
const modelAliases = new Map([["sub", "submariner"]]);
const rolex = { brand: "Rolex", model: "Submariner" };
const ap = { brand: "Audemars Piguet", model: "Royal Oak" };

describe("afterBrand", () => {
  it("returns what follows the brand", () => {
    expect(afterBrand("Rolex Submariner", "Rolex", new Map())).toBe("submariner");
    expect(afterBrand("rolex", "Rolex", new Map())).toBe("");
  });

  it("resolves brand aliases", () => {
    expect(afterBrand("AP Royal Oak", "Audemars Piguet", brandAliases)).toBe("royal oak");
  });

  it("only matches whole leading words", () => {
    expect(afterBrand("Grand Seiko SBGA211", "Seiko", new Map())).toBeNull();
    expect(afterBrand("Rolexx", "Rolex", new Map())).toBeNull();
  });
});

describe("judgeGuess", () => {
  it("brand stage: a right brand alone is brand-correct, not solved", () => {
    expect(judgeGuess({ brand: "rolex", model: "" }, rolex, new Map(), modelAliases)).toEqual({
      brandCorrect: true,
      modelCorrect: false,
      modelGuess: "",
    });
  });

  it("brand stage: an alias counts", () => {
    expect(judgeGuess({ brand: "AP", model: "" }, ap, brandAliases, new Map()).brandCorrect).toBe(true);
  });

  it("brand stage: a full 'Brand Model' guess solves outright", () => {
    const j = judgeGuess({ brand: "Rolex Sub", model: "" }, rolex, new Map(), modelAliases);
    expect(j.brandCorrect && j.modelCorrect).toBe(true);
  });

  it("brand stage: right brand + wrong model is still brand-correct", () => {
    const j = judgeGuess({ brand: "Rolex Daytona", model: "" }, rolex, new Map(), modelAliases);
    expect(j).toMatchObject({ brandCorrect: true, modelCorrect: false });
  });

  it("model stage: ignores a leading brand typed into the model box", () => {
    const j = judgeGuess({ brand: "Rolex", model: "Rolex Submariner" }, rolex, new Map(), new Map());
    expect(j).toMatchObject({ brandCorrect: true, modelCorrect: true, modelGuess: "submariner" });
  });

  it("model stage: a different brand's model is wrong", () => {
    const j = judgeGuess({ brand: "Rolex", model: "Tudor Black Bay" }, rolex, new Map(), new Map());
    expect(j.modelCorrect).toBe(false);
  });

  it("an empty brand (skip/give up) is never correct", () => {
    expect(judgeGuess({ brand: "", model: "" }, rolex, new Map(), modelAliases)).toMatchObject({
      brandCorrect: false,
      modelCorrect: false,
    });
  });
});
