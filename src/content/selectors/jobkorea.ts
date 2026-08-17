export const JOBKOREA_SELECTORS = {
  // 컨테이너: 테이블의 각 행 (tr)
  container: 'tbody tr',
  // 데이터 버튼: 각 행에서 data 속성을 담은 버튼 (devBtnDel 또는 devBtnCancel).
  // 이 버튼이 없는 행(빈 tr, 헤더 등)은 지원내역이 아니므로 스킵한다.
  dataButton: '[data-applydate]',
  // 회사명 (button.dataset.memname)
  companyAttr: 'memname',
  // 공고명 (button.dataset.gititle) - 마감표기 없이 깔끔
  positionAttr: 'gititle',
  // 지원일 (button.dataset.applydate) - "20260601235538" 형식, 변환 필요
  appliedAtAttr: 'applydate',
  // 고유ID (button.dataset.idx), 중복 방지용
  externalIdAttr: 'idx',
  // 상태 텍스트 (data 없음), 예: "지원완료", "지원취소"
  status: '.apply-status .item.status',
  // 오래된 지원(.devBtnOldDel 등)은 버튼에 memname/gititle/applydate가 없고 data-idx만 있다.
  // externalId는 최신 행과 동일하게 data-idx 기준으로 통일한다.
  oldDataButton: '[data-idx]',
  // 버튼 data가 없을 때(오래된 지원, 공고 삭제된 행 등) 본문 텍스트에서 읽는 폴백 소스.
  companyFallback: '.company a',
  positionFallback: '.description a',
  appliedAtFallback: '.apply-status .date',
  // 공고 링크 (상대경로) — new URL(href, location.origin)로 절대화해서 쓴다
  url: '.description a',
  // 열람 여부 텍스트("미열람"/"열람") — 클래스(read-not)가 아니라 텍스트로 판별한다
  viewed: '.reading',
} as const;
