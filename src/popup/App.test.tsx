import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { STORAGE_KEY } from '@/lib/storage'

const { copyRichText } = vi.hoisted(() => ({ copyRichText: vi.fn() }))
vi.mock('@/lib/clipboard', () => ({ copyRichText }))

type ChangeListener = Parameters<typeof chrome.storage.onChanged.addListener>[0]
let listeners: Set<ChangeListener>
let container: HTMLDivElement
let root: Root
let stored: Record<string, unknown>
let get: ReturnType<typeof vi.fn>
let remove: ReturnType<typeof vi.fn>
let sendMessage: ReturnType<typeof vi.fn>
let createTab: ReturnType<typeof vi.fn>

const application = {
  company: '테스트 회사', position: '개발자', platform: 'wanted',
  appliedAt: '2026-07-11T00:00:00.000Z', status: 'applied',
}
const slots = (count: number) => ({
  [STORAGE_KEY]: { saramin: [], jobkorea: [], wanted: Array.from({ length: count }, () => application) },
})

async function emit(area: 'local' | 'sync' | 'session' | 'managed' = 'local', key = STORAGE_KEY) {
  await act(async () => {
    listeners.forEach(listener => listener({ [key]: { newValue: stored[key] } }, area))
  })
}
function button(label: string) {
  const result = [...container.querySelectorAll('button')].find(el => el.textContent === label)
  if (!result) throw new Error(`버튼 없음: ${label}`)
  return result
}
async function click(label: string) {
  await act(async () => button(label).click())
}
async function render() {
  await act(async () => root.render(<App />))
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  listeners = new Set()
  stored = slots(2)
  get = vi.fn(async () => stored)
  remove = vi.fn(async () => { stored = {} })
  sendMessage = vi.fn(async () => ({ count: 2, applications: [], truncated: false }))
  createTab = vi.fn(async () => ({}))
  vi.stubGlobal('chrome', {
    tabs: {
      query: vi.fn(async () => [{ id: 1, url: 'https://www.wanted.co.kr/status/applications/applied' }]),
      sendMessage, create: createTab,
    },
    storage: {
      local: { get, remove },
      onChanged: {
        addListener: (listener: ChangeListener) => listeners.add(listener),
        removeListener: (listener: ChangeListener) => listeners.delete(listener),
      },
    },
  })
  copyRichText.mockReset().mockResolvedValue(undefined)
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('팝업 저장 현황과 기존 기능', () => {
  it('조회 전에는 0건 대신 로딩을 표시하고 복사를 비활성화한다', async () => {
    let resolve!: (value: Record<string, unknown>) => void
    get.mockImplementationOnce(() => new Promise(r => { resolve = r }))
    await render()
    expect(container.textContent).toContain('저장 내역 불러오는 중')
    expect(container.textContent).not.toContain('전체 0건')
    expect(button('전체 복사').disabled).toBe(true)
    await act(async () => resolve(slots(3)))
    expect(container.textContent).toContain('전체 3건')
    expect(button('전체 복사').disabled).toBe(false)
  })

  it('조회 실패를 안내하고 다시 불러올 수 있다', async () => {
    get.mockRejectedValueOnce(new Error('storage unavailable'))
    await render()
    expect(container.textContent).toContain('저장 내역을 불러오지 못했어요')
    expect(button('전체 복사').disabled).toBe(true)
    await click('다시 불러오기')
    expect(container.textContent).toContain('전체 2건')
  })

  it('관련 local 변경만 반영하고 구독을 해제한다', async () => {
    await render()
    const initialCalls = get.mock.calls.length
    await emit('sync')
    await emit('local', 'unrelated')
    expect(get).toHaveBeenCalledTimes(initialCalls)
    stored = slots(5)
    await emit()
    expect(container.textContent).toContain('전체 5건')
    stored = {}
    await emit()
    expect(container.textContent).toContain('전체 0건')
    await act(async () => root.unmount())
    expect(listeners.size).toBe(0)
    root = createRoot(container)
  })

  it('늦게 도착한 초기 조회가 최신 변경을 덮어쓰지 않는다', async () => {
    let resolve!: (value: Record<string, unknown>) => void
    get.mockImplementationOnce(() => new Promise(r => { resolve = r }))
    await render()
    stored = slots(4)
    await emit()
    await act(async () => resolve(slots(1)))
    expect(container.textContent).toContain('전체 4건')
  })

  it('초기화 실패 시 데이터와 재시도 가능 상태를 유지한다', async () => {
    remove.mockRejectedValueOnce(new Error('remove failed'))
    await render()
    await click('초기화')
    expect(remove).not.toHaveBeenCalled()
    await click('정말요? 다시 누르면 전체 삭제')
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('초기화하지 못했어요')
    expect(container.textContent).toContain('전체 2건')
    await click('초기화')
    await click('정말요? 다시 누르면 전체 삭제')
    expect(container.textContent).toContain('전체 0건')
    expect(button('전체 복사').disabled).toBe(true)
  })

  it('복사는 표 데이터를 전달하고 저장된 내역을 삭제하지 않는다', async () => {
    await render()
    await click('전체 복사')
    expect(copyRichText).toHaveBeenCalledWith(expect.stringContaining('테스트 회사'), expect.stringContaining('<table'))
    expect(remove).not.toHaveBeenCalled()
    expect(container.textContent).toContain('전체 2건')
    expect(container.querySelector('.sr-only[role="status"]')?.textContent).toBe('복사됐어요')
  })

  it('수집 성공과 일부 수집 경고를 상태 영역에 표시한다', async () => {
    sendMessage.mockResolvedValueOnce({ count: 2, applications: [], truncated: true })
    await render()
    await click('지원내역 수집하기')
    const status = [...container.querySelectorAll('[role="status"]')].map(el => el.textContent).join('')
    expect(status).toContain('2건 수집됨')
    expect(status).toContain('일부 페이지를 불러오지 못했을 수 있어요')
    expect(sendMessage).toHaveBeenCalledTimes(1)
  })

  it('수집 중에는 중복 수집과 초기화를 막는다', async () => {
    let resolve!: (value: unknown) => void
    sendMessage.mockImplementationOnce(() => new Promise(r => { resolve = r }))
    await render()
    await click('지원내역 수집하기')
    expect(button('수집 중...').disabled).toBe(true)
    expect(button('초기화').disabled).toBe(true)
    await act(async () => resolve({ count: 2, applications: [] }))
    expect(button('지원내역 수집하기').disabled).toBe(false)
  })

  it('웹앱 가져오기 주소를 유지한다', async () => {
    await render()
    await click('취준일기 열기')
    expect(createTab).toHaveBeenCalledWith({ url: 'http://localhost:3000/?import=1' })
  })

  it('확인 타이머는 팝업이 닫히면 정리한다', async () => {
    vi.useFakeTimers()
    await render()
    await click('초기화')
    expect(vi.getTimerCount()).toBe(1)
    await act(async () => root.unmount())
    expect(vi.getTimerCount()).toBe(0)
    root = createRoot(container)
  })
})
