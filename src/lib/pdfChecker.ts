export interface PolicyCheckResult {
    isPdfCompatible: boolean;
    fontOutlineOk?: boolean;
    cmykOk?: boolean;
    resolutionOk?: boolean;
    lineWidthOk?: boolean;
    error?: string;
    pageCount?: number;
}

export async function checkPdfPolicy(file: File): Promise<PolicyCheckResult> {
    try {
        const pdfjsLib = await import('pdfjs-dist');

        if (typeof window !== "undefined" && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
                'pdfjs-dist/build/pdf.worker.min.mjs',
                import.meta.url
            ).toString();
        }

        let arrayBuffer = await file.arrayBuffer();
        const headerView = new Uint8Array(arrayBuffer, 0, Math.min(arrayBuffer.byteLength, 1024 * 1024));
        let pdfStartIndex = -1;

        for (let i = 0; i < headerView.length - 4; i++) {
            if (headerView[i] === 0x25 && headerView[i + 1] === 0x50 && headerView[i + 2] === 0x44 && headerView[i + 3] === 0x46 && headerView[i + 4] === 0x2D) {
                pdfStartIndex = i;
                break;
            }
        }

        if (pdfStartIndex > 0) {
            arrayBuffer = arrayBuffer.slice(pdfStartIndex);
        } else if (pdfStartIndex === -1 && file.name.toLowerCase().endsWith(".ai")) {
            return { isPdfCompatible: false, error: "PDF互換ファイルとして保存されていません（%PDF- シグネチャが見つかりません）" };
        }

        const loadingTask = pdfjsLib.getDocument({
            data: new Uint8Array(arrayBuffer),
            standardFontDataUrl: `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/standard_fonts/`,
            disableFontFace: true,
            cMapUrl: `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/cmaps/`,
            cMapPacked: true,
        });
        const pdf = await loadingTask.promise;
        const numPages = pdf.numPages;

        let fontOutlineOk = true;
        let cmykOk = true;
        let resolutionOk = true;
        let lineWidthOk = true;

        // --- Structural CMYK Check (Raster Images) with pdf-lib ---
        try {
            const { PDFDocument, PDFStream, PDFName } = await import('pdf-lib');
            const pdfDoc = await PDFDocument.load(arrayBuffer);
            const context = pdfDoc.context;
            const objects = context.enumerateIndirectObjects();

            for (const [, obj] of objects) {
                if (obj instanceof PDFStream) {
                    const dict = obj.dict;
                    const subtype = dict.get(PDFName.of('Subtype'));
                    if (subtype === PDFName.of('Image')) {
                        const colorSpace = dict.get(PDFName.of('ColorSpace'));
                        let csName = 'unknown';

                        if (colorSpace instanceof PDFName) {
                            csName = colorSpace.decodeText();
                        } else if (colorSpace && colorSpace.constructor.name === 'PDFArray') {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const arr = colorSpace as any;
                            if (arr.size() > 0) {
                                const first = arr.get(0);
                                if (first instanceof PDFName) {
                                    csName = first.decodeText();
                                }
                            }
                        }

                        if (csName.includes('RGB')) {
                            cmykOk = false;
                        }
                    }
                }
            }
        } catch (err) {
            console.warn("Structural color space scanning failed:", err);
        }
        // -----------------------------------------------------------

        const RESOLUTION_THRESHOLD = 300; // dpi
        const LINE_WIDTH_THRESHOLD = 0.3; // pt

        for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);

            // Extract Operator List once per page
            const opList = await page.getOperatorList();
            const fnArray = opList.fnArray;
            const argsArray = opList.argsArray;
            const OPS = pdfjsLib.OPS || {};

            let currentMatrix = [1, 0, 0, 1, 0, 0];
            const matrixStack: number[][] = [];

            // A helper to multiply 3x3 transform matrices correctly
            const multiplyMatrix = (m1: number[], m2: number[]) => {
                return [
                    m1[0] * m2[0] + m1[1] * m2[2],
                    m1[0] * m2[1] + m1[1] * m2[3],
                    m1[2] * m2[0] + m1[3] * m2[2],
                    m1[2] * m2[1] + m1[3] * m2[3],
                    m1[4] * m2[0] + m1[5] * m2[2] + m2[4],
                    m1[4] * m2[1] + m1[5] * m2[3] + m2[5]
                ];
            };

            for (let j = 0; j < fnArray.length; j++) {
                const op = fnArray[j];
                const args = argsArray[j] || [];

                // Track transformation matrix state (q / Q)
                if (op === OPS.save) {
                    matrixStack.push([...currentMatrix]);
                } else if (op === OPS.restore) {
                    if (matrixStack.length > 0) {
                        currentMatrix = matrixStack.pop() as number[];
                    }
                } else if (op === OPS.transform) {
                    currentMatrix = multiplyMatrix(currentMatrix, args as number[]);
                }

                // 1. Font Outline Check -> check for text showing ops
                if (op === OPS.showText || op === OPS.showSpacedText || op === OPS.nextLineShowText || op === OPS.nextLineSetSpacingShowText) {
                    fontOutlineOk = false;
                }

                // 2. CMYK Color Check logic -> look for DeviceRGB
                if (op === OPS.setFillRGBColor || op === OPS.setStrokeRGBColor) {
                    cmykOk = false;
                }
                if (op === OPS.setFillColorSpace || op === OPS.setStrokeColorSpace) {
                    if (args && args[0] && args[0].name === 'DeviceRGB') {
                        cmykOk = false;
                    }
                }

                // 3. Line Width Check -> check `setLineWidth` (w)
                // Note: The actual rendered line width is affected by the current transformation matrix scale.
                if (op === OPS.setLineWidth) {
                    // Approximate scale factor by taking the max of x and y scaling
                    const scaleX = Math.sqrt(currentMatrix[0] * currentMatrix[0] + currentMatrix[1] * currentMatrix[1]);
                    const scaleY = Math.sqrt(currentMatrix[2] * currentMatrix[2] + currentMatrix[3] * currentMatrix[3]);
                    const maxScale = Math.max(scaleX, scaleY);

                    const declaredWidth = args[0] || 0;
                    const computedWidth = declaredWidth * maxScale;

                    if (computedWidth > 0 && computedWidth < LINE_WIDTH_THRESHOLD) {
                        lineWidthOk = false;
                    }
                }

                // 4. Image Resolution Check -> check `paintImageXObject`
                if (op === OPS.paintImageXObject) {
                    const imgName = args[0];
                    try {
                        const imgData = await page.objs.get(imgName);
                        if (imgData && imgData.width && imgData.height) {
                            // The image is drawn into the 1x1 unit square of the user coordinate system,
                            // which is then scaled by the current transformation matrix.
                            const scaleX = Math.sqrt(currentMatrix[0] * currentMatrix[0] + currentMatrix[1] * currentMatrix[1]);
                            const scaleY = Math.sqrt(currentMatrix[2] * currentMatrix[2] + currentMatrix[3] * currentMatrix[3]);

                            // physical size in inches = scale (pt) / 72
                            const actualWidthInches = scaleX / 72;
                            const actualHeightInches = scaleY / 72;

                            // dpi = px / inches
                            const dpiX = imgData.width / actualWidthInches;
                            const dpiY = imgData.height / actualHeightInches;

                            // If either dimension is stretched below the resolution threshold, flag it (ignore 0 division)
                            if ((actualWidthInches > 0 && dpiX < RESOLUTION_THRESHOLD) ||
                                (actualHeightInches > 0 && dpiY < RESOLUTION_THRESHOLD)) {
                                resolutionOk = false;
                            }
                        }
                    } catch (e) {
                        console.warn("Could not inspect image:", imgName, e);
                    }
                }
            }
        }

        return {
            isPdfCompatible: true,
            fontOutlineOk,
            cmykOk,
            resolutionOk,
            lineWidthOk,
            pageCount: numPages
        };

    } catch (error: unknown) {
        console.error("PDF Parsing error:", error);
        return {
            isPdfCompatible: false,
            error: "ファイルの解析に失敗しました。PDF互換性がないか、データが破損しています。"
        };
    }
}
