# YTCI Explorer Admin — Domain Glossary

## Context

Single-context repo. This admin dashboard manages users, content, and configuration for the YTCI Explorer platform via a BFF/proxy to a Go backend. Currently running against a typed mock layer honoring the same contract.

Upstream sources: `docs/spec/ytci-extract.md` (spec extract), `docs/rbac/taxonomy.md` (roles), `docs/api/admin-go-contract.yaml` (API contract).

## Terms

### Destination
A tourist attraction or location in Kenya. Core identity: name, slug, county, locality, category, status. 8 field groups: Identity, Location, Overview, Experience, Planning, Media, Related, Governance. Statuses: `draft`, `published`, `archived`.

### Course
A learning program in the LMS. Contains lessons and quiz questions. Issues certificates on completion. Statuses: `draft`, `published`. Do not use "Learning Module" or "Learning Program".

### Lesson
A component of a Course. Types: `video`, `text`, `pdf`. Has duration, URL, optional transcript and captions.

### Quiz Question
A question within a Course. Has text, multiple options, and a correct answer index.

### Conservation Activity
A moderated conservation initiative (beach cleanup, tree planting, wildlife survey). Has organizer, location privacy level, dates, impact metrics, evidence submissions. Statuses: `active`. Do not use "Initiative" or "Project".

### Evidence Item
A user-submitted proof of participation in a Conservation Activity. Approved or rejected by admins.

### Event
A scheduled public event. Has type, county, venue, dates, status workflow. Statuses: `scheduled`, `postponed`, `cancelled`.

### Campaign
A promotional campaign. Types: `home_banner`, `featured_destination`, `push_notification`, `seasonal`. Statuses: `draft`, `active`, `paused`, `ended`.

### Media Asset
An uploaded file (image, video, PDF, 360 media, audio). Stored in Cloudflare R2 with optimization metadata. Rights status tracked.

### Story
User-generated content (photo, video, journal) created by youth creators. Goes through moderation.

### User
Platform user. Roles: `super_admin`, `administrator`, `moderator`, `county_officer`. Has consent records and ban state.

### Push Notification
A notification delivered to Expo mobile app users via Expo Push Service. Composed from a Campaign of type `push_notification`. The admin dashboard stores the payload; the Go backend handles delivery.
