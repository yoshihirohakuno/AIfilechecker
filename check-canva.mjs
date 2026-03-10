import fs from 'fs';
import { PDFDocument, PDFName, PDFDict, PDFStream } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

async function checkColors() {
    console.log("=== PDF-LIB STRUCTURAL CHECK ===");
    const arrayBuffer = fs.readFileSync('canva-rgb.pdf').buffer;
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const context = pdfDoc.context;

    let hasRGB = false;
    const objects = context.enumerateIndirectObjects();
    for (const [ref, obj] of objects) {
        if (obj instanceof PDFStream) {
            const dict = obj.dict;
            const subtype = dict.get(PDFName.of('Subtype'));
            if (subtype === PDFName.of('Image')) {
                const colorSpace = dict.get(PDFName.of('ColorSpace'));
                let csName = 'unknown';

                if (colorSpace instanceof PDFName) {
                    csName = colorSpace.decodeText();
                } else if (colorSpace && colorSpace.constructor.name === 'PDFArray') {
                    const arr = colorSpace;
                    if (arr.size() > 0) {
                        const first = arr.get(0);
                        if (first instanceof PDFName) {
                            csName = first.decodeText() + ' (Array)';
                        }
                        // if ICCBased, we can dig deeper but usually means RGB from Canva
                        if (csName.includes('ICCBased')) {
                            csName += " [ICC Profile detected]";
                        }
                    }
                }

                console.log(`Image Ref: ${ref.toString()}, ColorSpace: ${csName}`);
                if (csName.includes('RGB') || csName.includes('ICC')) {
                    hasRGB = true;
                }
            }
        } else if (obj instanceof PDFDict) {
            const type = obj.get(PDFName.of('Type'));
            if (type === PDFName.of('ExtGState')) {
                // Check for blending color spaces etc which might be RGB
            }
        }
    }
    console.log('PDF-Lib Result: hasRGB =', hasRGB);

    console.log("\n=== PDFJS OPERATOR CHECK ===");
    try {
        const loadingTask = pdfjsLib.getDocument({
            data: new Uint8Array(arrayBuffer),
            standardFontDataUrl: `./node_modules/pdfjs-dist/standard_fonts/`,
            disableFontFace: true,
        });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        const opList = await page.getOperatorList();

        const fnArray = opList.fnArray;
        const argsArray = opList.argsArray;
        const OPS = pdfjsLib.OPS || {};

        const opsNameMap = {};
        for (const [name, val] of Object.entries(OPS)) {
            opsNameMap[val] = name;
        }

        let pdfjsHasRGB = false;
        for (let j = 0; j < fnArray.length; j++) {
            const op = fnArray[j];
            const args = argsArray[j] || [];
            const opName = opsNameMap[op];

            if (opName && opName.toLowerCase().includes('rgb')) {
                console.log(`Found RGB Operator: ${opName}`, args);
                pdfjsHasRGB = true;
            }
            if (opName === 'setFillColorSpace' || opName === 'setStrokeColorSpace') {
                console.log(`ColorSpace set: ${args[0]?.name || args[0]}`);
                if (args[0]?.name?.includes('RGB') || (typeof args[0] === 'string' && args[0].includes('RGB'))) {
                    pdfjsHasRGB = true;
                }
            }
        }
        console.log('PDFJS Result: hasRGB =', pdfjsHasRGB);
    } catch (e) {
        console.error(e);
    }
}

checkColors().catch(console.error);
