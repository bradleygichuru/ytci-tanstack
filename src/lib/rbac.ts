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
  audioStories: ["read", "create", "edit", "submit", "review", "publish", "unpublish", "archive", "revoke", "manage-rights", "restore", "hard-delete-draft", "assign-reviewer", "override-separation"],
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
    audioStories: ["read", "create", "edit", "submit", "review", "publish", "unpublish", "archive", "revoke", "manage-rights", "restore", "hard-delete-draft", "assign-reviewer", "override-separation"],
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
    audioStories: ["read", "create", "edit", "submit", "review", "publish", "unpublish", "manage-rights", "assign-reviewer"],
  }),
  moderator: ac.newRole({
    analytics: ["read"],
    media: ["read", "edit", "delete", "publish"],
    comments: ["read", "delete"],
    audioStories: ["read"],
  }),
  content_editor: ac.newRole({
    audioStories: ["read", "create", "edit", "submit"],
  }),
  county_officer: ac.newRole({
    destinations: ["read", "create", "edit"],
    media: ["read", "create"],
  }),
  user: ac.newRole({}),
}
