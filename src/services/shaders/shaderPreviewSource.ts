/**
 * Live preview for the Shader Studio — a small analytic scene (sky,
 * sun, ridged mountains, reflective water) rendered by a fragment
 * shader that applies the SAME grading pipeline as the generated
 * shaderpack (exposure → tonemap → contrast → saturation → vibrance
 * → temperature → god rays → vignette), so what you see is what the
 * style preset does.
 */

import type { ShaderStyleParams, TonemapKind } from "./shaderStyleCatalog";

export const PREVIEW_VERTEX_SOURCE = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
    vUv = aPos * 0.5 + 0.5;
    gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

function tonemapFn(kind: TonemapKind): string {
  switch (kind) {
    case "aces":
      return `vec3 ncTonemap(vec3 x) {
    x *= 0.6;
    return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}`;
    case "reinhard":
      return `vec3 ncTonemap(vec3 x) {
    vec3 numerator = x * (vec3(1.0) + x);
    vec3 denominator = vec3(1.0) + x * (1.0 + max(x - vec3(1.0), vec3(0.0)));
    return clamp(numerator / denominator, 0.0, 1.0);
}`;
    case "filmic":
      return `vec3 ncTonemap(vec3 x) {
    x = max(vec3(0.0), x - vec3(0.004));
    return (x * (6.2 * x + 0.5)) / (x * (6.2 * x + 1.7) + 0.06);
}`;
    case "none":
      return `vec3 ncTonemap(vec3 x) {
    return clamp(x, 0.0, 1.0);
}`;
  }
}

export function previewFragmentSource(params: ShaderStyleParams): string {
  return `
precision mediump float;

varying vec2 vUv;

uniform float uTime;
uniform float uExposure;
uniform float uContrast;
uniform float uSaturation;
uniform float uVibrance;
uniform float uTemperature;
uniform float uBloomStrength;
uniform float uGodRays;
uniform float uFogDensity;
uniform float uVignette;
uniform vec3 uSkyTop;
uniform vec3 uSkyHorizon;
uniform vec3 uSunColor;

const vec2 SUN_POS = vec2(0.68, 0.60);
const float HORIZON = 0.42;

${tonemapFn(params.tonemap)}

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
        f.y
    );
}

float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
        v += a * noise(p);
        p *= 2.0;
        a *= 0.5;
    }
    return v;
}

float ridge(float x, float seed, float amp) {
    return HORIZON + fbm(vec2(x * 3.0 + seed, seed * 7.0)) * amp;
}

float luma(vec3 c) {
    return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

vec3 skyColor(vec2 uv) {
    float grad = clamp((uv.y - HORIZON) / max(1.0 - HORIZON, 0.001), 0.0, 1.0);
    vec3 sky = mix(uSkyHorizon, uSkyTop, pow(grad, 0.8));
    float sunDist = length((uv - SUN_POS) * vec2(1.6, 1.0));
    float sun = 1.0 - smoothstep(0.0, 0.05, sunDist);
    float glow = exp(-sunDist * 3.5);
    sky += uSunColor * (sun * 1.6 + glow * (0.35 + uBloomStrength * 0.9));
    return sky;
}

// Fraction of the pixel->sun path that stays above the mountains.
float opennessToSun(vec2 uv) {
    vec2 dir = (SUN_POS - uv) / 8.0;
    vec2 p = uv;
    float open = 0.0;
    for (int i = 0; i < 8; i++) {
        p += dir;
        float far = ridge(p.x, 3.0, 0.16);
        float near = ridge(p.x, 8.0, 0.10);
        float h = max(far, near);
        open += (p.y > h) ? 0.125 : 0.0;
    }
    return open;
}

void main() {
    vec2 uv = vec2(vUv.x, vUv.y);

    float farRidge = ridge(uv.x, 3.0, 0.16);
    float nearRidge = ridge(uv.x, 8.0, 0.10);

    vec3 color;
    float isWater = 0.0;

    if (uv.y >= HORIZON) {
        if (uv.y > farRidge && uv.y > nearRidge) {
            color = skyColor(uv);
        } else {
            // Mountain shading: near ridge darker than far ridge
            float inNear = step(uv.y, nearRidge);
            vec3 farCol = vec3(0.16, 0.19, 0.24);
            vec3 nearCol = vec3(0.09, 0.10, 0.13);
            color = mix(farCol, nearCol, inNear);
            // Atmospheric haze on the far layer
            float haze = clamp(1.0 - exp(-uFogDensity * 2.0), 0.0, 0.9);
            color = mix(color, uSkyHorizon * 0.85, haze * (1.0 - inNear * 0.5));
        }
    } else {
        // Water: reflected sky + sun streak + animated ripple
        isWater = 1.0;
        vec2 mirror = vec2(uv.x, HORIZON + (HORIZON - uv.y) * 0.9);
        color = skyColor(mirror) * 0.85;
        float streak = exp(-abs(mirror.x - SUN_POS.x) * 14.0);
        float along = smoothstep(HORIZON, 0.0, uv.y);
        color += uSunColor * streak * along * 0.8;
        float ripple = fbm(vec2(uv.x * 9.0, uv.y * 22.0 - uTime * 0.35));
        color *= 0.85 + ripple * 0.3;
    }

    // God rays from the sun through the scene
    float sunDist = length((uv - SUN_POS) * vec2(1.6, 1.0));
    float falloff = max(0.0, 1.0 - sunDist * 1.6);
    float open = opennessToSun(uv);
    color += uSunColor * open * falloff * falloff * uGodRays * 0.5 * (1.0 - isWater * 0.5);

    // Same grading pipeline as the generated composite.fsh
    color = ncTonemap(color * uExposure);
    color = (color - 0.18) * uContrast + 0.18;

    float lum = luma(color);
    color = mix(vec3(lum), color, uSaturation);

    float sat = max(color.r, max(color.g, color.b)) - min(color.r, min(color.g, color.b));
    color = mix(vec3(lum), color, 1.0 + uVibrance * (1.0 - sat) * 0.8);

    color += vec3(uTemperature, 0.0, -uTemperature) * 0.08;

    vec2 vuv = uv - 0.5;
    color *= clamp(1.0 - uVignette * dot(vuv, vuv) * 2.0, 0.0, 1.0);

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;
}
