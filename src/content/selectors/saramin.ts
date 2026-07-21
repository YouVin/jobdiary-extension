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
  // 세부상태 텍스트, 예: "미열람"
  subStatus: '.txt_sub',
  // 고유ID (row.dataset.recruitapply_idx), 중복 방지용
  externalIdAttr: 'recruitapply_idx',
} as const;
