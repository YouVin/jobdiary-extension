// 스토어 스크린샷용 팝업 UI 캡처. 실제 사이트 로그인 세션 없이도, chrome.storage.local에
// 그럴듯한 목업 지원 내역을 직접 주입한 뒤 팝업(익스텐션 페이지)을 헤드리스 크롬으로 열어
// 캡처한다. 사용법은 이 폴더의 README.md 참고.
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const DIST_PATH = path.resolve(__dirname, '..', '..', 'dist');
const OUT_DIR = path.resolve(__dirname, '..', '..', 'docs', 'store-screenshots', 'raw');

const STORAGE_KEY = 'jobdiary:collected';
const POPUP_WIDTH = 360; // App.tsx 루트의 w-90 (Tailwind v4 spacing 스케일: 90 * 4px = 360px)

const MOCK_DATA = {
  saramin: [
    { company: '(주)플레이웍스', position: '프론트엔드 개발자', platform: 'saramin', status: 'applied', appliedAt: '2026-08-10T00:00:00.000Z', viewed: true, appliedAtExact: '2026-08-10T02:30:00.000Z', externalId: '1001', url: 'https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=1001' },
    { company: '(주)테크노베이션', position: '백엔드 개발자 (Node.js)', platform: 'saramin', status: 'rejected', appliedAt: '2026-08-05T00:00:00.000Z', viewed: true, externalId: '1002' },
    { company: '데이터브릿지', position: '데이터 엔지니어', platform: 'saramin', status: 'canceled', appliedAt: '2026-07-28T00:00:00.000Z', viewed: false, externalId: '1003' },
  ],
  jobkorea: [
    { company: '(주)클라우드나인', position: 'iOS 개발자', platform: 'jobkorea', status: 'applied', appliedAt: '2026-08-12T00:00:00.000Z', viewed: false, externalId: '2001' },
    { company: '넥스트페이먼츠', position: '프로덕트 매니저', platform: 'jobkorea', status: 'applied', appliedAt: '2026-08-09T00:00:00.000Z', viewed: true, externalId: '2002' },
  ],
  wanted: [
    { company: '무론', position: '프론트엔드 개발자', platform: 'wanted', status: 'applied', appliedAt: '2026-08-11T00:00:00.000Z' },
    { company: '스퀘어랩', position: 'UI/UX 디자이너', platform: 'wanted', status: 'rejected', appliedAt: '2026-08-03T00:00:00.000Z' },
    { company: '그린테이블', position: '백엔드 개발자', platform: 'wanted', status: 'applied', appliedAt: '2026-08-07T00:00:00.000Z' },
  ],
};

async function captureTight(page, filePath) {
  await page.setViewport({ width: POPUP_WIDTH, height: 700, deviceScaleFactor: 3 });
  await new Promise(r => setTimeout(r, 200));
  const height = await page.evaluate(() => Math.ceil(document.body.firstElementChild.getBoundingClientRect().height));
  await page.setViewport({ width: POPUP_WIDTH, height, deviceScaleFactor: 3 });
  await new Promise(r => setTimeout(r, 200));
  await page.screenshot({ path: filePath, clip: { x: 0, y: 0, width: POPUP_WIDTH, height } });
}

async function main() {
  if (!fs.existsSync(DIST_PATH)) {
    throw new Error(`dist/ 가 없다 — 먼저 npm run build 실행: ${DIST_PATH}`);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      `--disable-extensions-except=${DIST_PATH}`,
      `--load-extension=${DIST_PATH}`,
      '--no-sandbox',
    ],
  });

  // MV3 서비스워커 타겟이 뜰 때까지 기다렸다가 익스텐션 ID를 뽑는다.
  let extensionId = null;
  for (let i = 0; i < 20 && !extensionId; i++) {
    const targets = await browser.targets();
    const swTarget = targets.find(t => t.url().startsWith('chrome-extension://') && t.type() === 'service_worker');
    if (swTarget) {
      extensionId = new URL(swTarget.url()).host;
    } else {
      await new Promise(r => setTimeout(r, 300));
    }
  }
  if (!extensionId) throw new Error('익스텐션 서비스워커를 못 찾음 — extension ID 추출 실패');
  console.log('extensionId:', extensionId);

  const popupUrl = `chrome-extension://${extensionId}/src/popup/index.html`;
  const page = await browser.newPage();

  // 1) 빈 상태(수집 전) — 익스텐션을 처음 쓰는 유저가 보는 화면
  await page.goto(popupUrl, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 300));
  await captureTight(page, path.join(OUT_DIR, 'popup-empty.png'));

  // 2) 목업 데이터 주입 — 팝업 페이지 자체가 익스텐션 컨텍스트라 chrome.storage 접근 가능
  await page.evaluate((key, data) => chrome.storage.local.set({ [key]: data }), STORAGE_KEY, MOCK_DATA);
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 300));
  await captureTight(page, path.join(OUT_DIR, 'popup-collected.png'));

  await browser.close();
  console.log('done —', OUT_DIR);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
