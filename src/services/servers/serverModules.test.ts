import { describe, expect, it } from "vitest";
import {
  generateSelectedModules,
  generateModuleFiles,
} from "./serverModules";

describe("serverModules", () => {
  it("generates economy datapack with pack.mcmeta and functions", () => {
    const files = generateModuleFiles("economy");
    const paths = files.map((f) => f.path);
    expect(paths).toContain("world/datapacks/nexus_economy/pack.mcmeta");
    expect(paths.some((p) => p.includes("tick.mcfunction"))).toBe(true);
    expect(paths.some((p) => p.includes("balance.mcfunction"))).toBe(true);
  });

  it("generates prison datapack with rank progression", () => {
    const files = generateModuleFiles("prison");
    const load = files.find((f) => f.path.includes("load.mcfunction"));
    expect(load).toBeDefined();
    expect(load!.content).toContain("nexus_rank");
    const progress = files.find((f) => f.path.includes("progress.mcfunction"));
    expect(progress!.content).toContain("nexus_rank");
  });

  it("generates token datapack with market routing", () => {
    const files = generateModuleFiles("token");
    const route = files.find((f) => f.path.includes("market_route"));
    expect(route).toBeDefined();
    expect(route!.content).toContain("buy_5");
  });

  it("mixes modules without namespace collisions", () => {
    const files = generateSelectedModules(["economy", "prison", "token"]);
    // every datapack has its own root
    const roots = new Set(files.map((f) => f.path.split("/")[2]));
    expect(roots).toEqual(new Set(["nexus_economy", "nexus_prison", "nexus_token"]));
    // no duplicate full paths
    const all = files.map((f) => f.path);
    expect(new Set(all).size).toBe(all.length);
  });

  it("pack format is 15 (MC 1.20.1)", () => {
    const files = generateModuleFiles("economy");
    const mcmeta = JSON.parse(
      files.find((f) => f.path.endsWith("pack.mcmeta"))!.content,
    );
    expect(mcmeta.pack.pack_format).toBe(15);
  });
});
