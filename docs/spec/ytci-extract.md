# YTCI Explorer — Spec Extract

This document is a **factual extraction** from the YTCI Explorer Developer Prototype and Functional Specification, structured for downstream tickets on the YTCI admin-dashboard wayfinder map ([#1](https://github.com/bradleygichuru/ytci-tanstack/issues/1)). It contains no recommendations — only what the spec says, cited by section number.

- **Spec source**: `~/Downloads/YTCI_Explorer_Developer_Prototype_Specification.pdf` (not model-ingestible). Text was pasted into the charting session; this file is the canonical structured reference.
- **Extraction ticket**: [#2 — Spec ingestion](https://github.com/bradleygichuru/ytci-tanstack/issues/2).
- **Out of scope for this extract**: §12 analytics event dictionary (raw indicator list only — belongs to area build T12), §13 testing/acceptance criteria (constrains Expo/Go repos), §14 developer handover checklist (constrains deployment, not decisions on this map).

A copy-paste artifact was observed in the source text — the email `Handel125@gmail.com` is embedded mid-word inside §13 ("interruHandel125@gmail.comce", "maintenanHandel125@gmail.comce"). It is treated as a paste error and excluded from the extract.

---

## 1. Data model

### Destination record (spec §9.1)

| Field group | Fields |
|---|---|
| Identity | Destination ID, name, slug, county, locality, category, status |
| Location | Latitude, longitude, map label, access route, distance reference |
| Overview | Short description, full description, significance, history |
| Experience | Things to do, suitable audiences, duration, difficulty, seasonality |
| Planning | Indicative fees, opening information, transport notes, accessibility, facilities, safety notes |
| Media | Hero image, gallery, videos, 360 media, captions and credits |
| Related content | Nearby attractions, events, stories, courses, conservation activities |
| Governance | Source, content owner, verification status, last updated, review date |

### User (spec §9.2)

Core fields: Profile, preferences, permissions, saved items, progress, consent.

Registration data (spec §2.1):
- Full name or preferred display name
- Age range and county of residence
- Email address and/or mobile number
- Preferred language
- Travel interests and preferred destination categories
- Accessibility preferences (optional)
- Consent for terms, privacy and content rules

### Itinerary (spec §9.2)

Core fields: Inputs, stops, day plan, estimated cost, source version, saved/exported status.

Spec §5.7 augments: route order, day-by-day activities, PDF/image export, saved trips, version timestamps, no reservation status field (§5.17).

### Story (spec §9.2)

Core fields: Creator, destination, caption, media, tags, moderation, engagement.

Spec §5.11 + §5.16 augment: photo/short video/written journal cards; like/save/share/follow/creator page/destination tag/report; creator consent and credits; drafts before upload.

### Challenge (spec §9.2)

Core fields: Rules, eligibility, progress measure, evidence, badge and dates.

Spec §5.9 augments: start/end dates, eligibility rules, join, view requirements, submit completion evidence, claim badge, no cash prizes in MVP unless separately approved.

### Course (spec §9.2)

Core fields: Title, modules, lessons, resources, assessment, progress, certificate.

Spec §5.13 augments: video/PDF/text lessons, completion and quiz results, learning badge or certificate, resume from last position, course content managed in CMS.

### Event (spec §9.2)

Core fields: Title, organizer, county, venue, dates, type, status, contacts, media.

Spec §5.14 augments: month/list browse, county/type filter, save event, event detail, add to device calendar, reminder when allowed. Status must support scheduled, postponed, cancelled. No ticket checkout in app.

### Conservation activity (spec §9.2)

Core fields: Organizer, location privacy level, dates, participation, impact measure.

Spec §5.15 augments: browse activities, join activity, log participation, upload evidence, view impact, validate or moderate submission, update personal and aggregate metrics, award badge. Do not display sensitive wildlife locations. Use approved measurement units and verification rules.

---

## 2. Admin areas

Each of the spec's nine admin functions (§10.2) is mapped to the wayfinder map's area-build tickets (T12–T20, issues #13–#21). The spec lists dashboard metrics separately in §10.1; they belong to the Analytics area.

### §10.1 Dashboard (mapped to T12 — Analytics & Metrics Dashboard, [#13](https://github.com/bradleygichuru/ytci-tanstack/issues/13))

Dashboard surfaces:

- Daily, weekly and monthly active users
- New registrations and user locations by county (aggregated)
- Top searched destinations and categories
- AI itineraries generated, saved, exported and shared
- Map interactions and destination detail views
- Stories submitted, approved and reported
- Course enrollments and completions
- Challenge and conservation participation
- Content awaiting review or scheduled for update
- System alerts and failed integrations

### §10.2 Administration functions — area-by-area mapping

The spec lists nine areas. Map produces **ten** build tickets because §10.2 area 6 ("Events and conservation") is split per the charting-session decision into separate Events and Conservation tickets (T16, T17). The Reports function in §10.2 folds into T12 as an export tab per charting-session decision.

| Spec §10.2 area | Capabilities (verbatim from spec) | Map ticket |
|---|---|---|
| Destination CMS | Create, edit, verify, schedule, archive and bulk import destination records | T13 — Destination CMS [#14](https://github.com/bradleygichuru/ytci-tanstack/issues/14) |
| Media library | Upload, tag, crop, caption, credit, replace and archive images/videos | T14 — Media Library & UGC Moderation Queue [#15](https://github.com/bradleygichuru/ytci-tanstack/issues/15) (media-library part) |
| Story moderation | Approve, reject, edit metadata, age-restrict, remove and handle reports | T14 — Media Library & UGC Moderation Queue [#15](https://github.com/bradleygichuru/ytci-tanstack/issues/15) (moderation part) |
| AI content control | Manage prompts, approved sources, disclaimers, blocked topics and answer feedback | T18 — AI Engine Configuration & Guardrails [#19](https://github.com/bradleygichuru/ytci-tanstack/issues/19) |
| Learning CMS | Create courses, lessons, quizzes, certificates and reports | T15 — Learning Hub (LMS) & Course Builder [#16](https://github.com/bradleygichuru/ytci-tanstack/issues/16) |
| Events and conservation | Publish entries, manage status, reminders, evidence and impact | Split — T16 Conservation [#17](https://github.com/bradleygichuru/ytci-tanstack/issues/17) + T17 Events [#18](https://github.com/bradleygichuru/ytci-tanstack/issues/18) (per charting-session decision; spec text carved by §5.14/§5.15 modules) |
| Campaigns | Home banners, featured destinations, push notifications and seasonal campaigns | T19 — Campaigns [#20](https://github.com/bradleygichuru/ytci-tanstack/issues/20) |
| Users and roles | Role assignment, suspension, consent records, data export/deletion requests | T20 — User Management & Security [#21](https://github.com/bradleygichuru/ytci-tanstack/issues/21) |
| Reports | Export CSV/PDF summaries for YTCI, counties and development partners | Folded into T12 as export tab per charting-session decision [#13](https://github.com/bradleygichuru/ytci-tanstack/issues/13) |

---

## 3. Media rules (spec §7.1–7.4)

### §7.1 Supported media types

The platform is media-rich: administrators and approved contributors attach multiple images and videos to destinations, county pages, events, courses, conservation activities and youth stories.

| Media type | Recommended use | Minimum metadata |
|---|---|---|
| Hero image | Home banners, destination and county landing pages | Title, caption, credit, alt text, location, rights status |
| Gallery images | Destination and story galleries | Caption, credit, alt text, sequence order |
| Short video / reel | Youth stories and destination highlights | Thumbnail, caption, creator, duration, subtitles, rights status |
| Long-form video | Learning lessons, documentary and destination showcase | Thumbnail, description, speaker/creator, transcript or captions |
| 360-degree media | Virtual destination previews | Viewer type, location, instructions and fallback image |
| PDF / guide | Course resources and downloadable travel information | Title, file size, language, version and accessibility label |
| Audio | Oral histories, podcasts and accessibility narration | Title, speaker, transcript and duration |

### §7.2 Media upload rules

- Images: JPEG, PNG or WebP; optimized server versions plus original archival file.
- Videos: MP4 or supported streaming link; generate thumbnails and adaptive streaming where possible.
- Every visual requires alt text and a credit line.
- Creators must confirm ownership or permission before upload.
- Moderators must be able to approve, reject, request changes or remove media.
- The platform should automatically compress uploads while retaining acceptable quality.
- Subtitles or captions should be required for official and learning videos.

### §7.3 Destination multimedia layout

Layout slots:
- Main destination hero photograph (file name/link, caption, credit/owner)
- Destination promotional or youth storytelling video (file name/link, caption, credit/owner)
- Additional gallery photographs, 3–10 (file name/link, caption, credit/owner)

### §7.4 Developer content component — required fields

| Component | Required fields |
|---|---|
| Image object | ID, URL, thumbnail URL, alt text, caption, credit, rights status, order, upload date |
| Video object | ID, hosting type, URL, thumbnail, title, caption, creator, duration, subtitles URL, rights status |
| Gallery component | Gallery ID, related entity, media list, display order, cover media |
| Media moderation | Status, moderator, reason, date reviewed, content warning, takedown history |

---

## 4. AI guardrails (spec §8.1–8.3)

### §8.1 AI Trip Planner inputs

| Field | Requirement |
|---|---|
| Starting location | Town/county selection or optional current location |
| Duration | Number of days or half-day/day trip |
| Budget band | Indicative total or per-person planning budget |
| Interests | Wildlife, hiking, beaches, culture, food, heritage, photography, conservation and others |
| Group type | Solo, friends, family, school/youth group or mixed group |
| Travel pace | Relaxed, balanced or packed |
| Transport assumption | Public transport, self-drive, hired vehicle or undecided |
| Accessibility needs | Optional mobility, sensory or dietary preferences |
| Preferred/avoided destinations | Optional destination constraints |

### §8.2 AI output structure

- Trip title and concise summary
- Day-by-day ordered stops
- Indicative departure and activity times
- Estimated travel time and distance
- Suggested activities and approximate duration
- Indicative entrance, meals and transport cost bands
- Responsible travel and conservation tips
- Alternative options for weather or time constraints
- Sources or database references used
- Disclaimer that the itinerary is a planning mock-up and not a confirmed booking

### §8.3 AI guardrails

- Generate recommendations only from approved or clearly labelled external data.
- Do not invent opening hours, prices, safety guarantees or contact details.
- Show the last update date for volatile information.
- Do not generate checkout links or imply that a reservation has been made.
- Protect sensitive conservation sites and personal user data.
- Provide a report-answer control and human review dashboard.
- Use a deterministic fallback itinerary if the AI service is unavailable.

---

## 5. Role hints (spec §2 + §10.2)

### §2 User types and roles (named in spec)

| User type | Primary access (per §2 outcome column) | Main outcome |
|---|---|---|
| Guest user | Browse home, destinations, map, events and selected stories | Understand what Kenya offers before registering |
| Registered youth traveller | Create mock itineraries, save destinations, join challenges, track counties and share stories | Build a personal Kenya exploration profile |
| Youth creator | Upload photos, short videos, reels, journals and destination tips for moderation | Promote local destinations and build a creator portfolio |
| Learner | Access courses, track progress, complete quizzes and receive certificates/badges | Develop tourism, conservation and digital skills |
| County/content officer | Submit and update destination information and media | Maintain reliable county content |
| Moderator | Review stories, images, videos, comments and reported content | Keep content safe, accurate and respectful |
| Administrator | Manage users, destinations, modules, campaigns, analytics and system settings | Operate and report on the platform |

### Implied per-area permissions (extracted from §2 outcome verb + §10.2 verbs)

The spec does not publish an explicit permission matrix, but the verbs above + §10.2's "Capabilities" column imply:

- **Administrator**: all nine admin functions (create/edit/verify/schedule/archive/import destinations; upload/tag/crop/caption/credit/replace/archive media; approve/reject/age-restrict/remove/handle reports; manage AI prompts/sources/disclaimers/blocked topics/feedback; create courses/lessons/quizzes/certificates; publish events + manage status/reminders/evidence/impact; manage campaigns; role assignment/suspension/consent/exports).
- **County/content officer**: limited to "Submit and update destination information and media" — implied create/edit on destinations, media upload, no publish/approve authority. (`submit` and `update` verbs — not `verify`, `publish`, `archive`.)
- **Moderator**: limited to review work — story approval, media review, report handling. Implied approve/reject/edit-metadata/age-restrict/remove on stories and media only.

### Note on `super-admin`

The spec **does not** name a `super-admin` role. The charting session introduced `super-admin` as a bootstrap-only role for T6 ([Admin bootstrap — first super-admin creation](https://github.com/bradleygichuru/ytci-tanstack/issues/7)) — it is needed because no user can sign themselves in with the Administrator role at cold start. T4 ([RBAC role taxonomy](https://github.com/bradleygichuru/ytci-tanstack/issues/5)) decides whether `super-admin` becomes a permanent role or is demoted after bootstrap.

---

## 6. Non-functional constraints (spec §11)

| Requirement | Minimum expectation (spec §11 verbatim) | Reaches admin build? |
|---|---|---|
| Platforms | Android-first responsive mobile application; iOS-ready architecture; responsive web admin portal | Yes — web admin portal must be responsive |
| Performance | Home page usable within 3 seconds on common 4G; progressive loading on slower connections | Indirect — admin is web-only, no 4G concern, but apply progressive loading to large media libraries |
| Offline support | Saved itineraries, selected destination summaries and optional map packs available offline | No — admin is online-only |
| Accessibility | WCAG-aligned contrast, scalable text, alt text, keyboard support on web, captions and screen-reader labels | Yes — keyboard support on web, alt text (already required by §7.2), captions for learning videos |
| Languages | English and Kiswahili at MVP; architecture ready for additional Kenyan languages | Yes — admin portal must support English + Kiswahili at MVP, architected for extension |
| Security | Encryption in transit/at rest, role-based access, audit logs, secure media upload and vulnerability testing | Yes — RBAC (T4), audit logs (consent auditing — T20), secure media upload (T14), JWT signing (T10) |
| Privacy | Consent management, data minimization, location opt-in, account deletion and retention controls | Yes — consent records + data export/deletion requests are an admin function (T20, §10.2 Users and roles) |
| Scalability | Support all 47 counties, growing media volumes and modular feature rollout | Yes — schema must support 47 counties; media volume scales via R2 (T14) |
| Reliability | Graceful fallback when AI, maps or notifications are unavailable | No — admin configures fallback (T18) but does not depend on it |
| Maintainability | Documented APIs, modular services, source control, automated tests and deployment pipeline | Yes — T7 admin↔Go API contract produces documented API; T21 E2E auth test pass; existing scaffold is source-controlled |

### Other relevant spec constraints

- **No-booking boundary (§6 + §13 acceptance)**: No screen contains Checkout, Pay, Reserve, Confirm Booking, Payment History or Refund controls. Admin side must not surface any such controls in the 9 area surfaces — this is a hard boundary.
- **§5.5 destination page**: "No Book Now or Checkout button" — Destination CMS (T13) must expose no booking-related field types.
- **§5.7 AI itinerary output**: "Never show checkout, reserve or pay actions" — AI Config (T18) must enforce this in guardrail defaults.
- **§8.2 AI output**: includes disclaimer that the itinerary is a planning mock-up and not a confirmed booking — AI Config area must expose this disclaimer as a managed string.
- **Analytics privacy (§12)**: Reports should use aggregated data. Public dashboards must not expose personal travel histories, precise locations or identifiable youth data — constrains T12's design and the Reports export tab.
- **Media optimization (top-line area III + §5.16)**: server-side media compression and automated EXIF metadata stripping must be active on uploads — T14 must show logs of both, and §7.2 confirms "strip EXIF location data" wording for the Create Story flow.