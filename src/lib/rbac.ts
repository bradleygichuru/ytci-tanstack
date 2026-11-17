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
  challenges: ["read", "create", "edit", "delete", "publish"],
  comments: ["read", "create", "edit", "delete", "publish"],
  thenNow: [
    "read", "create", "edit", "submit", "review", "publish", "unpublish",
    "archive", "revoke", "manage_rights", "assign_reviewer",
    "override_separation", "manage_recognition", "hard_delete_draft",
  ],
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
    challenges: ["read", "create", "edit", "delete", "publish"],
    comments: ["read", "create", "edit", "delete", "publish"],
    thenNow: [
      "read", "create", "edit", "submit", "review", "publish", "unpublish",
      "archive", "revoke", "manage_rights", "assign_reviewer",
      "override_separation", "manage_recognition", "hard_delete_draft",
    ],
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
    challenges: ["read", "create", "edit", "delete", "publish"],
    comments: ["read", "create", "edit", "delete", "publish"],
    thenNow: [
      "read", "create", "edit", "submit", "review", "publish", "unpublish",
      "manage_rights", "assign_reviewer", "hard_delete_draft",
    ],
  }),
  content_editor: ac.newRole({
    thenNow: ["read", "create", "edit", "submit"],
  }),
  moderator: ac.newRole({
    analytics: ["read"],
    media: ["read", "edit", "delete", "publish"],
    comments: ["read", "delete"],
    thenNow: ["read"],
  }),
  county_officer: ac.newRole({
    destinations: ["read", "create", "edit"],
    media: ["read", "create"],
  }),
  user: ac.newRole({}),
}
