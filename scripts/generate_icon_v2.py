#!/usr/bin/env python3
"""NexusCraft Studio — premium app icon (v2).

Design: the nexus mark (three-facet isometric cube) floating over a deep
space-blue backdrop with radial glow — same identity as the brand SVG,
now with per-face gradients, neon nodes, ambient bloom and a subtle top
edge highlight. Rendered at 4x supersampling and downscaled for crisp
anti-aliasing. Feeds `pnpm tauri icon`.
"""
from PIL import Image, ImageDraw, ImageFilter

SS = 4          # supersample factor
BASE = 1024
W = BASE * SS   # working canvas


def scale(pts):
    """64-unit viewBox coordinates -> supersampled canvas pixels."""
    s = W / 64
    return [(x * s, y * s) for (x, y) in pts]


def hex_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def gradient_poly(size, top_hex, bottom_hex, points):
    """A polygon filled with a vertical two-stop gradient."""
    grad = Image.new("RGB", (1, size[1]))
    top, bottom = hex_rgb(top_hex), hex_rgb(bottom_hex)
    for y in range(size[1]):
        grad.putpixel((0, y), lerp(top, bottom, y / max(1, size[1] - 1)))
    grad = grad.resize(size)
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).polygon(points, fill=255)
    out = Image.new("RGBA", size, (0, 0, 0, 0))
    out.paste(grad, (0, 0), mask)
    return out, mask


def main():
    # ---------- backdrop: deep space blue, radial ----------
    bg = Image.new("RGB", (W, W))
    cx, cy = W * 0.5, W * 0.42
    outer = hex_rgb("#070a12")
    inner = hex_rgb("#1a2340")
    px = bg.load()
    for y in range(W):
        for x in range(0, W, 8):  # coarse radial; blurred later
            d = ((x - cx) / W) ** 2 + ((y - cy) / W) ** 2
            d = min(1.0, (d * 2.4) ** 0.5)
            c = lerp(inner, outer, d)
            for k in range(8):
                if x + k < W:
                    px[x + k, y] = c

    icon = bg.convert("RGBA")

    # ---------- ambient bloom behind the mark ----------
    bloom = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    bdraw = ImageDraw.Draw(bloom)
    bdraw.ellipse([W * 0.20, W * 0.16, W * 0.80, W * 0.66],
                  fill=(109, 40, 217, 110))
    bdraw.ellipse([W * 0.30, W * 0.40, W * 0.74, W * 0.80],
                  fill=(34, 211, 238, 46))
    bloom = bloom.filter(ImageFilter.GaussianBlur(W * 0.10))
    icon = Image.alpha_composite(icon, bloom)

    # ---------- the nexus mark (brand geometry) ----------
    # viewBox 64: three facets of an isometric cube
    top_pts = scale([(32, 8), (54, 19.5), (32, 31), (10, 19.5)])
    left_pts = scale([(10, 19.5), (32, 31), (32, 56), (10, 44.5)])
    right_pts = scale([(54, 19.5), (32, 31), (32, 56), (54, 44.5)])

    # facets with per-face gradients (lit from top-left, like the SVG)
    top_face, top_mask = gradient_poly((W, W), "#a78bfa", "#7c3aed", top_pts)
    left_face, _ = gradient_poly((W, W), "#60a5fa", "#2563eb", left_pts)
    right_face, _ = gradient_poly((W, W), "#7c3aed", "#4c1d95", right_pts)

    # soft drop shadow of the whole mark
    all_mask = Image.new("L", (W, W), 0)
    ImageDraw.Draw(all_mask).polygon(scale([(32, 8), (54, 19.5), (32, 31),
                                            (10, 19.5)]) + [], fill=90)
    ImageDraw.Draw(all_mask).polygon(scale([(10, 19.5), (32, 31),
                                            (32, 56), (10, 44.5)]), fill=90)
    ImageDraw.Draw(all_mask).polygon(scale([(54, 19.5), (32, 31),
                                            (32, 56), (54, 44.5)]), fill=90)
    shadow = all_mask.filter(ImageFilter.GaussianBlur(W * 0.012))
    shadow_img = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    black = Image.new("RGBA", (W, W), (4, 6, 12, 255))
    shadow_img.paste(black, (int(W * 0.008), int(W * 0.018)), shadow)
    icon = Image.alpha_composite(icon, shadow_img)

    for face in (left_face, right_face, top_face):
        icon = Image.alpha_composite(icon, face)

    # crisp facet edges (brand look: thin lighter seams)
    edge = ImageDraw.Draw(icon)
    for pts, col in (
        (top_pts, "#c4b5fd"),
        (left_pts, "#93c5fd"),
        (right_pts, "#a78bfa"),
    ):
        edge_rgb = hex_rgb(col)
        edge.polygon(pts, outline=edge_rgb + (200,), width=max(2, W // 512))

    # ---------- neon nodes ----------
    node_glow = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    ng = ImageDraw.Draw(node_glow)
    nodes = [(32, 8), (54, 19.5), (10, 19.5), (32, 56)]
    for (nx, ny) in nodes:
        r = W * 0.055
        (px_, py_) = nx / 64 * W, ny / 64 * W
        ng.ellipse([px_ - r, py_ - r, px_ + r, py_ + r], fill=(34, 211, 238, 170))
    node_glow = node_glow.filter(ImageFilter.GaussianBlur(W * 0.02))
    icon = Image.alpha_composite(icon, node_glow)
    nd = ImageDraw.Draw(icon)
    for (nx, ny) in nodes:
        r = W * 0.016
        (px_, py_) = nx / 64 * W, ny / 64 * W
        nd.ellipse([px_ - r, py_ - r, px_ + r, py_ + r], fill=(190, 245, 255, 255))

    # ---------- top edge highlight + vignette ----------
    hl = ImageDraw.Draw(icon, "RGBA")
    hl.line([(W * 0.06, W * 0.045), (W * 0.94, W * 0.045)],
            fill=(160, 180, 255, 46), width=max(2, W // 640))
    vig = Image.new("L", (W, W), 0)
    vd = ImageDraw.Draw(vig)
    vd.ellipse([-W * 0.12, -W * 0.12, W * 1.12, W * 1.12], fill=255)
    vig = vig.filter(ImageFilter.GaussianBlur(W * 0.09))
    dark = Image.new("RGBA", (W, W), (4, 6, 14, 255))
    inv = Image.new("RGBA", (W, W), (4, 6, 14, 0))
    inv.paste(dark, (0, 0), vig.point(lambda v: 255 - v))
    icon = Image.alpha_composite(icon, inv)

    # ---------- downscale + save ----------
    icon = icon.convert("RGB").resize((BASE, BASE), Image.LANCZOS)
    icon.save("src-tauri/icons/app-icon.png")
    icon.save("src-tauri/icons/icon.png")
    print("wrote src-tauri/icons/app-icon.png (1024x1024)")


if __name__ == "__main__":
    main()
