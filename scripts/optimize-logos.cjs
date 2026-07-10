const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.join(__dirname, "..");
const SRC_REY =
  "C:/Users/nosde/.cursor/projects/d-PROYECTOS-Taquilla-RR/assets/c__Users_nosde_AppData_Roaming_Cursor_User_workspaceStorage_4f0c2106957bf83a6c07785b65dfd68a_images_Logo_AD_Rey_de_Reyes_Llama__Fondo_Transparente-9165106a-4328-4032-ba16-3cc76759383f.png";

const OUT_REY = path.join(ROOT, "public/logos/rey-de-reyes.png");
const OUT_ABIEL = path.join(ROOT, "public/logos/abiel.png");
const OUT_ICON = path.join(ROOT, "app/icon.png");

function sizeKb(filePath) {
  return Math.round(fs.statSync(filePath).size / 1024);
}

/** Convierte píxeles negros (o casi negros) en transparentes. */
async function removeBlackBackground(input, threshold = 38) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    if (r <= threshold && g <= threshold && b <= threshold) {
      data[i + 3] = 0;
      continue;
    }

    const max = Math.max(r, g, b);
    if (max <= threshold + 18) {
      const fade = (max - threshold) / 18;
      data[i + 3] = Math.round(Math.min(255, Math.max(0, fade * 255)));
    }
  }

  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  });
}

async function optimizePng(pipeline, outPath, maxWidth, usePalette = false) {
  await pipeline
    .resize({ width: maxWidth, withoutEnlargement: true })
    .png({
      compressionLevel: 9,
      adaptiveFiltering: true,
      palette: usePalette,
      quality: usePalette ? 90 : 100,
      effort: 10,
      colors: usePalette ? 180 : undefined,
    })
    .toFile(outPath);
}

async function main() {
  const rey = await removeBlackBackground(SRC_REY);
  await optimizePng(rey.clone(), OUT_REY, 400, true);

  const abielSrc = path.join(ROOT, "public/logos/abiel.png");
  const abielTmp = path.join(ROOT, "public/logos/abiel.tmp.png");
  await optimizePng(sharp(abielSrc).rotate(), abielTmp, 200);
  fs.renameSync(abielTmp, OUT_ABIEL);

  await rey
    .clone()
    .resize(192, 192, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, effort: 10 })
    .toFile(OUT_ICON);

  console.log(`rey-de-reyes.png → ${sizeKb(OUT_REY)} KB`);
  console.log(`abiel.png → ${sizeKb(OUT_ABIEL)} KB`);
  console.log(`icon.png → ${sizeKb(OUT_ICON)} KB`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
