import { describe, expect, it } from "vitest";
import { hasPermission, type ResourceKey } from "#/lib/authz";
import { PERMISSION_ROLES, roleHasPermission } from "#/lib/contracts/roles";

const resource: ResourceKey = "competition";

describe("competition RBAC", () => {
  it("grants super administrators and administrators the full surface", () => {
    for (const role of ["super_admin", "administrator"]) {
      for (const action of ["read", "create", "edit", "delete", "publish"] as const) {
        expect(hasPermission(role, resource, [action])).toBe(true);
      }
    }
  });

  it("lets moderators read, edit and publish but not delete", () => {
    expect(hasPermission("moderator", resource, ["read", "edit", "publish"])).toBe(true);
    expect(hasPermission("moderator", resource, ["delete"])).toBe(false);
  });

  it("keeps county officers read only", () => {
    expect(hasPermission("county_officer", resource, ["read"])).toBe(true);
    expect(hasPermission("county_officer", resource, ["edit"])).toBe(false);
    expect(hasPermission("county_officer", resource, ["publish"])).toBe(false);
  });

  it("does not grant competition access to readers or content editors", () => {
    expect(hasPermission("user", resource, ["read"])).toBe(false);
    expect(hasPermission("content_editor", resource, ["read"])).toBe(false);
  });

  it("models judging as a per-object permission, not a role", () => {
    expect(PERMISSION_ROLES["competition.score"]).toEqual([
      "user",
      "administrator",
      "super_admin",
    ]);
    expect(roleHasPermission("moderator", "competition.score")).toBe(false);
  });
});
