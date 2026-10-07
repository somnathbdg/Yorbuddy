import os from 'node:os';
import path from 'node:path';
import puppeteer from 'puppeteer';

const IMAGE_DIR = path.resolve(
  process.env.FACEBOOK_IMAGE_DIR || path.join(os.tmpdir(), 'facebook-images')
);
const IMAGE_WIDTH = 1200;
const IMAGE_HEIGHT = 630;

async function ensureDir(): Promise<void> {
  const fs = await import('fs/promises');
  try {
    await fs.mkdir(IMAGE_DIR, { recursive: true });
  } catch (err: any) {
    if (err.code !== 'EEXIST') throw err;
  }
}

export async function generatePostImage(content: {
  topic: string;
  category: string;
  caption: string;
  cta: string;
}): Promise<string> {
  await ensureDir();

  const today = new Date().toISOString().split('T')[0];
  const filename = `facebook-${content.category}-${today}.png`;
  const filepath = path.join(IMAGE_DIR, filename);

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  width: ${IMAGE_WIDTH}px;
  height: ${IMAGE_HEIGHT}px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: linear-gradient(135deg, #FF6B35 0%, #FF8C42 50%, #FFA630 100%);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 60px;
  position: relative;
  overflow: hidden;
}
body.category-social_connection { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
body.category-trust_safety { background: linear-gradient(135deg, #2E8B57 0%, #3CB371 100%); }
body.category-weekend_vibe { background: linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%); }
body.category-user_benefit { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 24px;
  padding: 48px;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}
.header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
.logo {
  width: 48px; height: 48px;
  background: linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%);
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 24px; font-weight: 800; color: white;
}
.brand-name { font-size: 18px; font-weight: 700; color: #1a1a2e; }
.topic { font-size: 36px; font-weight: 800; color: #1a1a2e; line-height: 1.2; margin-bottom: 16px; }
.caption { font-size: 20px; color: #4a4a6a; line-height: 1.5; margin-bottom: 32px; flex-grow: 1; }
.cta {
  background: linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%);
  color: white; padding: 16px 32px; border-radius: 12px;
  font-size: 20px; font-weight: 700; text-align: center;
  width: fit-content; margin: 0 auto;
}
.cta.category-social_connection { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.cta.category-trust_safety { background: linear-gradient(135deg, #2E8B57 0%, #3CB371 100%); }
.cta.category-weekend_vibe { background: linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%); }
.cta.category-user_benefit { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.footer { margin-top: 24px; text-align: center; font-size: 14px; color: #888; }
</style>
</head>
<body class="category-${content.category}">
<div class="card">
<div class="header">
<div class="logo">Y</div>
<div class="brand-name">YorBuddy</div>
</div>
<div class="topic">${content.topic.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
<div class="caption">${content.caption.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
<div class="cta category-${content.category}">${content.cta.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
<div class="footer">yorbuddy.in</div>
</div>
</body>
</html>`;

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: IMAGE_WIDTH, height: IMAGE_HEIGHT, deviceScaleFactor: 2 });

    await page.setContent(html);
    await new Promise(resolve => setTimeout(resolve, 500));

    await page.screenshot({ path: filepath, type: 'png', fullPage: false });

    return filepath;
  } catch (err: any) {
    throw new Error(`Image generation failed: ${err.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

export function getImageDir(): string {
  return IMAGE_DIR;
}
