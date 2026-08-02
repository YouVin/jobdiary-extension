console.log('[JobDiary] background 서비스워커 로드됨');
import { EXTERNAL_COLLECT_MESSAGE_TYPE, type ExternalCollectRequest, type ExternalCollectResponse } from '../lib/messages';
import { getAllApplications } from '../lib/storage';

// manifest.config.ts의 externally_connectable.matches와 반드시 같은 origin 목록을 유지한다.
// externally_connectable이 1차로 걸러주지만(등록 안 된 origin은 애초에 메시지를 못 보냄),
// 핸들러 안에서도 재확인한다 — 다층 방어.
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://jobdiary.vercel.app',
];

// 웹앱의 pull 요청(JOBDIARY_COLLECT)에 응답한다. 새로 수집하지 않고, 기존 수집 로직(E-4)이
// chrome.storage.local에 이미 저장해 둔 3사이트 누적 데이터를 그대로 반환한다.
chrome.runtime.onMessageExternal.addListener((message: ExternalCollectRequest, sender, sendResponse) => {
  if (!sender.origin || !ALLOWED_ORIGINS.includes(sender.origin)) return;
  if (message?.type !== EXTERNAL_COLLECT_MESSAGE_TYPE) return;

  getAllApplications()
    .then((applications) => {
      const response: ExternalCollectResponse = { ok: true, applications };
      sendResponse(response);
    })
    .catch((error: unknown) => {
      const response: ExternalCollectResponse = {
        ok: false,
        error: error instanceof Error ? error.message : 'unknown error',
      };
      sendResponse(response);
    });

  return true; // storage 읽기가 비동기이므로 응답 채널을 열어둔다 (MV3 규약)
});
