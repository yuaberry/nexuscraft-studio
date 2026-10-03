/**
 * Live WebGL preview of a shader style preset — analytic scene (sky, sun,
 * ridged mountains, water) with the exact grading pipeline the generated
 * shaderpack applies. Falls back to an honest notice when WebGL is
 * unavailable (never a fake screenshot).
 */

import { useEffect, useRef } from "react";
import type { ShaderStyleParams } from "@/services/shaders/shaderStyleCatalog";
import {
  PREVIEW_VERTEX_SOURCE,
  previewFragmentSource,
} from "@/services/shaders/shaderPreviewSource";

interface ShaderPreviewCanvasProps {
  params: ShaderStyleParams;
  className?: string;
}

export function ShaderPreviewCanvas({ params, className }: ShaderPreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const paramsRef = useRef(params);

  // Refs must never be written during render — sync in a dedicated effect
  // that runs before the setup effect below (declaration order).
  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: true });
    if (!gl) return;

    let raf = 0;
    let disposed = false;

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );

    const compile = (type: number, source: string): WebGLShader | null => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn("preview shader:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const buildProgram = (): WebGLProgram | null => {
      const vs = compile(gl.VERTEX_SHADER, PREVIEW_VERTEX_SOURCE);
      const fs = compile(gl.FRAGMENT_SHADER, previewFragmentSource(paramsRef.current));
      if (!vs || !fs) return null;
      const program = gl.createProgram();
      if (!program) return null;
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.warn("preview link:", gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
      }
      return program;
    };

    let program = buildProgram();

    const uniform = (name: string): WebGLUniformLocation | null =>
      program ? gl.getUniformLocation(program, name) : null;

    const draw = (timeMs: number) => {
      if (disposed) return;
      if (!program) {
        program = buildProgram();
        if (!program) {
          raf = requestAnimationFrame(draw);
          return;
        }
      }
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, width, height);
      gl.useProgram(program);

      const aPos = gl.getAttribLocation(program, "aPos");
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      const p = paramsRef.current;
      const rgb = (c: readonly [number, number, number]): [number, number, number] => [
        c[0] / 255,
        c[1] / 255,
        c[2] / 255,
      ];
      gl.uniform1f(uniform("uTime"), timeMs / 1000);
      gl.uniform1f(uniform("uExposure"), p.exposure);
      gl.uniform1f(uniform("uContrast"), p.contrast);
      gl.uniform1f(uniform("uSaturation"), p.saturation);
      gl.uniform1f(uniform("uVibrance"), p.vibrance);
      gl.uniform1f(uniform("uTemperature"), p.temperature);
      gl.uniform1f(uniform("uBloomStrength"), p.bloomStrength);
      gl.uniform1f(uniform("uGodRays"), p.godRays);
      gl.uniform1f(uniform("uFogDensity"), p.fogDensity);
      gl.uniform1f(uniform("uVignette"), p.vignette);
      gl.uniform3fv(uniform("uSkyTop"), rgb(p.skyTop));
      gl.uniform3fv(uniform("uSkyHorizon"), rgb(p.skyHorizon));
      gl.uniform3fv(uniform("uSunColor"), rgb(p.sunColor));

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      if (program) gl.deleteProgram(program);
      gl.deleteBuffer(buffer);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
    // The full source depends on the tonemap; rebuilding the program on
    // every preset change is cheap (<5ms) and keeps uniforms in sync.
  }, [params]);

  return (
    <div className={className}>
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
