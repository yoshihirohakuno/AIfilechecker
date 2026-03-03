export function generateComment(
    orderNo: string,
    judgement: "OK" | "NG" | "UNDETERMINED",
    fontOutlineOk?: boolean,
    cmykOk?: boolean,
    resolutionOk?: boolean,
    lineWidthOk?: boolean,
    errorReason?: string
): string {
    if (judgement === "UNDETERMINED") {
        return `【注文番号：${orderNo}】\nデータが解析できませんでした（${errorReason || 'PDF互換でないAIの可能性'}）。\nお手数ですが、PDF（「Illustratorの編集機能を保持」等）にて書き出しの上、再度ご入稿をお願いいたします。`;
    }

    if (judgement === "OK") {
        return `【注文番号：${orderNo}】\nデータを確認しました。\nフォントのアウトライン化、カラーモード（CMYK）、および画質・線幅等に問題はありません。\nこのまま進行可能です。`;
    }

    // NG logic
    const errors: string[] = [];
    const warnings: string[] = [];

    if (fontOutlineOk === false) {
        errors.push("フォントがアウトライン化されていません。すべてのアウトライン化をお願いします。");
    }
    if (cmykOk === false) {
        errors.push("RGBで作成されている部分があります。印刷用にCMYKカラーへ変換してください。");
    }
    if (resolutionOk === false) {
        warnings.push("画像の解像度が低いため（300dpi未満）、粗く印刷される箇所があります。");
    }
    if (lineWidthOk === false) {
        warnings.push("0.3pt未満の細い線が使われているため、かすれる、または消えてしまう恐れがあります。");
    }

    if (errors.length === 0 && warnings.length === 0) {
        errors.push("仕様外のデータが含まれています。再確認をお願いします。");
    }

    let message = `【注文番号：${orderNo}】\nデータを確認したところ、以下の修正・または注意が必要です。\n\n`;

    if (errors.length > 0) {
        message += `[必須の修正]\n${errors.map(e => `・${e}`).join("\n")}\n\n`;
    }

    if (warnings.length > 0) {
        message += `[品質に関するご注意]\n${warnings.map(e => `・${e}`).join("\n")}\n\n`;
    }

    message += `上記をご留意・修正の上、再入稿をお願いいたします。`;

    return message;
}
