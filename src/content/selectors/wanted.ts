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

// 페이지네이션. 원티드는 fetch한 HTML에 목록이 서버 렌더링돼 있지 않아(React SPA, 검증됨)
// 사람인/잡코리아처럼 URL만 바꿔 fetch로 순회하는 방식이 안 통한다. 내부 JSON API도
// 로그인 세션 인증(Authorization)이 필요해 시도했으나 401로 막힘 — 그 토큰을 코드로
// 읽는 건 "로그인 정보 미수집" 원칙에 어긋나 포기했다. 대신 화면의 실제 "다음 페이지"
// 버튼을 클릭하고 DOM 갱신을 기다리는 방식을 쓴다 — src/content/wanted.ts 참고.
export const WANTED_PAGINATION_SELECTORS = {
  // 다음 페이지 버튼. 마지막 페이지에서는 disabled 속성 + aria-disabled="true"가 붙는다.
  nextButton: '[data-role="pagination-next-button"]',
  // 이전 페이지 버튼. 1페이지에서는 disabled 속성 + aria-disabled="true"가 붙는다. 유저가
  // 1페이지가 아닌 곳에서 수집을 시작했을 때 1페이지로 먼저 되돌아가는 데 쓴다.
  prevButton: '[data-role="pagination-prev-button"]',
  // 현재 활성 페이지 번호 버튼. aria-current="page"이고 안의 <span> 텍스트가 "1", "2" 등 숫자.
  activePage: '[data-role="pagination-item-page"][aria-current="page"]',
} as const;
