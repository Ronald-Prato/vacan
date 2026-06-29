export const PRESENCE_COLORS = ["#00c4cc", "#8b5cf6", "#14b8a6", "#f59e0b", "#ef4444", "#3b82f6"] as const
export const PRESENCE_TTL_MS = 45_000

export type PresenceColor = (typeof PRESENCE_COLORS)[number]

export type PresenceDraft = {
  clientId: string
  displayName: string
  color: PresenceColor
  pageId: string | null
  selectedElementName: string | null
}

export type PresenceRecord = Omit<PresenceDraft, "color"> & {
  _id: string
  projectId: string
  color: string
  updatedAt: number
}

export type CollaboratorPresence = PresenceDraft & {
  id: string
  updatedAt: number
  isSelf: boolean
}

export function createPresenceClientId(createId: () => string = fallbackPresenceId): string {
  const clientId = createId().replace(/[^a-zA-Z0-9]/g, "")

  if (clientId.length > 0) {
    return clientId.slice(0, 48)
  }

  return fallbackPresenceId().replace(/[^a-zA-Z0-9]/g, "").slice(0, 24)
}

export function normalizePresenceColor(color: string): PresenceColor {
  return PRESENCE_COLORS.find((candidate) => candidate === color) ?? "#8b5cf6"
}

export function createPresenceDraft({
  clientId,
  displayName,
  color,
  pageId,
  selectedElementName,
}: {
  clientId: string
  displayName: string
  color: string
  pageId: string | null
  selectedElementName: string | null
}): PresenceDraft {
  return {
    clientId,
    displayName: displayName.trim() || "Colaborador",
    color: normalizePresenceColor(color),
    pageId,
    selectedElementName: selectedElementName?.trim() || null,
  }
}

export function listActiveCollaborators(
  records: PresenceRecord[],
  {
    now = Date.now(),
    currentClientId,
    ttlMs = PRESENCE_TTL_MS,
  }: {
    now?: number
    currentClientId: string
    ttlMs?: number
  },
): CollaboratorPresence[] {
  const activeSince = now - ttlMs

  return records
    .filter((record) => record.updatedAt >= activeSince)
    .sort((first, second) => second.updatedAt - first.updatedAt)
    .map((record) => ({
      id: record._id,
      clientId: record.clientId,
      displayName: record.displayName,
      color: normalizePresenceColor(record.color),
      pageId: record.pageId,
      selectedElementName: record.selectedElementName,
      updatedAt: record.updatedAt,
      isSelf: record.clientId === currentClientId,
    }))
}

function fallbackPresenceId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now()}${Math.random().toString(36).slice(2)}`
}
