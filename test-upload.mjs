import { chromium } from 'playwright';
import path from 'path';

async function testUpload() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    page.on('console', msg => {
        console.log(`BROWSER CONSOLE: ${msg.text()}`);
    });
    page.on('pageerror', err => {
        console.log(`BROWSER ERROR: ${err.message}`);
    });

    console.log("Navigating...");
    await page.goto('https://yoshihirohakuno.github.io/AIfilechecker/');

    console.log("Filling Order Number...");
    await page.fill('input#orderNo', 'TEST-1234');

    const fileInput = await page.locator('input[type="file"]');

    console.log("Setting input files...");
    await fileInput.setInputFiles(path.resolve('canva-rgb.pdf'));

    console.log("Waiting for processing to complete...");
    await page.waitForTimeout(5000); // Wait for the check to process

    const text = await page.evaluate(() => document.body.innerText);
    console.log("PAGE TEXT DUMP:\n", text);

    await page.screenshot({ path: 'upload_test.png', fullPage: true });
    console.log("Screenshot saved.");

    await browser.close();
}

testUpload().catch(console.error);
