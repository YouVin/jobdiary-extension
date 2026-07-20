// text/plain(엑셀·구글시트용)과 text/html(노션·워드 등 표 인식용)을 동시에 담는다.
// ClipboardItem/navigator.clipboard.write 미지원 환경이거나 쓰기가 실패하면
// text/plain만 넣는 navigator.clipboard.writeText로 폴백한다.
export async function copyRichText(text: string, html: string): Promise<void> {
  const supportsRichWrite = typeof ClipboardItem !== 'undefined' && typeof navigator.clipboard?.write === 'function';

  if (supportsRichWrite) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/plain': new Blob([text], { type: 'text/plain' }),
          'text/html': new Blob([html], { type: 'text/html' }),
        }),
      ]);
      return;
    }
    catch {
      // 아래 text/plain 전용 폴백으로 넘어간다.
    }
  }

  await navigator.clipboard.writeText(text);
}
