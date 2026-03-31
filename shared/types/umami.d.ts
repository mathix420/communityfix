interface UmamiTracker {
  track: {
    (eventName: string): void
    (eventName: string, eventData: Record<string, string | number>): void
  }
  identify: {
    (uniqueId: string): void
    (uniqueId: string, data: Record<string, string | number>): void
  }
}

declare const umami: UmamiTracker

interface Window {
  umami?: UmamiTracker
}
