// Recorta el icono del logo subido y genera:
//  - public/logo.png      (para la cabecera y el pie)
//  - src/app/icon.png     (favicon de Next.js App Router)
import sharp from "sharp";

const SRC = "/home/z/my-project/upload/logojpg.jpg";

// El icono blanco ocupa aproximadamente x:175-855, y:175-855 en la imagen de 1024px
const CROP = { left: 178, top: 178, size: 676 };

await sharp(SRC)
  .extract({ left: CROP.left, top: CROP.top, width: CROP.size, height: CROP.size })
  .resize(320, 320)
  .png()
  .toFile("/home/z/my-project/public/logo.png");

await sharp(SRC)
  .extract({ left: CROP.left, top: CROP.top, width: CROP.size, height: CROP.size })
  .resize(256, 256)
  .png()
  .toFile("/home/z/my-project/src/app/icon.png");

const a = await sharp("/home/z/my-project/public/logo.png").metadata();
const b = await sharp("/home/z/my-project/src/app/icon.png").metadata();
console.log("logo.png:", a.width, "x", a.height);
console.log("icon.png:", b.width, "x", b.height);
