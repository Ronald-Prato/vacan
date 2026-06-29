export type HistoryState<T> = {
  past: T[]
  present: T
  future: T[]
}

export type HistoryOptions<T> = {
  limit?: number
  fingerprint?: (value: T) => string
}

const DEFAULT_HISTORY_LIMIT = 80

export function createHistoryState<T>(initialState: T): HistoryState<T> {
  return {
    past: [],
    present: initialState,
    future: [],
  }
}

export function pushHistory<T>(
  history: HistoryState<T>,
  nextState: T,
  options: HistoryOptions<T> = {},
): HistoryState<T> {
  const fingerprint = options.fingerprint ?? defaultFingerprint

  if (fingerprint(history.present) === fingerprint(nextState)) {
    return history
  }

  return {
    past: [...history.past, history.present].slice(-(options.limit ?? DEFAULT_HISTORY_LIMIT)),
    present: nextState,
    future: [],
  }
}

export function undoHistory<T>(history: HistoryState<T>): HistoryState<T> {
  const previous = history.past.at(-1)

  if (!previous) {
    return history
  }

  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  }
}

export function redoHistory<T>(history: HistoryState<T>): HistoryState<T> {
  const next = history.future[0]

  if (!next) {
    return history
  }

  return {
    past: [...history.past, history.present],
    present: next,
    future: history.future.slice(1),
  }
}

export function replaceHistoryPresent<T>(_history: HistoryState<T>, nextState: T): HistoryState<T> {
  return createHistoryState(nextState)
}

function defaultFingerprint<T>(value: T): string {
  return JSON.stringify(value)
}
