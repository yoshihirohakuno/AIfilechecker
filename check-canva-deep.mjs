import fs from 'fs';
import { PDFDocument, PDFName, PDFDict, PDFStream } from 'pdf-lib';

async function checkPdfLibDeep() {
    const arrayBuffer = fs.readFileSync('canva-rgb.pdf').buffer;
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const context = pdfDoc.context;

    let hasRGB = false;

    const objects = context.enumerateIndirectObjects();
    for (const [ref, obj] of objects) {
        if (obj instanceof PDFStream || obj instanceof PDFDict) {
            const dict = obj instanceof PDFStream ? obj.dict : obj;

            // Look for any ColorSpace definition
            const colorSpace = dict.get(PDFName.of('ColorSpace'));
            if (colorSpace) {
                let csName = '';
                if (colorSpace instanceof PDFName) {
                    csName = colorSpace.decodeText();
                } else if (colorSpace.constructor.name === 'PDFArray') {
                    const arr = colorSpace;
                    if (arr.size() > 0) {
                        const first = arr.get(0);
                        if (first instanceof PDFName) {
                            csName = first.decodeText();
                        }
                    }
                }

                if (csName.includes('RGB')) {
                    hasRGB = true;
                    console.log(`Found direct RGB ColorSpace: ${csName} on ref ${ref}`);
                } else if (csName === 'ICCBased' && colorSpace.constructor.name === 'PDFArray') {
                    // Check the ICC profile stream
                    const profileStreamRef = colorSpace.get(1);
                    console.log(`Found ICCBased profile on ref ${ref}, pointing to ${profileStreamRef}`);
                    // Fetch stream
                    try {
                        const profileStream = context.lookup(profileStreamRef);
                        if (profileStream instanceof PDFStream) {
                            const n = profileStream.dict.get(PDFName.of('N'));
                            if (n === 3) {
                                console.log(`ICC Profile has N=3 (RGB) on ref ${ref}`);
                                hasRGB = true;
                            }
                        }
                    } catch (e) {
                        console.error("Error parsing ICC stream", e);
                    }
                }
            }

            // Also check for ExtGState blending color spaces
            if (dict.get(PDFName.of('Type')) === PDFName.of('ExtGState')) {
                const cs = dict.get(PDFName.of('CS')); // Blending color space
                const bm = dict.get(PDFName.of('BM')); // Blend mode
                if (cs instanceof PDFName && cs.decodeText().includes('RGB')) {
                    console.log(`Found RGB ExtGState Blending ColorSpace on ref ${ref}`);
                    hasRGB = true;
                }
            }
        }
    }
}

checkPdfLibDeep().catch(console.error);
