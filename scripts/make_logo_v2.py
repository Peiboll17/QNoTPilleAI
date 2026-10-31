#!/usr/bin/env python3
"""Genera los assets de marca desde el logo CORRECTO (upload/logo.jpg):
 - public/logo.png   (icono 320x320, fondo transparente)
 - src/app/icon.png  (favicon 256x256, fondo transparente)
Además muestrea los colores exactos del logo y de la landing (upload/landingpage.jpg).
"""
from PIL import Image
import numpy as np
from collections import deque

def hexc(rgb):
    return "#%02X%02X%02X" % tuple(int(round(c)) for c in rgb)

# ---------- 1. Cargar logo ----------
im = Image.open("/home/z/my-project/upload/logo.jpg").convert("RGB")
W, H = im.size
px = np.asarray(im).astype(np.int16)

border = np.concatenate([
    px[0:8].reshape(-1, 3), px[-8:].reshape(-1, 3),
    px[:, 0:8].reshape(-1, 3), px[:, -8:].reshape(-1, 3),
])
bg = np.median(border, axis=0)
print("bg logo:", hexc(bg))

dist = np.sqrt(((px - bg) ** 2).sum(axis=2))
mask = dist > 30

# ---------- 2. El icono termina en el PRIMER hueco vertical (>=6 filas vacías) tras el contenido ----------
rowd = mask.sum(axis=1)
content_rows = np.where(rowd > 2)[0]
first = int(content_rows.min())
icon_bottom = H - 1
run = 0
for y in range(first, H):
    if rowd[y] < 3:
        run += 1
        if run >= 6:
            icon_bottom = y - run + 1
            break
    else:
        run = 0
print("icon_bottom:", icon_bottom)

sub = mask[:icon_bottom]
xs = np.where(sub.sum(axis=0) > 0)[0]
ys = np.where(sub.sum(axis=1) > 0)[0]
x0, x1, y0, y1 = int(xs.min()), int(xs.max()), int(ys.min()), int(ys.max())
print("bbox icono:", x0, y0, x1, y1)

# ---------- 3. Recorte con flood-fill de fondo -> transparente ----------
pad = 16
crop = im.crop((max(0, x0 - pad), max(0, y0 - pad), min(W, x1 + pad + 1), min(H, y1 + pad + 1))).convert("RGB")
arr = np.asarray(crop)
alpha = np.full((crop.size[1], crop.size[0]), 255, np.uint8)
ca = np.dstack([arr, alpha]).astype(np.uint8).copy()

cd = np.sqrt(((ca[:, :, :3].astype(np.int16) - bg) ** 2).sum(axis=2))
nearbg = cd < 34
h2, w2 = nearbg.shape
seen = np.zeros((h2, w2), bool)
dq = deque()
for x in range(w2):
    for y in (0, h2 - 1):
        if nearbg[y, x] and not seen[y, x]:
            seen[y, x] = True
            dq.append((y, x))
for y in range(h2):
    for x in (0, w2 - 1):
        if nearbg[y, x] and not seen[y, x]:
            seen[y, x] = True
            dq.append((y, x))
while dq:
    y, x = dq.popleft()
    ca[y, x, 3] = 0
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        ny, nx = y + dy, x + dx
        if 0 <= ny < h2 and 0 <= nx < w2 and nearbg[ny, nx] and not seen[ny, nx]:
            seen[ny, nx] = True
            dq.append((ny, nx))

# bordes suaves: alpha parcial en píxeles con distancia media al fondo
edge = (~nearbg) & (cd < 50)
ca[edge, 3] = np.clip((cd[edge] - 30) * 255 / 20, 0, 255).astype(np.uint8)

transparent_frac = float((ca[:, :, 3] == 0).mean())
print(f"transparencia del recorte: {transparent_frac:.1%}")
assert 0.15 < transparent_frac < 0.85, "flood-fill sospechoso"

icon_rgba = Image.fromarray(ca)

# ---------- 4. Lienzo cuadrado centrado con padding ----------
def to_square(img, size, pad_frac=0.08):
    w, h = img.size
    s = int(max(w, h) * (1 + pad_frac * 2))
    canvas = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    canvas.paste(img, ((s - w) // 2, (s - h) // 2), img)
    return canvas.resize((size, size), Image.LANCZOS)

to_square(icon_rgba, 320).save("/home/z/my-project/public/logo.png")
to_square(icon_rgba, 256).save("/home/z/my-project/src/app/icon.png")
print("guardados public/logo.png (320) y src/app/icon.png (256)")

# ---------- 5. Muestreo de colores del logo ----------
rgb = np.asarray(im).astype(np.float32)
r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
mx = rgb.max(axis=2)
mn = rgb.min(axis=2)
sat = (mx - mn) / (mx + 1e-6)

icon_region = np.zeros((H, W), bool)
icon_region[y0:y1 + 1, x0:x1 + 1] = True

blue_m = icon_region & (b > r + 30) & (b > g + 15) & (sat > 0.25)
green_m = icon_region & (g > r + 20) & (g > b + 20) & (sat > 0.25)
dark_m = icon_region & (mx < 120) & (sat < 0.4)

for name, m in (("azul icono", blue_m), ("verde icono", green_m)):
    if m.sum() > 0:
        vals = rgb[m]
        lum = vals.mean(axis=1)
        order = np.argsort(lum)
        print(f"{name}: oscuro {hexc(vals[order[int(len(order)*0.08)]])} "
              f"medio {hexc(np.median(vals, axis=0))} "
              f"claro {hexc(vals[order[int(len(order)*0.92)]])}  ({m.sum()} px)")

# ---------- 6. Colores de la landing ----------
lp = Image.open("/home/z/my-project/upload/landingpage.jpg").convert("RGB")
lpw, lph = lp.size
a = np.asarray(lp).astype(np.float32)

def med(box, cond=None, label=""):
    x0b, y0b, x1b, y1b = [int(v) for v in box]
    reg = a[y0b:y1b, x0b:x1b].reshape(-1, 3)
    if cond is not None:
        rr, gg, bb = reg[:, 0], reg[:, 1], reg[:, 2]
        keep = cond(rr, gg, bb)
        reg = reg[keep]
    print(label, hexc(np.median(reg, axis=0)) if len(reg) else "sin datos")

med((250, 345, 500, 392), lambda r, g, b: (b > r + 40), "botón azul landing:")
med((213, 148, 640, 228), None, "caja titular (todo):")
reg = a[148:228, 213:640].reshape(-1, 3)
lum = reg.mean(axis=1)
dark = reg[lum < np.percentile(lum, 2)]
print("titular oscuro:", hexc(np.median(dark, axis=0)))
med((20, 640, 140, 740), None, "fondo landing:")
med((780, 230, 880, 310), lambda r, g, b: (g > r + 20) & (g > b + 20), "verde flecha:")
reg = a[440:530, 390:1030].reshape(-1, 3)
lum = reg.mean(axis=1)
dark = reg[lum < np.percentile(lum, 5)]
print("wordmark gris oscuro:", hexc(np.median(dark, axis=0)))
