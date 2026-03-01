"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Hotel, Check, LogOut, Download, Users, BarChart2,
  List, Loader2, Plus, Search, X, ChevronLeft, ChevronRight, ImageOff, FolderArchive, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminCharts } from "@/components/AdminCharts";
import {
  listBatches, listAllGuests, exportAllGuests, exportAllPhotos,
  deleteGuest, deleteBatch,
  BatchResponse, GuestRow,
} from "@/lib/api";
import { formatDateTime } from "@/lib/utils";

type Tab = "guests" | "analytics";

// ─── 列定义：必填在前，选填在后，最后元数据 ───────────────────────────────────
const COLUMNS: {
  key: keyof GuestRow | "photos";
  label: string;
  minW?: string;
  mono?: boolean;
  required?: boolean;
}[] = [
  // ── 必填 ──
  { key: "name",           label: "姓名",     minW: "100px", required: true  },
  { key: "phone",          label: "电话",     minW: "130px", required: true  },
  { key: "address",        label: "住址",     minW: "180px", required: true  },
  { key: "photos",         label: "照片",     minW: "80px",  required: true  },
  // ── 选填 ──
  { key: "arrival_date",   label: "入住日期", minW: "100px" },
  { key: "departure_date", label: "离开日期", minW: "100px" },
  { key: "occupation",     label: "职业",     minW: "90px"  },
  { key: "age",            label: "年龄",     minW: "52px"  },
  { key: "gender",         label: "性别",     minW: "52px"  },
  { key: "nationality",    label: "国籍",     minW: "80px"  },
  { key: "passport_number",label: "护照号",   minW: "110px", mono: true },
  // ── 元数据 ──
  { key: "submitted_at",   label: "登记时间", minW: "140px" },
  { key: "batch_title",    label: "批次",     minW: "140px" },
  { key: "room_number",    label: "房间",     minW: "80px"  },
  // ── 操作 ──
  { key: "_actions" as keyof GuestRow, label: "",  minW: "48px"  },
];

