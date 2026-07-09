export type Platform = 'saramin' | 'wanted' | 'jobkorea';

export interface ScrapedApplication {
  company: string; // 회사명
  position: string; // 공고명
  platform: Platform; // 플랫폼
  appliedAt: string; // 지원일 (원문)
  status: string; // 상태 (원문)
  externalId?: string; // 사이트 고유 ID (중복 방지)
}
