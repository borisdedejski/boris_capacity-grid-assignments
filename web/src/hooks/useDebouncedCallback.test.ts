import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDebouncedCallback } from './useDebouncedCallback'

describe('useDebouncedCallback', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('runs once, with the last arguments, after the delay', () => {
    const fn = vi.fn()
    const { result } = renderHook(() => useDebouncedCallback(fn, 300))

    act(() => {
      result.current('a')
      result.current('ab')
      result.current('abc')
    })
    vi.advanceTimersByTime(299)
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(fn).toHaveBeenCalledExactlyOnceWith('abc')
  })

  it('flush runs the pending call now, cancel drops it', () => {
    const fn = vi.fn()
    const { result } = renderHook(() => useDebouncedCallback(fn, 300))

    act(() => {
      result.current('a')
      result.current.flush()
    })
    expect(fn).toHaveBeenCalledExactlyOnceWith('a')

    act(() => {
      result.current('b')
      result.current.cancel()
    })
    vi.advanceTimersByTime(300)
    expect(fn).toHaveBeenCalledTimes(1)

    // Nothing pending, so flush is a no-op.
    act(() => result.current.flush())
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('drops a pending call on unmount', () => {
    const fn = vi.fn()
    const { result, unmount } = renderHook(() => useDebouncedCallback(fn, 300))

    act(() => result.current('a'))
    unmount()
    vi.advanceTimersByTime(300)
    expect(fn).not.toHaveBeenCalled()
  })

  it('runs the fn from the latest render', () => {
    const first = vi.fn()
    const second = vi.fn()
    const { result, rerender } = renderHook(({ fn }) => useDebouncedCallback(fn, 300), {
      initialProps: { fn: first },
    })

    act(() => result.current('a'))
    rerender({ fn: second })
    vi.advanceTimersByTime(300)
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledExactlyOnceWith('a')
  })
})
