export function useUmami() {
  function track(event: string, data?: Record<string, string | number>) {
    if (typeof window === 'undefined' || typeof window.umami === 'undefined') return
    if (data) {
      window.umami.track(event, data)
    }
    else {
      window.umami.track(event)
    }
  }

  function identify(id: string, data?: Record<string, string | number>) {
    if (typeof window === 'undefined' || typeof window.umami === 'undefined') return
    if (data) {
      window.umami.identify(id, data)
    }
    else {
      window.umami.identify(id)
    }
  }

  return { track, identify }
}
