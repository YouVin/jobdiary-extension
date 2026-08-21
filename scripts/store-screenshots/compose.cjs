// capture.js가 뽑은 팝업 원본 스크린샷을 스토어 권장 해상도(1280x800)의 마케팅 스타일
// 이미지로 합성한다. 사용법은 이 폴더의 README.md 참고.
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const RAW_DIR = path.resolve(__dirname, '..', '..', 'docs', 'store-screenshots', 'raw');
const OUT_DIR = path.resolve(__dirname, '..', '..', 'docs', 'store-screenshots');

function toDataUri(filePath) {
  const buf = fs.readFileSync(filePath);
  return `data:image/png;base64,${buf.toString('base64')}`;
}

const SLIDES = [
  {
    file: 'popup-collected.png',
    out: '1-overview.png',
    eyebrow: '취준일기 익스텐션',
    headline: '지원현황, 여기저기 흩어져서<br/>놓치고 있지 않나요?',
    sub: '사람인 · 잡코리아 · 원티드 지원 내역을 버튼 한 번으로 한 곳에 모아요',
  },
  {
    file: 'popup-collected.png',
    out: '2-copy.png',
    eyebrow: '전체 복사',
    headline: '엑셀, 노션, 구글시트에<br/>바로 붙여넣기',
    sub: '모은 지원 내역을 표 형태로 클립보드에 복사해 원하는 곳에 정리해요',
  },
  {
    file: 'popup-empty.png',
    out: '3-start.png',
    eyebrow: '시작은 간단하게',
    headline: '지원현황 페이지에서<br/>버튼 한 번이면 끝',
    sub: '로그인 정보는 수집하지 않아요 — 화면에 보이는 내용만 읽어요',
  },
];

function buildHtml(slide, imgDataUri) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 1280px; height: 800px; overflow: hidden; }
  body {
    font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', -apple-system, sans-serif;
    background: linear-gradient(135deg, #EEF2FF 0%, #FAFAFA 55%, #FFFFFF 100%);
    display: flex;
    align-items: center;
    padding: 0 90px;
  }
  .left { flex: 1; padding-right: 40px; }
  .eyebrow {
    display: inline-block;
    font-size: 20px;
    font-weight: 700;
    color: #4F46E5;
    background: #E0E7FF;
    padding: 8px 20px;
    border-radius: 999px;
    margin-bottom: 28px;
  }
  .headline {
    font-size: 52px;
    font-weight: 800;
    color: #18181B;
    line-height: 1.35;
    letter-spacing: -0.5px;
    margin-bottom: 24px;
  }
  .sub {
    font-size: 24px;
    color: #52525B;
    line-height: 1.6;
    max-width: 520px;
  }
  .right {
    position: relative;
    width: 480px;
    display: flex;
    justify-content: center;
  }
  .frame {
    background: #FFFFFF;
    border-radius: 20px;
    box-shadow: 0 30px 70px -20px rgba(79,70,229,0.35), 0 10px 25px -10px rgba(0,0,0,0.15);
    overflow: hidden;
    border: 1px solid #E4E4F5;
  }
  .titlebar {
    height: 34px;
    background: #F4F4F5;
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 0 14px;
    border-bottom: 1px solid #E4E4E7;
  }
  .dot { width: 11px; height: 11px; border-radius: 50%; }
  .frame img { display: block; width: 360px; }
</style></head>
<body>
  <div class="left">
    <span class="eyebrow">${slide.eyebrow}</span>
    <div class="headline">${slide.headline}</div>
    <div class="sub">${slide.sub}</div>
  </div>
  <div class="right">
    <div class="frame">
      <div class="titlebar">
        <div class="dot" style="background:#FF5F57"></div>
        <div class="dot" style="background:#FEBC2E"></div>
        <div class="dot" style="background:#28C840"></div>
      </div>
      <img src="${imgDataUri}" />
    </div>
  </div>
</body></html>`;
}

async function main() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  // deviceScaleFactor: 1이어야 실제 PNG 픽셀 크기가 뷰포트(1280x800)와 정확히 일치한다.
  // 2를 쓰면 스크린샷 파일이 2560x1600으로 저장돼 스토어가 요구하는 정확한 해상도와
  // 어긋난다.
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });

  for (const slide of SLIDES) {
    const rawFile = path.join(RAW_DIR, slide.file);
    if (!fs.existsSync(rawFile)) {
      throw new Error(`원본 스크린샷이 없다 — 먼저 capture.js 실행: ${rawFile}`);
    }
    const imgDataUri = toDataUri(rawFile);
    const html = buildHtml(slide, imgDataUri);
    const tmpHtml = path.join(__dirname, `_tmp_${slide.out}.html`);
    fs.writeFileSync(tmpHtml, html, 'utf-8');
    await page.goto(`file:///${tmpHtml.replace(/\\/g, '/')}`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 200));
    await page.screenshot({ path: path.join(OUT_DIR, slide.out), clip: { x: 0, y: 0, width: 1280, height: 800 } });
    fs.unlinkSync(tmpHtml);
    console.log('composed:', slide.out);
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
