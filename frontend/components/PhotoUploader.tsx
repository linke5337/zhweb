"use client";

import { useRef, useState } from "react";
import { Camera, X, Plus, Loader2 } from "lucide-react";
import { compressImage, formatBytes } from "@/lib/compressImage";
import { cn } from "@/lib/utils";

const MAX_PHOTOS  = 9;
const MAX_BYTES   = 1 * 1024 * 1024;   // 1 MB — 超过此值才压缩
const HARD_LIMIT  = 10 * 1024 * 1024;  // 10 MB — 压缩后仍超过则拒绝
const ACCEPTED    =
  "image/jpeg,image/png,image/gif,image/webp,image/heic,image/heif,image/bmp";

interface SlotFile {
  file: File;
  preview: string;   // object URL
  originalSize: number;
  compressed: boolean;
}

interface Props {
  files: File[];
  onChange: (files: File[]) => void;
  error?: string;
}

export function PhotoUploader({ files, onChange, error }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [slots, setSlots] = useState<(SlotFile | null)[]>(
    Array.from({ length: MAX_PHOTOS }, (_, i) =>
      i < files.length
        ? { file: files[i], preview: URL.createObjectURL(files[i]), originalSize: files[i].size, compressed: false }
        : null
    )
  );
  const [compressingIdx, setCompressingIdx] = useState<Set<number>>(new Set());

  async function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    e.target.value = "";

    // How many empty slots do we have?
    const emptyCount = slots.filter((s) => s === null).length;
    const toProcess = selected.slice(0, emptyCount);

    // Find the indices of empty slots
    const emptyIndices: number[] = [];
    slots.forEach((s, i) => { if (s === null) emptyIndices.push(i); });

    // Show placeholder spinners immediately
    const compIdxSet = new Set(compressingIdx);
    const startIndices = emptyIndices.slice(0, toProcess.length);
    startIndices.forEach((i) => compIdxSet.add(i));
    setCompressingIdx(new Set(compIdxSet));

    // Compress in parallel
    const results = await Promise.all(
      toProcess.map(async (file, pos) => {
        const slotIdx = startIndices[pos];
        const originalSize = file.size;

        if (file.size > HARD_LIMIT) {
          // Try compress — if still too big after compress we warn later
        }

        let compressed = file;
        let wasCompressed = false;
        if (file.size > MAX_BYTES) {
          compressed = await compressImage(file, MAX_BYTES);
          wasCompressed = compressed !== file;
        }

        return { slotIdx, originalSize, file: compressed, wasCompressed };
      })
    );

    // Build updated slots
    setSlots((prev) => {
      const next = [...prev];
      results.forEach(({ slotIdx, originalSize, file, wasCompressed }) => {
        // Revoke any previous object URL
        if (next[slotIdx]?.preview) URL.revokeObjectURL(next[slotIdx]!.preview);
        next[slotIdx] = {
          file,
          preview: URL.createObjectURL(file),
          originalSize,
          compressed: wasCompressed,
        };
      });
      return next;
    });

    // Remove from compressing set
    setCompressingIdx((prev) => {
      const next = new Set(prev);
      startIndices.forEach((i) => next.delete(i));
      return next;
    });

    // Notify parent with new file list
    setSlots((prev) => {
      const allFiles = prev
        .filter((s) => s !== null)
        .map((s) => s!.file);
      onChange(allFiles);
      return prev;
    });
  }

  function remove(idx: number) {
    setSlots((prev) => {
      const next = [...prev];
      if (next[idx]?.preview) URL.revokeObjectURL(next[idx]!.preview);
      next[idx] = null;
      onChange(next.filter(Boolean).map((s) => s!.file));
      return next;
    });
  }

  const filledCount = slots.filter((s) => s !== null).length;

  return (
    <div className="space-y-3">
      {/* Label */}
      <div>
        <p className="text-[13px] text-slate-700 leading-snug mb-0.5">
          All members need to upload passport photos{" "}
          <span className="text-slate-500">
            (需要上传全员证件照片 / 全員のパスポート写真をアップロードしてください)
          </span>
          <span className="text-red-500 ml-0.5">*</span>
          :
        </p>
        <p className="text-[11px] text-slate-400">
          最多9张 · 自动压缩至1MB · 单张不超过10MB / Max 9 photos · Auto-compressed · 10MB limit per photo
        </p>
      </div>

      {/* 3×3 grid */}
      <div className="grid grid-cols-3 gap-2.5">
        {Array.from({ length: MAX_PHOTOS }, (_, i) => {
          const slot   = slots[i] ?? null;
          const busy   = compressingIdx.has(i);
          const filled = slot !== null;

          return (
            <div key={i} className="aspect-[3/4]">
              {busy ? (
                /* Compressing spinner */
                <div className="w-full h-full rounded-lg border border-blue-200 bg-blue-50 flex flex-col items-center justify-center gap-1.5">
                  <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                  <span className="text-[10px] text-blue-400">压缩中…</span>
                </div>
              ) : filled ? (
                /* Filled slot */
                <div className="relative w-full h-full rounded-lg overflow-hidden border border-slate-200 shadow-sm group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={slot!.preview}
                    alt={`photo-${i + 1}`}
                    className="w-full h-full object-cover"
                  />

                  {/* Size badge */}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[9px] text-center py-0.5 leading-tight px-1">
                    {slot!.compressed && (
                      <span className="line-through text-slate-400 mr-1">
                        {formatBytes(slot!.originalSize)}
                      </span>
                    )}
                    <span className="font-medium">{formatBytes(slot!.file.size)}</span>
                    {slot!.compressed && (
                      <span className="ml-1 text-emerald-300">✓压缩</span>
                    )}
                  </div>

                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>

                  {/* Index badge */}
                  <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/50 text-white text-[10px] flex items-center justify-center font-bold">
                    {i + 1}
                  </div>
                </div>
              ) : (
                /* Empty slot */
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  disabled={filledCount >= MAX_PHOTOS}
                  className={cn(
                    "w-full h-full rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-colors",
                    filledCount >= MAX_PHOTOS
                      ? "border-slate-100 cursor-not-allowed opacity-30"
                      : "border-slate-300 hover:border-blue-400 hover:bg-blue-50/60 cursor-pointer"
                  )}
                >
                  {i === 0 && filledCount === 0 ? (
                    <>
                      <Camera className="w-6 h-6 text-slate-400" />
                      <span className="text-[10px] text-slate-400 text-center leading-tight px-1">
                        点击上传
                        <br />
                        Upload
                      </span>
                    </>
                  ) : (
                    <Plus className="w-5 h-5 text-slate-300" />
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        multiple
        className="hidden"
        onChange={handleFileInput}
      />

      {/* Counter */}
      <p className="text-[11px] text-slate-400 text-right">
        {filledCount} / {MAX_PHOTOS} 张已选择
      </p>

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
