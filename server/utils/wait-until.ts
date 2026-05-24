export function cfWaitUntil(promise: Promise<unknown>): void {
  let event
  try {
    event = useEvent()
  }
  catch {
    return
  }

  const cf = (event.context as any).cloudflare
  const waitUntil: ((p: Promise<unknown>) => void) | undefined
    = cf?.context?.waitUntil?.bind(cf.context)
    ?? cf?.executionContext?.waitUntil?.bind(cf.executionContext)

  if (waitUntil) {
    waitUntil(promise)
  }
}
