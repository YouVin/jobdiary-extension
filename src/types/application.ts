export type Platform = 'saramin' | 'wanted' | 'jobkorea';

export interface ScrapedApplication {
  company: string; // 회사명
  position: string; // 공고명
  platform: Platform; // 플랫폼
  appliedAt: string; // 지원일 (원문)
  status: string; // 상태 (원문)
  externalId?: string; // 사이트 고유 ID (중복 방지)
}

// 웹앱과 공유하는 계약. 최종 진실은 웹앱 레포 docs/INTEGRATION.md (docs/INTEGRATION.md 참고).
export type Status =
  | 'applied'
  | 'screening'
  | 'interview'
  | 'interviewed'
  | 'offer'
  | 'rejected'
  | 'canceled';

export interface Application {
  id: string;
  company: string;
  position: string;
  platform: Platform;
  status: Status;
  appliedAt: string; // 자정 기준 ISO
  updatedAt: string; // ISO
  externalId?: string; // 원티드는 없음
}
