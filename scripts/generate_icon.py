#!/usr/bin/env python3
"""Generate the NexusCraft Studio app icon (1024x1024 PNG).

Design: isometric voxel cube (nexus) with violet/blue/cyan identity,
soft glow, on a dark graphite rounded-square backdrop.
"""
from PIL import Image, ImageDraw, ImageFilter

S = 16  # 64-unit viewBox -> 1024px canvas
W = 1024
OUT = "src-tauri/icons/app-icon.png"


def p(x, y):
    return (x * S, y * S)


def main():
    import os

    os.makedirs(os.path.dirname(OUT), exist_ok=True)

    # ---- Backdrop: vertical graphite gradient in a rounded square ----
    icon = Image.new("RGBA", (W, W), (0, 0, 0, 0))

    grad = Image.new("RGBA", (1, W))
    top = (24, 28, 46)   # #12162a-ish
    bottom = (10, 12, 18)  # #0a0c12
    for y in range(W):
        t = y / (W - 1)
        r = int(top[0] * (1 - t) + bottom[0] * t)
        g = int(top[1] * (1 - t) + bottom[1] * t)
        b = int(top[2] * (1 - t) + bottom[2] * t)
        grad.putpixel((0, y), (r, g, b, 255))
    backdrop = grad.resize((W, W))

    mask = Image.new("L", (W, W), 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle([0, 0, W - 1, W - 1], radius=192, fill=255)
    icon.paste(backdrop, (0, 0), mask)

    # ---- Glow layer behind the cube ----
    glow_layer = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow_layer)
    cube_center = p(32, 31)
    gd.ellipse(
        [
            cube_center[0] - 360, cube_center[1] - 300,
            cube_center[0] + 360, cube_center[1] + 340,
        ],
        fill=(139, 92, 246, 90),
    )
    glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(60))
    icon = Image.alpha_composite(icon, glow_layer)

    # ---- Cube faces ----
    draw = ImageDraw.Draw(icon)

    # subtle drop shadow of the cube
    shadow = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.polygon(
        [p(12, 24), p(52, 24), p(52, 54), p(12, 54)],
        fill=(0, 0, 0, 110),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(18))
    icon = Image.alpha_composite(icon, shadow)
    draw = ImageDraw.Draw(icon)

    # top face (light violet)
    draw.polygon(
        [p(32, 10), p(52, 20), p(32, 30), p(12, 20)],
        fill=(167, 139, 250, 255),
    )
    # left face (electric blue)
    draw.polygon(
        [p(12, 20), p(32, 30), p(32, 52), p(12, 42)],
        fill=(59, 130, 246, 255),
    )
    # right face (deep violet)
    draw.polygon(
        [p(52, 20), p(32, 30), p(32, 52), p(52, 42)],
        fill=(109, 40, 217, 255),
    )

    # ---- Edges (cyan, semi-transparent) ----
    edge_color = (34, 211, 238, 110)
    edge_width = int(1.5 * S)
    outline = [
        p(32, 10), p(52, 20), p(52, 42), p(32, 52),
        p(12, 42), p(12, 20), p(32, 10),
    ]
    draw.line(outline, fill=edge_color, width=edge_width, joint="curve")
    draw.line([p(32, 30), p(32, 52)], fill=edge_color, width=edge_width)

    # ---- Nexus nodes ----
    def node(pt, r_units, color):
        x, y = pt
        r = r_units * S
        # glow halo
        halo = Image.new("RGBA", (W, W), (0, 0, 0, 0))
        hd = ImageDraw.Draw(halo)
        hd.ellipse([x - r * 2.2, y - r * 2.2, x + r * 2.2, y + r * 2.2], fill=(34, 211, 238, 70))
        halo = halo.filter(ImageFilter.GaussianBlur(10))
        nonlocal_draw = ImageDraw.Draw(icon)
        # (halo composited separately below)
        return halo, (x, y, r, color)

    halos = []
    for pt, r_u, color in [
        (p(32, 10), 2.6, (34, 211, 238, 255)),
        (p(52, 20), 2.6, (34, 211, 238, 255)),
        (p(12, 20), 2.6, (34, 211, 238, 255)),
        (p(32, 52), 2.6, (34, 211, 238, 255)),
        (p(52, 42), 2.6, (125, 211, 252, 230)),
        (p(12, 42), 2.6, (125, 211, 252, 230)),
        (p(32, 30), 2.2, (224, 242, 254, 255)),
    ]:
        halo, node_spec = node(pt, r_u, color)
        halos.append(halo)
        x, y, r, c = node_spec
        d2 = ImageDraw.Draw(halo)
        d2.ellipse([x - r, y - r, x + r, y + r], fill=c)

    for halo in halos:
        icon = Image.alpha_composite(icon, halo)

    icon.save(OUT)
    print(f"saved {OUT} ({icon.size[0]}x{icon.size[1]})")


if __name__ == "__main__":
    main()
