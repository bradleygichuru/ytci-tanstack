import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./auth";

export const userProfiles = pgTable("user_profiles", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  displayName: text("display_name"),
  ageRange: text("age_range"),
  county: text("county"),
  languages: text("languages"),
  preferences: text("preferences"),
  consentGrantedAt: timestamp("consent_granted_at"),
  createdBy: text("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => new Date())
    .notNull()
    .defaultNow(),
});

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    action: text("action").notNull(),
    details: text("details"),
    performedBy: text("performed_by").notNull().references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("audit_logs_userId_idx").on(table.userId)],
);

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, {
    fields: [userProfiles.userId],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
  performer: one(users, {
    fields: [auditLogs.performedBy],
    references: [users.id],
  }),
}));
