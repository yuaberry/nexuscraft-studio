/**
 * NexusCraft Shader Studio — style presets.
 *
 * Each preset tunes the NexusCraft shader engine (100% original GLSL,
 * generated in `shaderPackGenerator.ts`) to evoke the look of an iconic
 * community shaderpack. Nothing from third-party packs is copied or
 * redistributed — `sourceUrl` points at a public search for the original
 * so users can credit and download it from its actual author.
 *
 * Ranges are enforced by `validateStyleParams` and covered by tests.
 */

export type Rgb = readonly [number, number, number];

export type TonemapKind = "aces" | "reinhard" | "filmic" | "none";

export type ShaderStyleCategory =
  | "cinematic"
  | "vibrant"
  | "natural"
  | "dreamy"
  | "performance";

export interface ShaderStyleParams {
  /** HDR curve applied before display */
  tonemap: TonemapKind;
  /** 0.60–1.60 */
  exposure: number;
  /** 0.85–1.35 */
  contrast: number;
  /** 0.55–1.60 */
  saturation: number;
  /** 0.00–1.00 — boosts muted colors more than already-saturated ones */
  vibrance: number;
  /** -0.30–0.30 — cool (negative) to warm (positive) */
  temperature: number;
  /** 0.00–1.00 */
  bloomStrength: number;
  /** 0.55–1.10 — luminance above which bloom triggers */
  bloomThreshold: number;
  /** 0.00–1.00 — screen-space sun shafts */
  godRays: number;
  /** 0.00–1.00 — depth-based atmospheric fog */
  fogDensity: number;
  /** 0.00–0.60 */
  vignette: number;
  /** Sky gradient + sun tint, 0–255 per channel */
  skyTop: Rgb;
  skyHorizon: Rgb;
  sunColor: Rgb;
}

export interface ShaderStyle {
  id: string;
  name: string;
  tagline: string;
  category: ShaderStyleCategory;
  params: ShaderStyleParams;
  /** Public search for the iconic original — we redistribute nothing. */
  sourceUrl: string;
}

const modrinthSearch = (name: string): string =>
  `https://modrinth.com/shaders?q=${encodeURIComponent(name)}`;

