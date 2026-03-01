const MAX_DIMENSION = 1920;   // 最长边不超过 1920px
const QUALITY_START  = 0.85;
const QUALITY_MIN    = 0.25;
const QUALITY_STEP   = 0.1;

const HEIC_LIKE = new Set(["heic", "heif"]);

/** 格式化字节数为可读字符串 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024)              return `${bytes} B`;
  if (bytes < 1024 * 1024)      return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * 在浏览器中压缩图片到目标大小以内。
 * - 使用 Canvas + JPEG 重新编码
 * - HEIC / HEIF 无法被 Canvas 解码，直接返回原文件
 * - 如果原文件已经 ≤ maxBytes，直接返回
 */
export async function compressImage(
  file: File,
  maxBytes = 1 * 1024 * 1024   // 默认 1 MB
): Promise<File> {
  // 已经够小，不需要处理
  if (file.size <= maxBytes) return file;

  // HEIC 等格式 Canvas 无法解码，跳过压缩
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (HEIC_LIKE.has(ext)) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;

    // 等比例缩小到 MAX_DIMENSION
    let tw = width;
    let th = height;
    const maxDim = Math.max(width, height);
    if (maxDim > MAX_DIMENSION) {
      const scale = MAX_DIMENSION / maxDim;
      tw = Math.round(width  * scale);
      th = Math.round(height * scale);
    }

    const canvas = document.createElement("canvas");
    canvas.width  = tw;
    canvas.height = th;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(bitmap, 0, 0, tw, th);
    bitmap.close();

    // 从 QUALITY_START 向下逐步降质，找到第一个满足大小的质量值
    for (let q = QUALITY_START; q >= QUALITY_MIN - 0.001; q -= QUALITY_STEP) {
      const blob = await toBlob(canvas, "image/jpeg", Math.max(q, QUALITY_MIN));
      if (blob.size <= maxBytes || q <= QUALITY_MIN) {
        const newName = file.name.replace(/\.[^.]+$/, ".jpg");
        return new File([blob], newName, {
          type: "image/jpeg",
          lastModified: Date.now(),
        });
      }
    }

    // 保底：用最低质量
    const blob = await toBlob(canvas, "image/jpeg", QUALITY_MIN);
    const newName = file.name.replace(/\.[^.]+$/, ".jpg");
    return new File([blob], newName, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    // Canvas 解码失败（例如某些特殊格式），返回原文件
    return file;
  }
}

function toBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      type,
      quality
    );
  });
}
