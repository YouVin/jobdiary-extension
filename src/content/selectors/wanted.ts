export const WANTED_SELECTORS = {
  // 컨테이너 (지원 1건). 헤더는 <div class="table-header ...">라 li 태그만 지정하면 자동 제외됨
  container: 'li[class*="table_tr"]',
  // 회사명 텍스트, 예: "무론"
  // 원티드 class는 뒤에 해시(예: __u5tEF)가 붙고 빌드마다 바뀔 수 있어 부분매칭([class*=...])을 쓴다.
  // td_ 프리픽스까지 좁혀서 다른 영역의 동일 접미사 class(예: 헤더의 status)와 오매칭되지 않게 한다.
  company: '[class*="td_company_name"]',
  // 공고명 텍스트, 예: "프론트엔드 개발자" (해시 접미사 때문에 부분매칭)
  position: '[class*="td_position"]',
  // 지원일 텍스트, 예: "2026. 7. 11" (해시 접미사 때문에 부분매칭, 정규화 필요)
  appliedAt: '[class*="td_create_time"]',
  // 상태 텍스트, 예: "불합격", "진행중" (해시 접미사 때문에 부분매칭)
  status: '[class*="td_status"]',
  // 고유ID(externalId)는 원티드 DOM에 없음 — 파서에서 빈 값으로 처리
  // url/viewed도 원티드 DOM에 없음 — 파서에서 undefined 처리
} as const;
