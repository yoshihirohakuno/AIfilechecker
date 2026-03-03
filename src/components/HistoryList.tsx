"use client";

import { CheckHistoryItem } from "@/types";
import { CheckCircle2, XCircle, AlertTriangle, FileText, Copy, Check } from "lucide-react";
import { useState } from "react";

interface HistoryListProps {
    items: CheckHistoryItem[];
}

export function HistoryList({ items }: HistoryListProps) {
    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-slate-200 shadow-sm">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                    <FileText className="w-10 h-10 text-slate-300" />
                </div>
                <p className="text-xl font-bold text-slate-700 mb-2">履歴がありません</p>
                <p className="text-sm font-medium text-slate-500">左のフォームから判定を実行してください</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-5 pb-12">
            {items.map((item) => (
                <HistoryCard key={item.id} item={item} />
            ))}
        </div>
    );
}

function HistoryCard({ item }: { item: CheckHistoryItem }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(item.comment);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy text: ", err);
        }
    };

    const statusConfig = {
        OK: {
            color: "text-emerald-700",
            bg: "bg-emerald-50",
            border: "border-emerald-200",
            iconIconColor: "text-emerald-500",
            icon: CheckCircle2,
            label: "OK",
        },
        NG: {
            color: "text-rose-700",
            bg: "bg-rose-50",
            border: "border-rose-200",
            iconIconColor: "text-rose-500",
            icon: XCircle,
            label: "NG",
        },
        UNDETERMINED: {
            color: "text-amber-700",
            bg: "bg-amber-50",
            border: "border-amber-200",
            iconIconColor: "text-amber-500",
            icon: AlertTriangle,
            label: "判定不可",
        },
    };

    const config = statusConfig[item.judgement];
    const Icon = config.icon;

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm shadow-slate-200/50 border border-slate-200/60 hover:shadow-md hover:border-slate-300 transition-all group">
            <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div className={`px-4 py-1.5 rounded-full border ${config.bg} ${config.border} ${config.color} flex items-center gap-2 font-bold text-sm tracking-wide shadow-sm`}>
                        <Icon className={`w-4 h-4 ${config.iconIconColor}`} />
                        {config.label}
                    </div>
                    <div className="text-sm font-bold text-slate-700 bg-slate-100 px-4 py-1.5 rounded-full tracking-wider border border-slate-200">
                        {item.orderNo}
                    </div>
                </div>
                <div className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                    {new Date(item.createdAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6 p-5 bg-slate-50 rounded-xl border border-slate-100/80">
                <div>
                    <div className="text-slate-500 font-bold text-xs mb-1.5">ファイル名</div>
                    <div className="font-bold text-slate-800 truncate" title={item.fileName}>
                        {item.fileName}
                    </div>
                </div>
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center bg-white px-3 py-2 rounded-lg border border-slate-100 shadow-sm">
                        <span className="text-slate-500 font-bold text-xs">フォントアウトライン化</span>
                        <span className={`font-black text-sm px-2 py-0.5 rounded ${item.fontOutlineOk === true ? "bg-emerald-50 text-emerald-600" :
                            item.fontOutlineOk === false ? "bg-rose-50 text-rose-600" :
                                "bg-slate-50 text-slate-400"
                            }`}>
                            {item.fontOutlineOk === true ? "OK" : item.fontOutlineOk === false ? "NG" : "---"}
                        </span>
                    </div>
                    <div className="flex justify-between items-center bg-white px-3 py-2 rounded-lg border border-slate-100 shadow-sm">
                        <span className="text-slate-500 font-bold text-xs">CMYKカラー (RGB混在)</span>
                        <span className={`font-black text-sm px-2 py-0.5 rounded ${item.cmykOk === true ? "bg-emerald-50 text-emerald-600" :
                            item.cmykOk === false ? "bg-rose-50 text-rose-600" :
                                "bg-slate-50 text-slate-400"
                            }`}>
                            {item.cmykOk === true ? "OK" : item.cmykOk === false ? "NG (警告)" : "---"}
                        </span>
                    </div>
                    <div className="flex justify-between items-center bg-white px-3 py-2 rounded-lg border border-slate-100 shadow-sm">
                        <span className="text-slate-500 font-bold text-xs">画像解像度 (300dpi以上)</span>
                        <span className={`font-black text-sm px-2 py-0.5 rounded ${item.resolutionOk === true ? "bg-emerald-50 text-emerald-600" :
                            item.resolutionOk === false ? "bg-amber-50 text-amber-600" :
                                "bg-slate-50 text-slate-400"
                            }`}>
                            {item.resolutionOk === true ? "OK" : item.resolutionOk === false ? "NG (警告)" : "---"}
                        </span>
                    </div>
                    <div className="flex justify-between items-center bg-white px-3 py-2 rounded-lg border border-slate-100 shadow-sm">
                        <span className="text-slate-500 font-bold text-xs">線幅 (0.3pt以上)</span>
                        <span className={`font-black text-sm px-2 py-0.5 rounded ${item.lineWidthOk === true ? "bg-emerald-50 text-emerald-600" :
                            item.lineWidthOk === false ? "bg-amber-50 text-amber-600" :
                                "bg-slate-50 text-slate-400"
                            }`}>
                            {item.lineWidthOk === true ? "OK" : item.lineWidthOk === false ? "NG (警告)" : "---"}
                        </span>
                    </div>
                </div>
            </div>

            <div className="relative">
                <div className="absolute -top-3 left-4 bg-white px-2 text-xs font-black text-indigo-500 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    自動生成コメント
                </div>
                <div className="bg-white border-2 border-indigo-50/80 rounded-xl p-5 pt-6 text-sm font-medium text-slate-700 whitespace-pre-wrap leading-relaxed shadow-sm">
                    {item.comment}
                </div>
                <button
                    onClick={handleCopy}
                    className="absolute bottom-3 right-3 px-3 py-2 bg-white rounded-lg shadow-sm border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:shadow transition-all group-hover:opacity-100 flex items-center gap-1.5 font-bold text-xs"
                    title="コメントをコピー"
                >
                    {copied ? (
                        <>
                            <Check className="w-4 h-4 text-emerald-500" />
                            <span className="text-emerald-600">コピー完了</span>
                        </>
                    ) : (
                        <>
                            <Copy className="w-4 h-4" />
                            <span>コピー</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
