"use client";

import { Hotel, AlertTriangle } from "lucide-react";
import { CheckInForm } from "@/components/CheckInForm";
import { BatchResponse } from "@/lib/api";

interface Props {
  batch?: BatchResponse;
  uuid?: string;
  directMode?: boolean;
}

export function CheckInShell({ batch, uuid, directMode = false }: Props) {
  const isInvalid = !directMode && !batch;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 shadow-lg mb-4">
            <Hotel className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            住宿登记 / 宿泊者登録
          </h1>
          <p className="text-slate-500 text-sm mt-1">Guest Registration</p>
          <p className="text-base font-semibold text-blue-600 mt-2 tracking-wide">
            宸·Shin
          </p>
        </div>

        {isInvalid ? (
          <div className="rounded-xl bg-white border border-red-200 shadow p-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">链接无效</h2>
            <p className="text-slate-500 text-sm">
              该链接已过期或已被禁用，请联系管理员。
              <br />
              このリンクは期限切れか無効です。
              <br />
              This link has expired or been deactivated.
            </p>
          </div>
        ) : (
          <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-6">
            {/* Batch info bar (UUID mode only) */}
            {batch && (
              <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider">房间 / Room</p>
                  <p className="font-semibold text-slate-800">
                    {batch.room_number || "—"}&nbsp;·&nbsp;{batch.title}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">有效期至</p>
                  <p className="text-sm font-medium text-slate-700">
                    {new Date(batch.expires_at).toLocaleString("zh-CN", {
                      month: "numeric",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            )}

            <CheckInForm batchId={uuid} />
          </div>
        )}
      </div>
    </div>
  );
}
