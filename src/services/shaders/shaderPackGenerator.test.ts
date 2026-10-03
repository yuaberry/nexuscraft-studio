import { describe, expect, it } from "vitest";
import { getShaderStyle } from "./shaderStyleCatalog";
import {
  generateShaderPack,
  slugifyPackName,
  type ShaderPackFile,
} from "./shaderPackGenerator";

function filesByPath(files: ShaderPackFile[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const file of files) {
    map[file.path] = file.content;
  }
  return map;
}

describe("shader pack generator", () => {
  it("generates the Iris/OptiFire pack structure", () => {
    const style = getShaderStyle("bsl")!;
    const pack = generateShaderPack(style, "My BSL Look");
    expect(pack.slug).toBe("my-bsl-look");
    const map = filesByPath(pack.files);
    expect(map["shaders/composite.vsh"]).toContain("#version 120");
    expect(map["shaders/composite.fsh"]).toContain("#version 120");
    expect(map["shaders/composite.fsh"]).toContain("colortex0");
    expect(map["shaders/composite.fsh"]).toContain("depthtex0");
    expect(map["shaders.properties"]).toContain("bsl");
    expect(map["README.txt"]).toContain("100% original");
  });

  it("bakes the preset values into the fragment shader", () => {
    const style = getShaderStyle("seus")!;
    const map = filesByPath(generateShaderPack(style, "Seus Drama").files);
    const fsh = map["shaders/composite.fsh"];
    expect(fsh).toContain(`#define NC_EXPOSURE ${style.params.exposure.toFixed(3)}`);
    expect(fsh).toContain(`#define NC_CONTRAST ${style.params.contrast.toFixed(3)}`);
    expect(fsh).toContain(`#define NC_GODRAYS ${style.params.godRays.toFixed(3)}`);
    const [r, g, b] = style.params.sunColor;
    expect(fsh).toContain(
      `#define NC_SUN_COLOR vec3(${(r / 255).toFixed(3)}, ${(g / 255).toFixed(3)}, ${(b / 255).toFixed(3)})`,
    );
  });

  it("emits only the selected tonemap curve", () => {
    const aces = filesByPath(generateShaderPack(getShaderStyle("bsl")!, "A").files)[
      "shaders/composite.fsh"
    ];
    expect(aces).toContain("ncTonemap");
    expect(aces).toContain("ACES");

    const linear = filesByPath(generateShaderPack(getShaderStyle("ctr")!, "B").files)[
      "shaders/composite.fsh"
    ];
    expect(linear).toContain("Linear clamp");
    expect(linear).not.toContain("ACES");
  });

  it("leaves no template tokens and keeps GLSL braces balanced", () => {
    for (const style of [getShaderStyle("bsl")!, getShaderStyle("spooklementary")!]) {
      for (const file of generateShaderPack(style, `Pack ${style.id}`).files) {
        expect(file.content).not.toContain("{{");
        if (file.path.endsWith(".vsh") || file.path.endsWith(".fsh")) {
          expect(file.content).not.toContain("undefined");
          expect(file.content).not.toContain("NaN");
          const opens = (file.content.match(/\{/g) ?? []).length;
          const closes = (file.content.match(/\}/g) ?? []).length;
          expect(opens).toBe(closes);
          const parens = (file.content.match(/\(/g) ?? []).length;
          const parensClose = (file.content.match(/\)/g) ?? []).length;
          expect(parens).toBe(parensClose);
        }
      }
    }
  });

  it("writes a parseable manifest consumed by the Rust backend", () => {
    const style = getShaderStyle("solas")!;
    const map = filesByPath(generateShaderPack(style, "Solas Sun", "2026-10-02T00:00:00Z").files);
    const manifest = JSON.parse(map["nexuscraft.json"]) as {
      name: string;
      styleId: string;
      createdAt: string;
      params: unknown;
    };
    expect(manifest.name).toBe("Solas Sun");
    expect(manifest.styleId).toBe("solas");
    expect(manifest.createdAt).toBe("2026-10-02T00:00:00Z");
    expect(manifest.params).toEqual(style.params);
  });

  it("refuses invalid preset params (defense in depth)", () => {
    const style = getShaderStyle("bsl")!;
    const broken = { ...style, params: { ...style.params, exposure: 9.9 } };
    expect(() => generateShaderPack(broken, "Broken")).toThrow(/out of range/);
  });

  it("slugifies pack names safely", () => {
    expect(slugifyPackName("BSL — Cinematic Look!")).toBe("bsl-cinematic-look");
    expect(slugifyPackName("  Photon 2 ")).toBe("photon-2");
    expect(() => slugifyPackName("---")).toThrow();
    expect(() => slugifyPackName("")).toThrow();
  });
});
