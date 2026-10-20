import { afterEach, expect, it, vi } from 'vitest'
import { COLLECT_MESSAGE_TYPE } from '../lib/messages'

afterEach(() => {
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
  vi.useRealTimers()
  vi.resetModules()
})

it('원티드 첫 페이지 복귀 실패 시 기존 저장 내역을 덮어쓰지 않는다', async () => {
  vi.useFakeTimers()
  const set = vi.fn()
  const addListener = vi.fn()
  vi.stubGlobal('chrome', {
    runtime: { onMessage: { addListener } },
    storage: { local: { get: vi.fn(async () => ({})), set } },
  })
  document.body.innerHTML = `
    <button data-role="pagination-prev-button">이전</button>
    <button data-role="pagination-item-page" aria-current="page">2</button>
    <ul><li class="table_tr"><span class="td_company_name">기존 회사</span></li></ul>`
  await import('./wanted')
  const listener = addListener.mock.calls[0][0]
  const response = vi.fn()
  expect(listener({ type: COLLECT_MESSAGE_TYPE }, {}, response)).toBe(true)
  await vi.advanceTimersByTimeAsync(4500)
  expect(response).toHaveBeenCalledWith({ applications: [], count: 0, error: true })
  expect(set).not.toHaveBeenCalled()
})
