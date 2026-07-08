# 🔗 웹앱 연동 (Integration)

익스텐션이 수집한 데이터를 취준일기 웹앱으로 전달하는 방식.

---

## 1단계: localStorage 공유 방식 (MVP)

웹앱이 아직 localStorage 기반이므로, 익스텐션도 이에 맞춘다.

### 방식 A: 웹앱 페이지에 직접 주입 (권장)
```
1. 익스텐션이 수집 → chrome.storage.local에 임시 저장
2. popup에서 "취준일기 열기" 클릭 → 웹앱 탭 열림/포커스
3. 익스텐션이 웹앱 페이지(jobdiary.vercel.app)에도 content script 주입
4. 그 content script가 chrome.storage의 수집 데이터를 읽어
   웹앱의 localStorage('jobdiary:applications')에 병합
5. 웹앱이 새로고침/감지해서 칸반에 반영
```

### 방식 B: postMessage 통신
```
1. 익스텐션 content script가 웹앱 페이지에 window.postMessage로 데이터 전송
2. 웹앱이 message 이벤트 리스너로 받아서 스토어에 추가
```

> MVP는 방식 A가 단순. 웹앱에 익스텐션 수신용 로직만 추가하면 됨.

### 웹앱 측 수신 로직 (추가 필요)
```typescript
// 웹앱: 익스텐션이 넣은 데이터를 병합
// externalId로 중복 체크 후 applicationStore에 추가
function mergeFromExtension(scraped: ScrapedApplication[]) {
  const existing = getApplications();
  const existingIds = new Set(existing.map(a => a.externalId));

  for (const item of scraped) {
    if (item.externalId && existingIds.has(item.externalId)) continue; // 중복 스킵
    addApplication(convertToApplication(item));
  }
}
```

---

## 2단계: 서버 연동 방식 (로그인 후)

Supabase 도입 후.

```
1. 웹앱 로그인 → 토큰 발급
2. 익스텐션이 웹앱과 토큰 공유 (또는 별도 로그인)
3. 수집 데이터를 웹앱 API로 직접 POST
4. DB 저장 → 여러 기기 동기화
```

---

## 데이터 변환 (ScrapedApplication → Application)

익스텐션이 수집한 raw 데이터를 웹앱 Application 타입으로 변환.

```typescript
function convertToApplication(scraped: ScrapedApplication): Application {
  return {
    id: crypto.randomUUID(),
    company: scraped.company,
    position: scraped.position,
    platform: scraped.platform,       // 'saramin' | 'wanted' | 'jobkorea'
    status: mapStatus(scraped.status), // 원문 → Status
    appliedAt: normalizeDate(scraped.appliedAt), // → ISO
    updatedAt: new Date().toISOString(),
    externalId: scraped.externalId,   // 중복 방지용 (Application에 필드 추가 필요)
  };
}
```

> ⚠️ 웹앱 Application 타입에 `externalId?: string` 필드 추가 필요 (중복 방지용).

---

## 중복 방지 전략

- 각 사이트 고유 ID를 `externalId`로 저장
- 재수집 시 이미 있는 externalId는 스킵
- 사람인: `recruitapply_idx`, 잡코리아: `data-idx`, 원티드: (URL이나 조합키)

---

## 연동 개발 순서

```
1. 익스텐션: 사람인 수집 → chrome.storage 저장까지
2. 웹앱: Application 타입에 externalId 추가
3. 웹앱: 익스텐션 수신 로직(mergeFromExtension) 추가
4. 익스텐션: 웹앱으로 전달 (방식 A)
5. 실제 연동 테스트 (사람인 → 웹앱 칸반 반영 확인)
6. 잡코리아, 원티드 확장
```