import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const arrayBuffer = fs.readFileSync('test-rgb2.pdf').buffer;

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

    // We can look at page.objs
    console.log('page.objs keys:', Object.keys(page.objs.objs));

    // Actually, we can access the page's resources dictionary directly if we use internal API
    // but let's try page._pageInfo or page.commonObjs
    const resources = page.objs; // this is a PDFObjects instance

    // Let's dump all XObjects from the page dictionary
    const pageDict = page._pageInfo;
    console.log('Page Dict properties:', Object.keys(pageDict));
} catch (e) { console.error(e) }
