import { describe, expect, it } from "vitest"

import {
  createProjectShareDraft,
  createShareToken,
  createShareUrl,
  isShareAccess,
  summarizeProjectShareRecord,
} from "./sharing"

describe("project sharing helpers", () => {
  it("creates URL-safe share tokens from generated ids", () => {
    expect(createShareToken(() => "share id:/with symbols")).toBe("shareidwithsymbols")
    expect(createShareToken(() => "")).toHaveLength(24)
  })

  it("recognizes supported access levels", () => {
    expect(isShareAccess("view")).toBe(true)
    expect(isShareAccess("comment")).toBe(true)
    expect(isShareAccess("edit")).toBe(true)
    expect(isShareAccess("owner")).toBe(false)
  })

  it("builds stable share URLs without double slashes", () => {
    expect(createShareUrl("https://vacan.app/", "abc123")).toBe("https://vacan.app/share/abc123")
  })

  it("creates share drafts with normalized access and token", () => {
    expect(
      createProjectShareDraft({
        projectId: "project-1",
        access: "comment",
        createToken: () => "token-1",
      }),
    ).toEqual({
      projectId: "project-1",
      access: "comment",
      token: "token1",
    })
  })

  it("summarizes persisted shares with active state and URL", () => {
    expect(
      summarizeProjectShareRecord(
        {
          _id: "share-1",
          projectId: "project-1",
          access: "edit",
          token: "token-1",
          createdAt: 100,
          revokedAt: 200,
        },
        "https://vacan.app",
      ),
    ).toEqual({
      id: "share-1",
      projectId: "project-1",
      access: "edit",
      token: "token-1",
      url: "https://vacan.app/share/token-1",
      createdAt: 100,
      revokedAt: 200,
      isActive: false,
    })
  })
})