// ─── 照片灯箱 ─────────────────────────────────────────────────────────────────
function PhotoLightbox({
  urls,
  initialIndex,
  onClose,
}: {
  urls: string[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(initialIndex);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setIdx((i) => Math.min(i + 1, urls.length - 1));
      if (e.key === "ArrowLeft")  setIdx((i) => Math.max(i - 1, 0));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, urls.length]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="relative max-w-3xl w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 关闭 */}
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white/70 hover:text-white"
        >
          <X className="w-6 h-6" />
        </button>

        {/* 主图 */}
        <div className="rounded-xl overflow-hidden bg-black flex items-center justify-center min-h-[300px] max-h-[70vh]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/${urls[idx]}`}
            alt={`photo-${idx + 1}`}
            className="max-w-full max-h-[70vh] object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "";
            }}
          />
        </div>

        {/* 翻页 */}
        {urls.length > 1 && (
          <div className="flex items-center justify-center gap-6 mt-4">
            <button
              onClick={() => setIdx((i) => Math.max(i - 1, 0))}
              disabled={idx === 0}
              className="text-white/60 hover:text-white disabled:opacity-30"
            >
              <ChevronLeft className="w-7 h-7" />
            </button>
            <span className="text-white/70 text-sm">
              {idx + 1} / {urls.length}
            </span>
            <button
              onClick={() => setIdx((i) => Math.min(i + 1, urls.length - 1))}
              disabled={idx === urls.length - 1}
              className="text-white/60 hover:text-white disabled:opacity-30"
            >
              <ChevronRight className="w-7 h-7" />
            </button>
          </div>
        )}

        {/* 缩略图条 */}
        {urls.length > 1 && (
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1 justify-center">
            {urls.map((u, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={`/${u}`}
                alt={`thumb-${i + 1}`}
                onClick={() => setIdx(i)}
                className={`w-14 h-14 object-cover rounded cursor-pointer flex-shrink-0 transition-all ${
                  i === idx ? "ring-2 ring-white opacity-100" : "opacity-50 hover:opacity-80"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 照片预览格子（表格内） ────────────────────────────────────────────────────
function PhotoCell({
  photos,
  onOpen,
}: {
  photos: string[];
  onOpen: (idx: number) => void;
}) {
  if (!photos || photos.length === 0) {
    return (
      <span className="flex items-center gap-1 text-slate-300 text-xs">
        <ImageOff className="w-3 h-3" /> 无
      </span>
    );
  }
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {photos.slice(0, 3).map((p, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={`/${p}`}
          alt={`p${i}`}
          onClick={() => onOpen(i)}
          className="w-9 h-9 object-cover rounded border border-slate-200 cursor-pointer hover:ring-2 hover:ring-blue-400 transition"
        />
      ))}
      {photos.length > 3 && (
        <button
          onClick={() => onOpen(3)}
          className="w-9 h-9 rounded border border-slate-200 bg-slate-50 text-slate-500 text-[10px] font-semibold hover:bg-blue-50 hover:border-blue-300 transition"
        >
          +{photos.length - 3}
        </button>
      )}
    </div>
  );
}

// ─── 确认对话框 ───────────────────────────────────────────────────────────────
function ConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel,
  loading,
}: {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
        <h3 className="text-base font-semibold text-slate-800 mb-2">{title}</h3>
        <p className="text-sm text-slate-500 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            确认删除
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 主页面 ───────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [tab, setTab] = useState<Tab>("guests");
  const [batches, setBatches] = useState<BatchResponse[]>([]);
  const [guests, setGuests] = useState<GuestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [exporting, setExporting]      = useState(false);
  const [exportingZip, setExportingZip] = useState(false);

  // 灯箱状态
  const [lightbox, setLightbox] = useState<{ photos: string[]; idx: number } | null>(null);

  // 删除确认状态
  type ConfirmState =
    | { type: "guest"; id: string; name: string }
    | { type: "batch"; id: string; title: string; count: number };
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [b, g] = await Promise.all([listBatches(), listAllGuests()]);
      setBatches(b);
      setGuests(g);
    } catch {
      localStorage.removeItem("zhweb_admin_token");
      window.location.replace("/admin");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!localStorage.getItem("zhweb_admin_token")) {
      window.location.replace("/admin");
      return;
    }
    loadData();
  }, [loadData]);

  function logout() {
    localStorage.removeItem("zhweb_admin_token");
    window.location.replace("/admin");
  }

  async function handleExportAll() {
    setExporting(true);
    try {
      const res = await exportAllGuests();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      const now = new Date().toLocaleDateString("zh-CN").replace(/\//g, "-");
      a.download = `全部住客_${now}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("导出失败，请重试");
    } finally {
      setExporting(false);
    }
  }

  async function handleExportPhotos() {
    setExportingZip(true);
    try {
      const res = await exportAllPhotos();
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/zip" }));
      const a = document.createElement("a");
      a.href = url;
      const now = new Date().toLocaleDateString("zh-CN").replace(/\//g, "-");
      a.download = `全部照片_${now}.zip`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("照片打包失败，请重试");
    } finally {
      setExportingZip(false);
    }
  }

  async function handleConfirmDelete() {
    if (!confirm) return;
    setDeleting(true);
    try {
      if (confirm.type === "guest") {
        await deleteGuest(confirm.id);
        setGuests((prev) => prev.filter((g) => g.id !== confirm.id));
      } else {
        await deleteBatch(confirm.id);
        setGuests((prev) => prev.filter((g) => g.batch_id !== confirm.id));
        setBatches((prev) => prev.filter((b) => b.id !== confirm.id));
      }
      setConfirm(null);
    } catch {
      alert("删除失败，请重试");
    } finally {
      setDeleting(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return guests;
    return guests.filter((g) =>
      [g.name, g.phone, g.address, g.nationality, g.passport_number,
       g.occupation, g.batch_title, g.room_number]
        .some((v) => (v ?? "").toLowerCase().includes(q))
    );
  }, [guests, search]);

  const batchIds = useMemo(
    () => [...new Set(filtered.map((g) => g.batch_id))],
    [filtered]
  );

  const activeBatches = batches.filter((b) => b.status === "active").length;
  const totalGuests   = guests.length;

  function formatPhone(raw: string | null | undefined): string {
    if (!raw) return "";
    if (raw.includes("-")) return raw;
    // 按位数从长到短匹配已知区号，避免贪心错位
    const knownCodes = ["+852","+853","+855","+856","+886","+81","+82","+84","+86","+90","+1"];
    for (const code of knownCodes) {
      if (raw.startsWith(code)) return `${code}-${raw.slice(code.length)}`;
    }
    // 兜底：取前2位作为区号
    const m = raw.match(/^(\+\d{2})(\d+)$/);
    if (m) return `${m[1]}-${m[2]}`;
    return raw;
  }

  function renderCell(g: GuestRow, col: typeof COLUMNS[0], onDelete: () => void) {
    if ((col.key as string) === "_actions") {
      return (
        <button
          onClick={onDelete}
          className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
          title="删除此条记录"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      );
    }
    if (col.key === "photos") {
      return (
        <PhotoCell
          photos={g.photos}
          onOpen={(idx) => setLightbox({ photos: g.photos, idx })}
        />
      );
    }
    const v = g[col.key as keyof GuestRow];
    if (col.key === "phone")        return formatPhone(g.phone) || <span className="text-slate-300">—</span>;
    if (col.key === "gender")       return v === "M" ? "男" : v === "F" ? "女" : <span className="text-slate-300">—</span>;
    if (col.key === "submitted_at") return v ? formatDateTime(v as string) : "—";
    if (v === null || v === undefined || v === "" || v === "-")
      return <span className="text-slate-300">—</span>;
    return <span className={col.mono ? "font-mono tracking-wide text-xs" : ""}>{String(v)}</span>;
  }

  return (
    <>
      {lightbox && (
        <PhotoLightbox
          urls={lightbox.photos}
          initialIndex={lightbox.idx}
          onClose={() => setLightbox(null)}
        />
      )}

      {confirm && (
        <ConfirmDialog
          title={confirm.type === "guest" ? "删除住客记录" : "删除整个批次"}
          message={
            confirm.type === "guest"
              ? `确定要删除「${confirm.name}」的登记记录及所有照片吗？此操作不可撤销。`
              : `确定要删除批次「${confirm.title}」及其 ${confirm.count} 条住客记录和所有照片吗？此操作不可撤销。`
          }
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirm(null)}
          loading={deleting}
        />
      )}

      <div className="min-h-screen bg-slate-50">
        {/* 顶部导航 */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="max-w-screen-2xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <Hotel className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-slate-800">住宿登记系统 · 管理后台</span>
            </div>
            <Button variant="ghost" size="sm" onClick={logout} className="text-slate-500">
              <LogOut className="h-4 w-4" />
              退出登录
            </Button>
          </div>
        </header>

        <main className="max-w-screen-2xl mx-auto px-4 py-6 space-y-6">
          {/* 统计卡片 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "总批次数", value: batches.length,  icon: List,  color: "text-blue-600"   },
              { label: "有效链接", value: activeBatches,   icon: Check, color: "text-emerald-600" },
              { label: "总住客数", value: totalGuests,     icon: Users, color: "text-violet-600"  },
              {
                label: "今日新增",
                value: guests.filter(
                  (g) => new Date(g.submitted_at).toDateString() === new Date().toDateString()
                ).length,
                icon: Plus, color: "text-amber-600",
              },
            ].map(({ label, value, icon: Icon, color }) => (
              <Card key={label}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`${color} bg-current/10 rounded-lg p-2`}>
                    <Icon className={`h-5 w-5 ${color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800">{value}</p>
                    <p className="text-xs text-slate-500">{label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tab 切换 */}
          <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-1 w-fit">
            {([
              { id: "guests"    as Tab, label: "住客列表", icon: Users    },
              { id: "analytics" as Tab, label: "数据分析", icon: BarChart2 },
            ] as const).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  tab === id
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          {tab === "guests" && (
            <div className="space-y-4">
              {/* 搜索 + 批量导出 */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[220px] max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="搜索姓名、电话、国籍、护照号…"
                    className="pl-9 pr-8"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <span className="text-sm text-slate-500">
                  共 <span className="font-semibold text-slate-700">{filtered.length}</span> 条记录
                </span>

                {/* 右侧操作按钮 */}
                <div className="ml-auto flex items-center gap-2">
                  <Button
                    onClick={handleExportAll}
                    disabled={exporting || guests.length === 0}
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {exporting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    导出全部 CSV（{guests.length} 人）
                  </Button>

                  <Button
                    onClick={handleExportPhotos}
                    disabled={exportingZip || guests.length === 0}
                    size="sm"
                    variant="outline"
                    className="border-blue-300 text-blue-600 hover:bg-blue-50"
                  >
                    {exportingZip ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FolderArchive className="h-4 w-4" />
                    )}
                    下载全部照片 ZIP
                  </Button>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center h-64 text-slate-400 text-sm bg-white rounded-xl border">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" /> 加载中…
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-slate-400 text-sm bg-white rounded-xl border">
                  {search ? "未找到匹配记录" : "暂无住客数据"}
                </div>
              ) : (
                <div className="space-y-4">
                  {batchIds.map((batchId) => {
                    const rows  = filtered.filter((g) => g.batch_id === batchId);
                    const first = rows[0];

                    return (
                      <div key={batchId} className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                        {/* 批次标题行 */}
                        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-sm text-slate-700">
                              {first.batch_title}
                            </span>
                            {first.room_number && (
                              <span className="text-xs text-slate-500 bg-white border border-slate-200 rounded px-2 py-0.5">
                                {first.room_number}
                              </span>
                            )}
                            <span className="text-xs text-slate-400">{rows.length} 人</span>
                          </div>
                          <button
                            onClick={() =>
                              setConfirm({
                                type: "batch",
                                id: batchId,
                                title: first.batch_title,
                                count: rows.length,
                              })
                            }
                            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                            title="删除整个批次"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            删除批次
                          </button>
                        </div>

                        {/* 表格 */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm whitespace-nowrap">
                            <thead>
                              <tr className="border-b border-slate-100 bg-slate-50/50">
                                {COLUMNS.map((col) => (
                                  <th
                                    key={col.key}
                                    style={{ minWidth: col.minW }}
                                    className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
                                  >
                                    {col.label}
                                    {col.required && (
                                      <span className="text-red-400 ml-0.5">*</span>
                                    )}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map((g, i) => (
                                <tr
                                  key={g.id}
                                  className={`border-b border-slate-50 hover:bg-blue-50/30 transition-colors ${
                                    i % 2 === 0 ? "" : "bg-slate-50/30"
                                  }`}
                                >
                                {COLUMNS.map((col) => (
                                  <td
                                    key={col.key}
                                    className="px-3 py-2.5 text-slate-700 max-w-[220px] truncate align-middle"
                                    title={
                                      col.key !== "photos" && (col.key as string) !== "_actions" &&
                                      typeof g[col.key as keyof GuestRow] === "string"
                                        ? (g[col.key as keyof GuestRow] as string)
                                        : undefined
                                    }
                                  >
                                    {renderCell(g, col, () =>
                                      setConfirm({ type: "guest", id: g.id, name: g.name })
                                    )}
                                  </td>
                                ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === "analytics" && <AdminCharts />}
        </main>
      </div>
    </>
  );
}
