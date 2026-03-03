"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { CheckHistoryItem } from "@/types";
import { UploadCloud, Loader2, AlertCircle } from "lucide-react";
import { checkPdfPolicy } from "@/lib/pdfChecker";
import { generateComment } from "@/lib/commentGenerator";

interface UploadFormProps {
    onResult: (item: CheckHistoryItem) => void;
}

export function UploadForm({ onResult }: UploadFormProps) {
    const [orderNo, setOrderNo] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const onDrop = useCallback(
        async (acceptedFiles: File[], fileRejections: any[]) => {
            if (!orderNo.trim()) {
                setError("注文番号を入力してください。");
                return;
            }

            if (fileRejections.length > 0) {
                console.error("Rejected files:", fileRejections);
                setError("未対応のファイル形式、またはサイズが大きすぎます（AIファイルの場合は拡張子を .ai にしてください）。");
                return;
            }

            setError(null);

            for (const file of acceptedFiles) {
                setIsProcessing(true);
                try {
                    const policyResult = await checkPdfPolicy(file);

                    let judgement: "OK" | "NG" | "UNDETERMINED" = "UNDETERMINED";
                    let comment = "";

                    if (!policyResult.isPdfCompatible) {
                        judgement = "UNDETERMINED";
                        comment = generateComment(orderNo, judgement, undefined, undefined, undefined, undefined, policyResult.error);
                    } else if (policyResult.fontOutlineOk && policyResult.cmykOk) {
                        // Accept if there is no blocking issues (warning only for resolution and line width)
                        judgement = "OK";
                        comment = generateComment(
                            orderNo,
                            judgement,
                            true,
                            true,
                            policyResult.resolutionOk,
                            policyResult.lineWidthOk
                        );
                    } else {
                        judgement = "NG";
                        comment = generateComment(
                            orderNo,
                            judgement,
                            policyResult.fontOutlineOk,
                            policyResult.cmykOk,
                            policyResult.resolutionOk,
                            policyResult.lineWidthOk
                        );
                    }

                    const newItem: CheckHistoryItem = {
                        id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
                        orderNo,
                        fileName: file.name,
                        fileType: file.name.toLowerCase().endsWith(".ai") ? "ai" : "pdf",
                        status: "done",
                        judgement,
                        fontOutlineOk: policyResult.fontOutlineOk,
                        cmykOk: policyResult.cmykOk,
                        resolutionOk: policyResult.resolutionOk,
                        lineWidthOk: policyResult.lineWidthOk,
                        comment,
                        createdAt: new Date().toISOString(),
                    };
                    onResult(newItem);
                } catch (err: any) {
                    console.error("UploadForm parsing error:", err);
                    setError(err.message || "ファイルの処理中にエラーが発生しました。");
                } finally {
                    setIsProcessing(false);
                }
            }
        },
        [orderNo, onResult]
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            "application/pdf": [".pdf"],
            "application/postscript": [".ai", ".eps"],
            "application/illustrator": [".ai"],
            "application/vnd.adobe.illustrator": [".ai"],
            "application/x-adobe-illustrator": [".ai"],
            "image/vnd.adobe.illustrator": [".ai"],
        },
        maxSize: 100 * 1024 * 1024, // 100MB
    });

    return (
        <div className="flex flex-col gap-6">
            {/* Order Number Input */}
            <div>
                <label htmlFor="orderNo" className="block text-sm font-bold text-slate-700 mb-2">
                    注文番号 <span className="text-rose-500">*</span>
                </label>
                <input
                    type="text"
                    id="orderNo"
                    value={orderNo}
                    onChange={(e) => {
                        setOrderNo(e.target.value);
                        if (e.target.value.trim() && error === "注文番号を入力してください。") {
                            setError(null);
                        }
                    }}
                    placeholder="例: ORD-123456"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none font-medium text-slate-900 shadow-sm placeholder:text-slate-400"
                />
                {error && orderNo.trim() === "" && (
                    <p className="mt-2 text-sm font-bold text-rose-500 flex items-center gap-1.5 bg-rose-50 p-2 rounded-lg border border-rose-100">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                    </p>
                )}
            </div>

            {/* Dropzone */}
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex justify-between items-center">
                    <span>入稿データ</span>
                    <span className="text-xs font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded">PDF / 互換AI</span>
                </label>
                <div
                    {...getRootProps()}
                    className={`relative overflow-hidden group rounded-2xl border-2 border-dashed transition-all duration-300 ease-in-out cursor-pointer flex flex-col items-center justify-center p-8 min-h-[240px] shadow-sm hover:shadow-md
            ${isDragActive ? "border-indigo-400 bg-indigo-50/70" : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30"}`}
                >
                    <input {...getInputProps()} />

                    {isProcessing ? (
                        <div className="flex flex-col items-center text-indigo-600">
                            <Loader2 className="w-10 h-10 animate-spin mb-4" />
                            <p className="text-sm font-bold tracking-wide">解析中...</p>
                        </div>
                    ) : (
                        <>
                            <div className={`p-4 rounded-2xl mb-5 transition-all duration-300 ${isDragActive ? 'bg-indigo-600 text-white scale-110 shadow-lg shadow-indigo-200' : 'bg-slate-50 text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 group-hover:scale-110 shadow-sm border border-slate-100'}`}>
                                <UploadCloud className="w-8 h-8" />
                            </div>
                            <p className={`text-base font-bold mb-1 transition-colors ${isDragActive ? 'text-indigo-700' : 'text-slate-700 group-hover:text-indigo-900'}`}>
                                {isDragActive ? "ここにドロップして解析" : "ファイルを選択 または ドロップ"}
                            </p>
                            <p className="text-xs font-semibold text-slate-400 text-center flex items-center gap-1 mt-2">
                                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
                                最大100MBまでアップロード可能
                            </p>
                        </>
                    )}
                </div>
                {error && orderNo.trim() !== "" && (
                    <p className="mt-2 text-sm font-bold text-rose-500 flex items-center gap-1.5 bg-rose-50 p-2 rounded-lg border border-rose-100">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                    </p>
                )}
            </div>
        </div>
    );
}
