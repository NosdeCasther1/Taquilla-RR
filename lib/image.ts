const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/** Comprime y redimensiona antes de convertir a data URL.
 *  Base64 infla ~33% el tamaño; esto evita superar el límite del servidor. */
export async function fileToDataUrl(file: File, maxBytes = 400_000): Promise<string> {
  if (!ALLOWED.includes(file.type)) {
    throw new Error("Usa JPG, PNG, WEBP o GIF");
  }
  if (file.size > 4_000_000) {
    throw new Error("La imagen original debe pesar menos de 4 MB");
  }

  const bitmap = await createImageBitmap(file);
  const maxDim = 1024;
  let { width, height } = bitmap;

  if (width > maxDim || height > maxDim) {
    const scale = maxDim / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("No se pudo procesar la imagen");
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  // Probar WEBP y luego JPEG, bajando calidad hasta caber en maxBytes.
  for (const mime of ["image/webp", "image/jpeg"] as const) {
    for (let q = 0.85; q >= 0.45; q -= 0.1) {
      const dataUrl = canvas.toDataURL(mime, q);
      if (estimateBytes(dataUrl) <= maxBytes) {
        return dataUrl;
      }
    }
  }

  throw new Error(
    "La imagen sigue siendo muy grande después de comprimir. Prueba con una foto más pequeña."
  );
}

function estimateBytes(dataUrl: string) {
  const base64 = dataUrl.split(",")[1] ?? "";
  return Math.ceil((base64.length * 3) / 4);
}
