# 스토어 스크린샷 생성 도구

실제 사람인/잡코리아/원티드 로그인 세션 없이, 팝업 UI에 목업 데이터를 주입해
크롬 웹스토어용 스크린샷을 만든다. 결과물은 `docs/store-screenshots/`.

## 사용법

이 도구는 puppeteer(약 300MB, 번들 Chromium 포함)가 필요하지만 익스텐션
빌드/테스트엔 쓰이지 않는 일회성 콘텐츠 제작 도구라 프로젝트
`package.json`의 devDependency로는 넣지 않았다. 실행 전 임시로 설치한다.

```bash
npm run build                                # dist/ 최신화
npm install --no-save puppeteer              # 이 저장소 루트에서, 임시 설치
node scripts/store-screenshots/capture.js    # 팝업 원본 캡처 → docs/store-screenshots/raw/
node scripts/store-screenshots/compose.js    # 1280x800 마케팅 이미지 합성 → docs/store-screenshots/
```

`capture.js`는 `dist/`를 로드한 헤드리스 크롬을 띄우고, 팝업 페이지 자체가
익스텐션 컨텍스트라는 점을 이용해 `chrome.storage.local`에 그럴듯한 목업
지원 내역을 직접 넣은 뒤 두 상태(수집 전/수집 후)를 캡처한다.

`compose.js`는 그 원본들을 브랜드 컬러(인디고 `#4F46E5`) 배경 + 브라우저
창 프레임 + 카피 문구를 얹어 스토어 권장 해상도로 합성한다. 문구나 슬라이드
구성만 바꾸고 싶으면 `compose.js`의 `SLIDES` 배열만 수정해서 다시 실행하면
된다(원본 재캡처 불필요).

## 실제 UI가 바뀌었을 때

팝업 UI(레이아웃, 문구, 색)가 바뀌면 `capture.js`부터 다시 돌려서 원본을
갱신해야 실제 화면과 스크린샷이 어긋나지 않는다.
