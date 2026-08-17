const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

// href를 절대 URL로 만들고 http/https 스킴만 허용한다. base를 넘기면 href가 상대경로여도 절대화한다.
// javascript:/data:/mailto: 등 위험하거나 무의미한 스킴, new URL() 파싱 실패는 모두 undefined로 막는다.
// 파서(사람인/잡코리아)의 href→url 절대화와 HTML 출력 경로(tsv.ts)의 href 검증에서 공통으로 쓴다.
export function toSafeUrl(href: string | undefined | null, base?: string): string | undefined {
  if (!href) return undefined;

  try {
    const url = base ? new URL(href, base) : new URL(href);
    if (!ALLOWED_PROTOCOLS.has(url.protocol)) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}
