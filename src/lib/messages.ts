import type { Application } from '@/types/application';

// 팝업 ↔ content script 메시지 프로토콜. 문자열 오타를 막기 위해 상수/타입을 여기 한 곳에서만 정의하고
// 양쪽(popup, 각 사이트 content script)이 이 파일을 import해서 쓴다.
export const COLLECT_MESSAGE_TYPE = 'COLLECT' as const;

export interface CollectMessage {
  type: typeof COLLECT_MESSAGE_TYPE;
}

export interface CollectResponse {
  applications: Array<Omit<Application, 'id' | 'updatedAt'>>;
  count: number;
}

// 웹앱 → 익스텐션 pull 요청 프로토콜 (chrome.runtime.onMessageExternal, INTEGRATION.md §6).
// 팝업/content script용 COLLECT_MESSAGE_TYPE과는 별개 채널 — 웹앱 쪽 문자열과 반드시 일치해야 한다.
export const EXTERNAL_COLLECT_MESSAGE_TYPE = 'JOBDIARY_COLLECT' as const;

export interface ExternalCollectRequest {
  type: typeof EXTERNAL_COLLECT_MESSAGE_TYPE;
}

// 웹앱의 sanitizeCollectResponse가 기대하는 형태: { ok, applications?, error? }.
export interface ExternalCollectResponse {
  ok: boolean;
  applications?: Array<Omit<Application, 'id' | 'updatedAt'>>;
  error?: string;
}
