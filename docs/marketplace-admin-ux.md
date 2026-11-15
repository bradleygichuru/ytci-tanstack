# Marketplace admin experience

**Wayfinder ticket:** #228
**Contract:** #224, #229, #235
**Status:** Decided. Build in `ytci-tanstack` on `feat/marketplace`.

## Placement

- New sidebar item **Marketplace** under the **Engagement** group, using the `Storefront` Phosphor icon.
- Route: `/_authenticated/marketplace`.
- One page with three tabs: **Businesses**, **Stays**, **eSIM**.
- Keep the existing admin shell, sidebar, header, and shadcn primitives. This is an Operate surface: scanability and consistency beat expression.

## Shared layout

Copy the list/detail pattern used by Events and Campaigns:

- Left: a list/table of records with a search field, status filter, and cursor pagination.
- Right: a detail/edit panel. On narrow screens the panel replaces the list.
- Header: title, count, primary **Add** button.
- Row: thumbnail, name, category/tier, county, status badge, featured marker, order, updated date.
- Empty: icon + “No businesses yet” + **Add the first business**.
- Loading: skeleton rows, not a blank panel.
- Errors: toast + inline retry; do not silently fail.
- Delete: confirmation dialog naming the record; hard delete in V1.

## Businesses tab

### Form sections

1. **Identity** — name, slug (auto-generated from name, editable), category, tagline, short description, full description.
2. **Place** — county, locality, service area, address, latitude, longitude.
3. **Contact** — contact email, contact phone.
4. **Handoff** — redirect URL, redirect label, disclosure.
5. **Media** — hero image upload, alt text, credit.
6. **Publishing** — status (draft/published/archived), featured toggle, display order.

### Validation

- Name and slug required; slug lowercase letters, numbers, hyphens.
- Category required from the fixed set.
- Short description required, max 240 characters.
- Redirect URL required and `http(s)`.
- Display order 0–10000.
- Duplicate slug shows a field error from the 409 response.

### Mobile preview

A small card in the edit panel showing the mobile marketplace card:

- 4:5 hero or leaf fallback.
- Name, category, county.
- Tagline, max two lines.
- Featured stamp only when `isFeatured`.
- No fake ratings or price.

## Stays tab

### Form sections

1. **Identity** — name, slug, tier, property type, short description, full description.
2. **Place** — county, locality, address, latitude, longitude, distance note.
3. **Price** — price from KES, price note, price checked date.
4. **Trust facts** — cancellation note, payment note, included note, badge label.
5. **Experience** — amenities multi-select, highlights tag input, hero image, alt text, credit.
6. **Handoff** — booking URL, direct URL, disclosure, contact email, contact phone.
7. **Publishing** — status, featured, display order.

### Validation

- Name, slug, tier, property type, short description, county required.
- Published stay needs at least one of booking URL or direct URL.
- URLs must be `http(s)`.
- Price ≥ 0; display order 0–10000.
- Badge label is optional and singular.

### Mobile preview

A stay card preview:

- 4:5 hero.
- Name, locality/county, distance note.
- “From KES X” + price note + checked date.
- Max two fact chips: cancellation, payment, included, badge.
- Tier shown as a secondary label, not the headline.

## eSIM tab

### Form sections

1. **Provider** — name, slug, logo upload, logo alt.
2. **Message** — headline, description, coverage note, price label.
3. **Handoff** — redirect URL, redirect label, disclosure.
4. **Publishing** — status, featured toggle, display order.

### Rules

- At most one published featured provider. Featuring a new one unfeatures the previous in the same transaction.
- `isFeatured` requires `status = published`.
- The mobile hub reads only the featured published provider; other rows are available for future comparison but are not surfaced.

### Mobile preview

The eSIM module at card scale: logo, headline, one-line description, price label, CTA, disclosure. No comparison table.

## Permissions

- Add `marketplace` to the RBAC resource map with `read/create/edit/delete/publish`.
- `super_admin` and `administrator`: all actions.
- `moderator` and `county_officer`: read.
- Route `beforeLoad` requires `marketplace:read`.
- Hide or disable create/edit/delete controls for read-only roles; do not rely on the route guard alone.

## Acceptance

- An admin can create, edit, publish, feature, reorder, and delete a business.
- An admin can create, edit, publish, feature, reorder, and delete a stay with the trust facts.
- An admin can set exactly one featured eSIM provider.
- The mobile API returns the new records immediately.
- Empty, loading, validation, and error states are designed.
- `bun run build` passes; tests follow existing patterns where present.
