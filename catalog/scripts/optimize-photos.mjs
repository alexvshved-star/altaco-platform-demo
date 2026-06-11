// Оптимізація фото каталогу під веб: будь-який .jpg/.jpeg/.png у public/photos/
// → .webp (ресайз до макс. ширини, стиснення), оригінал видаляється.
// Запускати після додавання нових фото: npm run photos. Білд читає лише webp.
import { readdirSync, statSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dir = path.join(root, "public", "photos");
const MAX_W = 1400;
const QUALITY = 72;

function* walk(d) {
  for (const name of readdirSync(d)) {
    const p = path.join(d, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}

let done = 0;
for (const file of walk(dir)) {
  if (!/\.(jpe?g|png)$/i.test(file)) continue;
  const out = file.replace(/\.(jpe?g|png)$/i, ".webp");
  const before = statSync(file).size;
  const info = await sharp(file)
    .rotate()
    .resize({ width: MAX_W, withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toFile(out);
  rmSync(file);
  done++;
  console.log(
    `${path.relative(dir, out)}  ${(before / 1024).toFixed(0)}KB → ${(info.size / 1024).toFixed(0)}KB  ${info.width}px`,
  );
}
console.log(`\nОптимізовано ${done} фото.`);