const STYLES: Array<Omit<ShaderStyle, "sourceUrl">> = [
  {
    id: "alpha-piscium",
    name: "Alpha Piscium",
    tagline: "Deep starlit blues and a soft heavenly glow",
    category: "dreamy",
    params: {
      tonemap: "aces",
      exposure: 1.0,
      contrast: 1.05,
      saturation: 0.95,
      vibrance: 0.3,
      temperature: -0.1,
      bloomStrength: 0.55,
      bloomThreshold: 0.7,
      godRays: 0.35,
      fogDensity: 0.3,
      vignette: 0.25,
      skyTop: [10, 20, 64],
      skyHorizon: [61, 90, 158],
      sunColor: [207, 224, 255],
    },
  },
  {
    id: "derivative",
    name: "Derivative",
    tagline: "Bright, clean and minimal — clarity above all",
    category: "performance",
    params: {
      tonemap: "aces",
      exposure: 1.15,
      contrast: 1.0,
      saturation: 1.0,
      vibrance: 0.15,
      temperature: 0.0,
      bloomStrength: 0.15,
      bloomThreshold: 0.95,
      godRays: 0.1,
      fogDensity: 0.1,
      vignette: 0.05,
      skyTop: [74, 144, 217],
      skyHorizon: [191, 227, 255],
      sunColor: [255, 255, 255],
    },
  },
  {
    id: "solas",
    name: "Solas",
    tagline: "Color-drenched skies with a warm signature glow",
    category: "vibrant",
    params: {
      tonemap: "filmic",
      exposure: 1.05,
      contrast: 1.12,
      saturation: 1.35,
      vibrance: 0.6,
      temperature: 0.12,
      bloomStrength: 0.4,
      bloomThreshold: 0.75,
      godRays: 0.45,
      fogDensity: 0.25,
      vignette: 0.15,
      skyTop: [45, 108, 223],
      skyHorizon: [255, 217, 160],
      sunColor: [255, 233, 176],
    },
  },
  {
    id: "reverie",
    name: "Reverie",
    tagline: "Dreamy pastels wrapped in soft light haze",
    category: "dreamy",
    params: {
      tonemap: "aces",
      exposure: 1.1,
      contrast: 0.92,
      saturation: 0.9,
      vibrance: 0.25,
      temperature: 0.06,
      bloomStrength: 0.65,
      bloomThreshold: 0.62,
      godRays: 0.25,
      fogDensity: 0.4,
      vignette: 0.18,
      skyTop: [126, 159, 212],
      skyHorizon: [255, 214, 201],
      sunColor: [255, 243, 224],
    },
  },
  {
    id: "photon",
    name: "Photon",
    tagline: "Physically-inspired, neutral and true to life",
    category: "natural",
    params: {
      tonemap: "aces",
      exposure: 1.0,
      contrast: 1.08,
      saturation: 1.05,
      vibrance: 0.2,
      temperature: 0.0,
      bloomStrength: 0.3,
      bloomThreshold: 0.8,
      godRays: 0.3,
      fogDensity: 0.15,
      vignette: 0.12,
      skyTop: [58, 123, 213],
      skyHorizon: [207, 232, 255],
      sunColor: [255, 255, 255],
    },
  },
  {
    id: "kappa",
    name: "Kappa",
    tagline: "Cozy warmth with gentle, inviting light",
    category: "natural",
    params: {
      tonemap: "aces",
      exposure: 1.02,
      contrast: 1.05,
      saturation: 1.1,
      vibrance: 0.3,
      temperature: 0.1,
      bloomStrength: 0.35,
      bloomThreshold: 0.75,
      godRays: 0.25,
      fogDensity: 0.2,
      vignette: 0.15,
      skyTop: [74, 134, 200],
      skyHorizon: [255, 227, 184],
      sunColor: [255, 240, 200],
    },
  },
  {
    id: "astralex",
    name: "Astralex",
    tagline: "Fantasy neon skies with saturated dusk colors",
    category: "vibrant",
    params: {
      tonemap: "filmic",
      exposure: 1.0,
      contrast: 1.15,
      saturation: 1.4,
      vibrance: 0.65,
      temperature: -0.05,
      bloomStrength: 0.5,
      bloomThreshold: 0.68,
      godRays: 0.4,
      fogDensity: 0.3,
      vignette: 0.22,
      skyTop: [27, 42, 110],
      skyHorizon: [217, 143, 255],
      sunColor: [255, 179, 255],
    },
  },
  {
    id: "fantasy-unbound",
    name: "Fantasy Unbound",
    tagline: "Golden-hour magic, boldly colorful",
    category: "vibrant",
    params: {
      tonemap: "filmic",
      exposure: 1.05,
      contrast: 1.1,
      saturation: 1.3,
      vibrance: 0.6,
      temperature: 0.15,
      bloomStrength: 0.45,
      bloomThreshold: 0.72,
      godRays: 0.5,
      fogDensity: 0.25,
      vignette: 0.15,
      skyTop: [47, 95, 208],
      skyHorizon: [255, 196, 107],
      sunColor: [255, 230, 128],
    },
  },
  {
    id: "ripple",
    name: "Ripple",
    tagline: "Cool aquatic tones under crisp skies",
    category: "natural",
    params: {
      tonemap: "aces",
      exposure: 1.05,
      contrast: 1.05,
      saturation: 1.15,
      vibrance: 0.35,
      temperature: -0.08,
      bloomStrength: 0.3,
      bloomThreshold: 0.78,
      godRays: 0.35,
      fogDensity: 0.35,
      vignette: 0.12,
      skyTop: [30, 111, 184],
      skyHorizon: [168, 230, 255],
      sunColor: [232, 250, 255],
    },
  },
  {
    id: "complementary-reimagined",
    name: "Complementary Reimagined",
    tagline: "The balanced all-rounder — clean and cinematic",
    category: "natural",
    params: {
      tonemap: "aces",
      exposure: 1.0,
      contrast: 1.08,
      saturation: 1.15,
      vibrance: 0.4,
      temperature: 0.05,
      bloomStrength: 0.32,
      bloomThreshold: 0.78,
      godRays: 0.35,
      fogDensity: 0.18,
      vignette: 0.14,
      skyTop: [63, 118, 196],
      skyHorizon: [255, 217, 168],
      sunColor: [255, 240, 208],
    },
  },
  {
    id: "seus",
    name: "SEUS",
    tagline: "Heavy cinematic light with volumetric drama",
    category: "cinematic",
    params: {
      tonemap: "filmic",
      exposure: 0.98,
      contrast: 1.18,
      saturation: 1.2,
      vibrance: 0.45,
      temperature: 0.08,
      bloomStrength: 0.48,
      bloomThreshold: 0.72,
      godRays: 0.6,
      fogDensity: 0.28,
      vignette: 0.28,
      skyTop: [42, 90, 158],
      skyHorizon: [240, 192, 128],
      sunColor: [255, 223, 158],
    },
  },
  {
    id: "bsl",
    name: "BSL",
    tagline: "Soft, warm and vibrant — the beloved classic look",
    category: "natural",
    params: {
      tonemap: "aces",
      exposure: 1.05,
      contrast: 1.06,
      saturation: 1.2,
      vibrance: 0.45,
      temperature: 0.1,
      bloomStrength: 0.38,
      bloomThreshold: 0.76,
      godRays: 0.35,
      fogDensity: 0.2,
      vignette: 0.12,
      skyTop: [61, 126, 201],
      skyHorizon: [255, 220, 174],
      sunColor: [255, 240, 216],
    },
  },
  {
    id: "fantasy",
    name: "Fantasy",
    tagline: "Saturated fairy-tale colors and glow",
    category: "vibrant",
    params: {
      tonemap: "filmic",
      exposure: 1.05,
      contrast: 1.12,
      saturation: 1.45,
      vibrance: 0.7,
      temperature: 0.12,
      bloomStrength: 0.42,
      bloomThreshold: 0.7,
      godRays: 0.45,
      fogDensity: 0.22,
      vignette: 0.16,
      skyTop: [43, 102, 201],
      skyHorizon: [255, 184, 77],
      sunColor: [255, 221, 119],
    },
  },
  {
    id: "bliss",
    name: "Bliss",
    tagline: "Natural light with rich, film-like tones",
    category: "natural",
    params: {
      tonemap: "aces",
      exposure: 1.02,
      contrast: 1.07,
      saturation: 1.12,
      vibrance: 0.42,
      temperature: 0.07,
      bloomStrength: 0.34,
      bloomThreshold: 0.76,
      godRays: 0.32,
      fogDensity: 0.16,
      vignette: 0.13,
      skyTop: [58, 124, 192],
      skyHorizon: [255, 224, 176],
      sunColor: [255, 242, 217],
    },
  },
  {
    id: "spooklementary",
    name: "Spooklementary",
    tagline: "Muted dread — dark, foggy and grim",
    category: "dreamy",
    params: {
      tonemap: "filmic",
      exposure: 0.85,
      contrast: 1.12,
      saturation: 0.65,
      vibrance: 0.1,
      temperature: -0.15,
      bloomStrength: 0.25,
      bloomThreshold: 0.66,
      godRays: 0.15,
      fogDensity: 0.55,
      vignette: 0.42,
      skyTop: [20, 26, 46],
      skyHorizon: [57, 67, 94],
      sunColor: [170, 180, 212],
    },
  },
  {
    id: "e-lite",
    name: "E-Lite",
    tagline: "Feather-light touch-up for vanilla clarity",
    category: "performance",
    params: {
      tonemap: "aces",
      exposure: 1.12,
      contrast: 1.02,
      saturation: 1.05,
      vibrance: 0.18,
      temperature: 0.0,
      bloomStrength: 0.1,
      bloomThreshold: 0.95,
      godRays: 0.08,
      fogDensity: 0.06,
      vignette: 0.04,
      skyTop: [85, 153, 221],
      skyHorizon: [214, 236, 255],
      sunColor: [255, 255, 255],
    },
  },
  {
    id: "emanrux",
    name: "EmanRux",
    tagline: "Teal-and-orange cinematic grading",
    category: "cinematic",
    params: {
      tonemap: "filmic",
      exposure: 1.0,
      contrast: 1.15,
      saturation: 1.18,
      vibrance: 0.4,
      temperature: 0.05,
      bloomStrength: 0.4,
      bloomThreshold: 0.74,
      godRays: 0.45,
      fogDensity: 0.25,
      vignette: 0.24,
      skyTop: [37, 109, 143],
      skyHorizon: [255, 180, 107],
      sunColor: [255, 217, 160],
    },
  },
  {
    id: "iteration-t",
    name: "Iteration T",
    tagline: "Modern, restrained and sophisticated",
    category: "cinematic",
    params: {
      tonemap: "aces",
      exposure: 1.0,
      contrast: 1.1,
      saturation: 1.08,
      vibrance: 0.3,
      temperature: 0.03,
      bloomStrength: 0.35,
      bloomThreshold: 0.78,
      godRays: 0.35,
      fogDensity: 0.2,
      vignette: 0.18,
      skyTop: [55, 114, 184],
      skyHorizon: [232, 213, 181],
      sunColor: [255, 244, 224],
    },
  },
  {
    id: "sundial",
    name: "Sundial",
    tagline: "Perpetual golden hour warmth",
    category: "cinematic",
    params: {
      tonemap: "aces",
      exposure: 1.08,
      contrast: 1.1,
      saturation: 1.22,
      vibrance: 0.5,
      temperature: 0.18,
      bloomStrength: 0.45,
      bloomThreshold: 0.7,
      godRays: 0.55,
      fogDensity: 0.22,
      vignette: 0.16,
      skyTop: [61, 111, 174],
      skyHorizon: [255, 194, 122],
      sunColor: [255, 227, 163],
    },
  },
  {
    id: "ushader",
    name: "UShader",
    tagline: "Punchy colors with a glossy finish",
    category: "vibrant",
    params: {
      tonemap: "filmic",
      exposure: 1.05,
      contrast: 1.08,
      saturation: 1.28,
      vibrance: 0.55,
      temperature: 0.08,
      bloomStrength: 0.36,
      bloomThreshold: 0.74,
      godRays: 0.3,
      fogDensity: 0.18,
      vignette: 0.12,
      skyTop: [50, 115, 198],
      skyHorizon: [255, 217, 163],
      sunColor: [255, 240, 207],
    },
  },
  {
    id: "verlixia",
    name: "Verlixia",
    tagline: "Mystic purples under an enchanted sky",
    category: "dreamy",
    params: {
      tonemap: "aces",
      exposure: 1.0,
      contrast: 1.08,
      saturation: 1.05,
      vibrance: 0.35,
      temperature: -0.03,
      bloomStrength: 0.5,
      bloomThreshold: 0.68,
      godRays: 0.35,
      fogDensity: 0.35,
      vignette: 0.2,
      skyTop: [75, 58, 143],
      skyHorizon: [185, 143, 224],
      sunColor: [232, 213, 255],
    },
  },
  {
    id: "moz",
    name: "Moz",
    tagline: "Soft watercolor wash, gentle on the eyes",
    category: "dreamy",
    params: {
      tonemap: "aces",
      exposure: 1.08,
      contrast: 0.95,
      saturation: 0.98,
      vibrance: 0.3,
      temperature: 0.04,
      bloomStrength: 0.55,
      bloomThreshold: 0.65,
      godRays: 0.28,
      fogDensity: 0.35,
      vignette: 0.18,
      skyTop: [111, 159, 216],
      skyHorizon: [255, 217, 207],
      sunColor: [255, 245, 234],
    },
  },
  {
    id: "nostalgia",
    name: "Nostalgia",
    tagline: "Retro sepia warmth, like old memories",
    category: "dreamy",
    params: {
      tonemap: "reinhard",
      exposure: 1.0,
      contrast: 1.02,
      saturation: 0.8,
      vibrance: 0.1,
      temperature: 0.14,
      bloomStrength: 0.25,
      bloomThreshold: 0.78,
      godRays: 0.2,
      fogDensity: 0.38,
      vignette: 0.22,
      skyTop: [106, 143, 188],
      skyHorizon: [232, 201, 160],
      sunColor: [255, 232, 192],
    },
  },
  {
    id: "ctr",
    name: "CTR",
    tagline: "Competitive clarity — zero fog, zero fuss",
    category: "performance",
    params: {
      tonemap: "none",
      exposure: 1.2,
      contrast: 1.05,
      saturation: 1.1,
      vibrance: 0.2,
      temperature: 0.0,
      bloomStrength: 0.05,
      bloomThreshold: 1.0,
      godRays: 0.0,
      fogDensity: 0.0,
      vignette: 0.0,
      skyTop: [76, 154, 224],
      skyHorizon: [207, 234, 255],
      sunColor: [255, 255, 255],
    },
  },
  {
    id: "adistira",
    name: "Adistira",
    tagline: "Epic contrast for dramatic horizons",
    category: "cinematic",
    params: {
      tonemap: "filmic",
      exposure: 0.98,
      contrast: 1.22,
      saturation: 1.15,
      vibrance: 0.4,
      temperature: 0.08,
      bloomStrength: 0.45,
      bloomThreshold: 0.7,
      godRays: 0.55,
      fogDensity: 0.3,
      vignette: 0.3,
      skyTop: [30, 77, 143],
      skyHorizon: [224, 160, 96],
      sunColor: [255, 208, 144],
    },
  },
  {
    id: "hysteria",
    name: "Hysteria",
    tagline: "Loud, aggressive and hyper-saturated",
    category: "vibrant",
    params: {
      tonemap: "filmic",
      exposure: 1.05,
      contrast: 1.18,
      saturation: 1.5,
      vibrance: 0.75,
      temperature: 0.1,
      bloomStrength: 0.42,
      bloomThreshold: 0.7,
      godRays: 0.42,
      fogDensity: 0.2,
      vignette: 0.18,
      skyTop: [31, 102, 196],
      skyHorizon: [255, 158, 94],
      sunColor: [255, 207, 142],
    },
  },
  {
    id: "shrimple",
    name: "Shrimple",
    tagline: "Simply pleasant — light, clean and quick",
    category: "performance",
    params: {
      tonemap: "aces",
      exposure: 1.08,
      contrast: 1.04,
      saturation: 1.1,
      vibrance: 0.25,
      temperature: 0.02,
      bloomStrength: 0.2,
      bloomThreshold: 0.85,
      godRays: 0.12,
      fogDensity: 0.12,
      vignette: 0.08,
      skyTop: [70, 136, 204],
      skyHorizon: [216, 234, 255],
      sunColor: [255, 248, 232],
    },
  },
  {
    id: "superdupervanilla",
    name: "SuperDuperVanilla",
    tagline: "Vanilla+, just better",
    category: "natural",
    params: {
      tonemap: "aces",
      exposure: 1.05,
      contrast: 1.03,
      saturation: 1.08,
      vibrance: 0.3,
      temperature: 0.03,
      bloomStrength: 0.18,
      bloomThreshold: 0.85,
      godRays: 0.15,
      fogDensity: 0.1,
      vignette: 0.06,
      skyTop: [74, 144, 217],
      skyHorizon: [200, 228, 255],
      sunColor: [255, 244, 230],
    },
  },
  {
    id: "sildurs-vibrant",
    name: "Sildur's Vibrant",
    tagline: "The vibrant classic — bright and colorful",
    category: "vibrant",
    params: {
      tonemap: "aces",
      exposure: 1.05,
      contrast: 1.08,
      saturation: 1.32,
      vibrance: 0.6,
      temperature: 0.09,
      bloomStrength: 0.36,
      bloomThreshold: 0.74,
      godRays: 0.3,
      fogDensity: 0.18,
      vignette: 0.14,
      skyTop: [61, 130, 204],
      skyHorizon: [255, 216, 168],
      sunColor: [255, 240, 207],
    },
  },
  {
    id: "vtxs",
    name: "VTXS",
    tagline: "Teal sci-fi atmosphere with crisp light",
    category: "dreamy",
    params: {
      tonemap: "aces",
      exposure: 1.0,
      contrast: 1.1,
      saturation: 1.12,
      vibrance: 0.4,
      temperature: -0.1,
      bloomStrength: 0.4,
      bloomThreshold: 0.72,
      godRays: 0.35,
      fogDensity: 0.28,
      vignette: 0.2,
      skyTop: [22, 80, 94],
      skyHorizon: [99, 216, 201],
      sunColor: [200, 255, 240],
    },
  },
  {
    id: "n87",
    name: "N87",
    tagline: "Clean and popular — light performance touch",
    category: "performance",
    params: {
      tonemap: "aces",
      exposure: 1.1,
      contrast: 1.04,
      saturation: 1.12,
      vibrance: 0.28,
      temperature: 0.02,
      bloomStrength: 0.15,
      bloomThreshold: 0.88,
      godRays: 0.1,
      fogDensity: 0.08,
      vignette: 0.06,
      skyTop: [79, 143, 212],
      skyHorizon: [212, 232, 255],
      sunColor: [255, 253, 245],
    },
  },
  {
    id: "vanilletix",
    name: "Vanilletix",
    tagline: "Soft vanilla comfort, gently enhanced",
    category: "natural",
    params: {
      tonemap: "aces",
      exposure: 1.06,
      contrast: 1.0,
      saturation: 1.04,
      vibrance: 0.22,
      temperature: 0.04,
      bloomStrength: 0.22,
      bloomThreshold: 0.82,
      godRays: 0.12,
      fogDensity: 0.12,
      vignette: 0.08,
      skyTop: [85, 150, 218],
      skyHorizon: [216, 234, 255],
      sunColor: [255, 250, 240],
    },
  },
];

