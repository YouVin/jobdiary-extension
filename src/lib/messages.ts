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
