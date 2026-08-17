export const SARAMIN_SELECTORS = {
  // 컨테이너 (지원 1건)
  container: '.row._apply_list',
  // 회사명 (row.dataset.company_nm)
  companyAttr: 'company_nm',
  // 공고명 (row.dataset.rec_division)
  positionAttr: 'rec_division',
  // 공고명 폴백: 점핏(Jumpit) 연동 공고는 rec_division이 빈 문자열로 오고 .division span도 없음.
  // 이 경우 row.dataset.recruittitle에 공고 제목이 대신 들어있어 이걸로 폴백한다.
  positionFallbackAttr: 'recruittitle',
  // 지원일 텍스트, 예: "2026.06.09 20:27"
  appliedAt: '.col_date',
  // 상태 텍스트, 예: "지원완료"
  status: '.txt_status',
  // 세부상태 텍스트, 예: "미열람". ★주의: 지원완료 행에선 "미열람"/"열람"이지만
  // 지원취소완료 행에선 취소일시("2026.07.12 19:33")가 들어온다. 파서에서
  // 텍스트가 정확히 '열람'/'미열람'일 때만 viewed로 쓰고, 아니면 undefined 처리한다.
  subStatus: '.txt_sub',
  // 고유ID (row.dataset.recruitapply_idx), 중복 방지용
  externalIdAttr: 'recruitapply_idx',
  // 공고 링크 (상대경로) — new URL(href, location.origin)로 절대화해서 쓴다
  url: '.recruit a',
} as const;
