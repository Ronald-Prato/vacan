import { describe, expect, it } from "vitest"

import {
  createPresenceClientId,
  createPresenceDraft,
  listActiveCollaborators,
  normalizePresenceColor,
} from "./presence"

describe("presence helpers", () => {
  it("creates URL-safe client ids", () => {
    expect(createPresenceClientId(() => "client:/one")).toBe("clientone")
    expect(createPresenceClientId(() => "")).toHaveLength(24)
  })

  it("normalizes presence colors to a known palette", () => {
    expect(normalizePresenceColor("#00c4cc")).toBe("#00c4cc")
    expect(normalizePresenceColor("#not-real")).toBe("#8b5cf6")
  })

  it("creates bounded heartbeat drafts", () => {
    expect(
      createPresenceDraft({
        clientId: "client-1",
        displayName: "  Ana  ",
        color: "#14b8a6",
        pageId: "page-1",
        selectedElementName: "  Logo  ",
      }),
    ).toEqual({
      clientId: "client-1",
      displayName: "Ana",
      color: "#14b8a6",
      pageId: "page-1",
      selectedElementName: "Logo",
    })
  })

  it("lists only active collaborators and marks the current client", () => {
    const records = [
      {
        _id: "presence-1",
        projectId: "project-1",
        clientId: "self",
        displayName: "Me",
        color: "#00c4cc",
        pageId: "page-1",
        selectedElementName: null,
        updatedAt: 1000,
      },
      {
        _id: "presence-2",
        projectId: "project-1",
        clientId: "other",
        displayName: "Other",
        color: "#f59e0b",
        pageId: null,
        selectedElementName: "Titulo",
        updatedAt: 900,
      },
      {
        _id: "presence-3",
        projectId: "project-1",
        clientId: "stale",
        displayName: "Stale",
        color: "#8b5cf6",
        pageId: null,
        selectedElementName: null,
        updatedAt: 100,
      },
    ]

    expect(listActiveCollaborators(records, { now: 1000, currentClientId: "self", ttlMs: 200 })).toEqual([
      {
        id: "presence-1",
        clientId: "self",
        displayName: "Me",
        color: "#00c4cc",
        pageId: "page-1",
        selectedElementName: null,
        updatedAt: 1000,
        isSelf: true,
      },
      {
        id: "presence-2",
        clientId: "other",
        displayName: "Other",
        color: "#f59e0b",
        pageId: null,
        selectedElementName: "Titulo",
        updatedAt: 900,
        isSelf: false,
      },
    ])
  })
})
