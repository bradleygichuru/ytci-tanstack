import { createAccessControl } from "better-auth/plugins/access";

export const ac = createAccessControl({
  analytics: ["read", "create", "edit", "delete", "publish"],
  destinations: ["read", "create", "edit", "delete", "publish"],
  media: ["read", "create", "edit", "delete", "publish"],
  lms: ["read", "create", "edit", "delete", "publish"],
  conservation: ["read", "create", "edit", "delete", "publish"],
  events: ["read", "create", "edit", "delete", "publish"],
  aiConfig: ["read", "create", "edit", "delete", "publish"],
  campaigns: ["read", "create", "edit", "delete", "publish"],
  user: ["read", "create", "edit", "delete", "publish", "assign-role", "suspend-user", "update", "set-role", "ban", "get", "list"],
});

export const roles = {
  super_admin: ac.newRole({
    analytics: ["read", "create", "edit", "delete", "publish"],
    destinations: ["read", "create", "edit", "delete", "publish"],
    media: ["read", "create", "edit", "delete", "publish"],
    lms: ["read", "create", "edit", "delete", "publish"],
    conservation: ["read", "create", "edit", "delete", "publish"],
    events: ["read", "create", "edit", "delete", "publish"],
    aiConfig: ["read", "create", "edit", "delete", "publish"],
    campaigns: ["read", "create", "edit", "delete", "publish"],
    user: ["read", "create", "edit", "delete", "publish", "assign-role", "suspend-user", "update", "set-role", "ban", "get", "list"],
  }),
  administrator: ac.newRole({
    analytics: ["read", "create", "edit", "delete", "publish"],
    destinations: ["read", "create", "edit", "delete", "publish"],
    media: ["read", "create", "edit", "delete", "publish"],
    lms: ["read", "create", "edit", "delete", "publish"],
    conservation: ["read", "create", "edit", "delete", "publish"],
    events: ["read", "create", "edit", "delete", "publish"],
    aiConfig: ["read", "create", "edit", "delete", "publish"],
    campaigns: ["read", "create", "edit", "delete", "publish"],
     user: ["read", "create", "edit", "delete", "publish", "update", "get", "list"],
  }),
  moderator: ac.newRole({
    analytics: ["read"],
    media: ["read", "edit", "delete", "publish"],
  }),
  county_officer: ac.newRole({
    destinations: ["read", "create", "edit"],
    media: ["read", "create"],
  }),
}
