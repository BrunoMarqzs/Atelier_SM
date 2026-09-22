// Browser-only: called only for blob/data URLs returned by the web picker.
export async function prepareWebImage(source: Blob): Promise<Blob> {
  if (source.size > 25 * 1024 * 1024) {
    throw new Error("A foto excede 25 MB. Escolha uma versão menor.");
  }
  const url = URL.createObjectURL(source);
  const image = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Não foi possível ler a foto. Use JPEG, PNG ou WebP."));
      image.src = url;
    });
    const width = image.naturalWidth;
    const height = image.naturalHeight;
    if (!width || !height || width * height > 64_000_000) {
      throw new Error("A resolução da foto é muito grande. Escolha uma versão menor.");
    }
    const scale = Math.min(1, 2048 / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    try {
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Não foi possível preparar a foto neste navegador.");
      // JPEG has no alpha channel; avoid black backgrounds on transparent references.
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const compressed = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Falha ao preparar a foto.")),
          "image/jpeg", 0.88);
      });
      // Do not enlarge already-small supported images unnecessarily.
      const result = scale === 1 && source.size <= compressed.size &&
        ["image/jpeg", "image/png", "image/webp"].includes(source.type) ? source : compressed;
      if (result.size > 8 * 1024 * 1024) throw new Error("A foto continua acima de 8 MB. Escolha uma versão menor.");
      return result;
    } finally {
      canvas.width = canvas.height = 0;
    }
  } finally {
    image.onload = image.onerror = null;
    URL.revokeObjectURL(url);
  }
}
