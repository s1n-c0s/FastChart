import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  await page.goto('http://localhost:5174/');
  
  // Wait for load
  await new Promise(r => setTimeout(r, 2000));
  
  // Click the Radial switch
  const radialSwitch = await page.$('button[role="switch"]#radial-switch'); // Need to find the actual selector
  // Let's just evaluate
  await page.evaluate(() => {
    // find the span or button containing 'Radial' text and click its toggle
    const labels = Array.from(document.querySelectorAll('label'));
    const radialLabel = labels.find(l => l.textContent.includes('Radial'));
    if (radialLabel) {
       radialLabel.nextElementSibling?.click();
    }
  });
  
  await new Promise(r => setTimeout(r, 1000));
  
  await browser.close();
})();