export const SHADER_STYLES: readonly ShaderStyle[] = STYLES.map((style) => ({
  ...style,
  sourceUrl: modrinthSearch(style.name),
}));

export const SHADER_CATEGORIES: readonly ShaderStyleCategory[] = [
  "cinematic",
  "vibrant",
  "natural",
  "dreamy",
  "performance",
];

export function getShaderStyle(id: string): ShaderStyle | undefined {
  return SHADER_STYLES.find((style) => style.id === id);
}

interface Range {
  min: number;
  max: number;
}

const RANGES: Record<string, Range> = {
  exposure: { min: 0.6, max: 1.6 },
  contrast: { min: 0.85, max: 1.35 },
  saturation: { min: 0.55, max: 1.6 },
  vibrance: { min: 0, max: 1 },
  temperature: { min: -0.3, max: 0.3 },
  bloomStrength: { min: 0, max: 1 },
  bloomThreshold: { min: 0.55, max: 1.1 },
  godRays: { min: 0, max: 1 },
  fogDensity: { min: 0, max: 1 },
  vignette: { min: 0, max: 0.6 },
};

const TONEMAPS: readonly TonemapKind[] = ["aces", "reinhard", "filmic", "none"];

function validRgb(rgb: Rgb): boolean {
  return (
    rgb.length === 3 &&
    rgb.every(
      (channel) => Number.isInteger(channel) && channel >= 0 && channel <= 255,
    )
  );
}

/** Returns every range/shape violation found in a params object. */
export function validateStyleParams(params: ShaderStyleParams): string[] {
  const errors: string[] = [];
  if (!TONEMAPS.includes(params.tonemap)) {
    errors.push(`tonemap must be one of ${TONEMAPS.join(", ")}`);
  }
  for (const [key, range] of Object.entries(RANGES)) {
    const value = (params as unknown as Record<string, number>)[key];
    if (typeof value !== "number" || Number.isNaN(value)) {
      errors.push(`${key} must be a number`);
    } else if (value < range.min || value > range.max) {
      errors.push(`${key} ${value} out of range [${range.min}, ${range.max}]`);
    }
  }
  for (const key of ["skyTop", "skyHorizon", "sunColor"] as const) {
    if (!validRgb(params[key])) {
      errors.push(`${key} must be RGB integers 0-255`);
    }
  }
  return errors;
}
