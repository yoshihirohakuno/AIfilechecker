"use client";

import { useState } from "react";
import { UploadForm } from "./UploadForm";
import { HistoryList } from "./HistoryList";
import { CheckHistoryItem } from "@/types";

export function MainView() {
    const [history, setHistory] = useState<CheckHistoryItem[]>([]);

    const handleNewCheck = (item: CheckHistoryItem) => {
        setHistory((prev) => [item, ...prev]);
    };

    return (
        <div className="flex flex-col md:flex-row h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
            {/* Left Column: Fixed (Upload & Status) */}
            <div className="w-full md:w-[450px] min-w-[320px] p-6 md:p-8 border-r border-slate-200 bg-white shadow-xl shadow-slate-200/50 z-10 flex flex-col h-full overflow-y-auto">
                <div className="mb-8">
                    <h1 className="text-2xl font-black tracking-tight text-indigo-950 mb-2">サイズチェッカー<span className="text-indigo-500">.</span></h1>
                    <p className="text-sm text-slate-500 font-medium">PDF/AIのサイズを判定してコメントを自動生成</p>
                </div>
                <UploadForm onResult={handleNewCheck} />
            </div>

            {/* Right Column: Scrollable (History) */}
            <div className="flex-1 p-6 md:p-8 overflow-y-auto bg-slate-50 relative h-full">
                {/* Background Decorative Pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

                <div className="max-w-4xl mx-auto relative z-10">
                    <div className="flex items-center justify-between mb-8 sticky top-0 bg-slate-50/80 backdrop-blur-md py-4 z-20 -mt-4 border-b border-slate-200/50">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            チェック履歴
                        </h2>
                        <div className="text-sm font-bold text-indigo-600 bg-indigo-50 px-4 py-1.5 rounded-full border border-indigo-100/50 shadow-sm">
                            全 {history.length} 件
                        </div>
                    </div>
                    <HistoryList items={history} />
                </div>
            </div>
        </div>
    );
}
