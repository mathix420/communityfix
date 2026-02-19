interface UmamiTracker {
  track: {
    (eventName: string): void
    (eventName: string, eventData: Record<string, string | number>): void
  }
}

declare const umami: UmamiTracker
