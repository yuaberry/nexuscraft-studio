import { describe, expect, it } from "vitest";
import {
  SHADER_CATEGORIES,
  SHADER_STYLES,
  getShaderStyle,
  validateStyleParams,
} from "@voxel/core/shaderStyleCatalog";

describe("shader style catalog", () => {
  it("has all 32 iconic style presets", () => {
    expect(SHADER_STYLES.length).toBe(32);
  });

  it("has unique ids and names", () => {
    const ids = new Set(SHADER_STYLES.map((s) => s.id));
    const names = new Set(SHADER_STYLES.map((s) => s.name));
    expect(ids.size).toBe(32);
    expect(names.size).toBe(32);
  });

  it("covers every requested style name (the owner's list)", () => {
    const wanted = [
      "Alpha Piscium",
      "Derivative",
      "Solas",
      "Reverie",
      "Photon",
      "Kappa",
      "Astralex",
      "Fantasy Unbound",
      "Ripple",
      "Complementary Reimagined",
      "SEUS",
      "BSL",
      "Fantasy",
      "Bliss",
      "Spooklementary",
      "E-Lite",
      "EmanRux",
      "Iteration T",
      "Sundial",
      "UShader",
      "Verlixia",
      "Moz",
      "Nostalgia",
      "CTR",
      "Adistira",
      "Hysteria",
      "Shrimple",
      "SuperDuperVanilla",
      "Sildur's Vibrant",
      "VTXS",
      "N87",
      "Vanilletix",
    ];
    const names = new Set(SHADER_STYLES.map((s) => s.name));
    for (const name of wanted) {
      expect(names.has(name), `missing style: ${name}`).toBe(true);
    }
  });

  it("every preset passes range validation", () => {
    for (const style of SHADER_STYLES) {
      const errors = validateStyleParams(style.params);
      expect(errors, `${style.id}: ${errors.join("; ")}`).toEqual([]);
    }
  });

  it("every preset has a valid category and honest source link", () => {
    for (const style of SHADER_STYLES) {
      expect(SHADER_CATEGORIES).toContain(style.category);
      expect(style.tagline.length).toBeGreaterThan(8);
      // Honest attribution: a public search for the original, never a
      // redistribution endpoint.
      expect(style.sourceUrl.startsWith("https://modrinth.com/shaders?q=")).toBe(
        true,
      );
      expect(style.sourceUrl).toContain(encodeURIComponent(style.name));
    }
  });

  it("style ids are slug-safe", () => {
    for (const style of SHADER_STYLES) {
      expect(style.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it("styles are visually distinct (no two presets are identical)", () => {
    const signatures = new Set(
      SHADER_STYLES.map((s) => JSON.stringify(s.params)),
    );
    expect(signatures.size).toBe(32);
  });

  it("getShaderStyle finds by id", () => {
    expect(getShaderStyle("bsl")?.name).toBe("BSL");
    expect(getShaderStyle("does-not-exist")).toBeUndefined();
  });

  it("validateStyleParams flags out-of-range values", () => {
    const base = getShaderStyle("bsl")!;
    const broken = {
      ...base.params,
      exposure: 5.0,
      vignette: -0.1,
      skyTop: [300, 0, 0] as const,
    };
    const errors = validateStyleParams(broken);
    expect(errors.some((e) => e.includes("exposure"))).toBe(true);
    expect(errors.some((e) => e.includes("vignette"))).toBe(true);
    expect(errors.some((e) => e.includes("skyTop"))).toBe(true);
  });
});
