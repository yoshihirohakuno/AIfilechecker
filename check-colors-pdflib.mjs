import fs from 'fs';
import { PDFDocument, PDFName, PDFDict, PDFStream } from 'pdf-lib';

async function checkPdfLib() {
    const arrayBuffer = fs.readFileSync('test-rgb2.pdf').buffer;
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const pages = pdfDoc.getPages();

    let hasRGB = false;

    // We can iterate the entire document's objects or just the pages' xobjects
    const context = pdfDoc.context;

    // Check all objects in the PDF for images or ColorSpace definitions
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
                    // It can be an array like [/ICCBased <stream>]
                    const arr = colorSpace;
                    if (arr.size() > 0) {
                        const first = arr.get(0);
                        if (first instanceof PDFName) {
                            csName = first.decodeText() + ' (Array)';
                        }
                    }
                }

                console.log(`Found Image - Ref: ${ref.toString()}, ColorSpace: ${csName}`);
                if (csName.includes('RGB')) {
                    hasRGB = true;
                }
            }
        }
    }

    console.log('Final Result (pdf-lib): hasRGB =', hasRGB);
}

checkPdfLib().catch(console.error);
