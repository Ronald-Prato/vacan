export const SHARE_ACCESS_OPTIONS = [
  { value: "view", label: "Puede ver" },
  { value: "comment", label: "Puede comentar" },
  { value: "edit", label: "Puede editar" },
] as const

export type ShareAccess = (typeof SHARE_ACCESS_OPTIONS)[number]["value"]

export type ProjectShareDraft = {
  projectId: string
  access: ShareAccess
  token: string
}

export type ProjectShareRecord = {
  _id: string
  projectId: string
  access: ShareAccess
  token: string
  createdAt: number
  revokedAt?: number
}

export type SavedProjectShare = {
  id: string
  projectId: string
  access: ShareAccess
  token: string
  url: string
  createdAt: number
  revokedAt?: number
  isActive: boolean
}

export function isShareAccess(value: string): value is ShareAccess {
  return SHARE_ACCESS_OPTIONS.some((option) => option.value === value)
}

export function createShareToken(createId: () => string = fallbackShareId): string {
  const token = createId().replace(/[^a-zA-Z0-9]/g, "")

  if (token.length > 0) {
    return token.slice(0, 48)
  }

  return fallbackShareId().replace(/[^a-zA-Z0-9]/g, "").slice(0, 24)
}

export function createShareUrl(origin: string, token: string): string {
  return `${origin.replace(/\/+$/, "")}/share/${token}`
}

export function createProjectShareDraft({
  projectId,
  access,
  createToken = fallbackShareId,
}: {
  projectId: string
  access: string
  createToken?: () => string
}): ProjectShareDraft {
  return {
    projectId,
    access: isShareAccess(access) ? access : "view",
    token: createShareToken(createToken),
  }
}

export function summarizeProjectShareRecord(record: ProjectShareRecord, origin: string): SavedProjectShare {
  return {
    id: record._id,
    projectId: record.projectId,
    access: record.access,
    token: record.token,
    url: createShareUrl(origin, record.token),
    createdAt: record.createdAt,
    revokedAt: record.revokedAt,
    isActive: record.revokedAt === undefined,
  }
}

function fallbackShareId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now()}${Math.random().toString(36).slice(2)}`
}
