import { useEffect, useMemo, useRef } from 'react'

type Debounced<Args extends unknown[]> = ((...args: Args) => void) & {
  // flush runs the pending call now, if there is one.
  flush: () => void
  // cancel drops the pending call.
  cancel: () => void
}

// useDebouncedCallback returns a function that runs fn `delay` ms after its
// last call, with the arguments of that last call. The latest fn always runs,
// so it can close over render state, and a call still pending on unmount is
// dropped.
export function useDebouncedCallback<Args extends unknown[]>(
  fn: (...args: Args) => void,
  delay: number,
): Debounced<Args> {
  const latest = useRef(fn)
  useEffect(() => {
    latest.current = fn
  })

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pending = useRef<Args | null>(null)

  const debounced = useMemo(() => {
    const cancel = () => {
      if (timer.current !== null) clearTimeout(timer.current)
      timer.current = null
      pending.current = null
    }
    const flush = () => {
      const args = pending.current
      cancel()
      if (args) latest.current(...args)
    }
    const call = (...args: Args) => {
      cancel()
      pending.current = args
      timer.current = setTimeout(flush, delay)
    }
    return Object.assign(call, { flush, cancel })
  }, [delay])

  useEffect(() => debounced.cancel, [debounced])

  return debounced
}
