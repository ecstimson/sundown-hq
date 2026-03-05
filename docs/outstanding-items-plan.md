---
name: Sundown HQ v1 Outstanding Items
overview: Complete all remaining features and polish items needed for v1 launch — observation photo upload, Realtime checklists, Drop Planner workflow, PWA setup, Supabase auth URL config, and placeholder pages.
todos:
  - id: observation-photo-upload
    content: Wire up observation photo upload in LogObservation.tsx — capture from camera/gallery, upload to Supabase Storage "observation-photos" bucket, save URLs to observations.photo_urls, display in observation history
    status: pending
  - id: realtime-checklists
    content: Add Supabase Realtime subscription to Checklists.tsx and ChecklistReview.tsx so admin sees live completion updates without refreshing
    status: pending
  - id: drop-planner-workflow
    content: Implement full Drop Planner — listing readiness score calculation, drop creation, animal assignment/Kanban drag, status workflow (Planning→Prep→Listed→Complete), Shopify CSV export button, MorphMarket CSV export button
    status: pending
  - id: pwa-setup
    content: Add vite-plugin-pwa, configure manifest.json with Sundown HQ branding/icons, add service worker for app shell caching so employees can install as home screen app
    status: pending
  - id: wire-placeholder-pages
    content: Implement remaining placeholder pages — Employee Dashboard task assignments, Scan (QR rack label scanning), Employee Settings, Inventory page, Integrations page (Shopify/MorphMarket/n8n connection status)
    status: pending
  - id: supabase-auth-config
    content: Verify and document Supabase Auth URL config — correct site URL, redirect URLs, rotate any test/shared keys if needed
    status: pending
  - id: storage-bucket-setup
    content: Create observation-photos storage bucket in Supabase with public read policy and authenticated upload policy (mirror the SQL in supabase-guide section 6)
    status: pending
  - id: csv-import-validation
    content: Verify CSV import succeeds with "February 2025 animal inventory - Sheet1.csv" and fix any issues
    status: pending
  - id: employee-pin-login-verify
    content: Verify employee PIN login flow works end-to-end on deployed Vercel site
    status: pending
  - id: readme-clean-machine
    content: Update README with complete setup instructions and verify they work on a clean checkout
    status: pending
isProject: false
---

# Sundown HQ v1 — Outstanding Items Plan

## Context

The calendar system, auth hardening, and core data layer are complete. This plan covers everything remaining from the launch checklist, Supabase guide, and PRD that is not yet implemented or is still a placeholder.

## 1. Observation Photo Upload

**Files:** `src/pages/LogObservation.tsx`
**Depends on:** Supabase Storage bucket `observation-photos` existing (see task 7)

Currently the Camera and Gallery buttons in the observation form are non-functional. Wire them up:

- Use `<input type="file" accept="image/*" capture="environment">` for camera and a standard file picker for gallery
- Upload to Supabase Storage `observation-photos/{animal_id}/{timestamp}-{filename}`
- After upload, get the public URL and append to a local array
- Show thumbnails of selected photos with remove buttons
- On form submit, include `photo_urls` array in the `observations` insert
- Display photo thumbnails in observation history on `AnimalDetail.tsx`
- Max file size: 5MB, max 5 photos per observation

## 2. Realtime Checklists

**Files:** `src/pages/Checklists.tsx`, `src/pages/admin/ChecklistReview.tsx`

Add Supabase Realtime subscription so the admin dashboard shows live checklist completion:

- In `ChecklistReview.tsx`, subscribe to `postgres_changes` on `daily_checklists` filtered by today's date
- On INSERT or UPDATE events, merge the payload into local state (no full re-fetch needed)
- In `Checklists.tsx` (employee), subscribe so that if another employee completes a checklist, the UI updates
- Clean up subscriptions on unmount

## 3. Drop Planner Full Workflow

**Files:** `src/pages/admin/DropPlanner.tsx`
**Schema:** `drops`, `drop_animals` tables already exist

The Drop Planner page currently shows a Kanban skeleton with empty stages. Implement:

### Listing Readiness Score
- Calculate score (0–100) for each animal based on PRD algorithm:
  - Has photo folder URL (+20)
  - Has morph traits filled (+15)
  - Weight recorded in last 30 days (+20)
  - Status is "Available" (+15)
  - Has price set (+15)
  - Has observation in last 14 days (+15)
- Store/update `listing_readiness_score` on animals table
- Show score badge on animal cards in the Kanban

### Drop Creation & Management
- "Schedule Drop" button opens a form: drop date, drop type (Monthly/Tax Season/Black Friday/Vault Rotation), discount code, notes
- Insert into `drops` table
- Drop selector dropdown to switch between active drops

### Animal Assignment
- "Add Candidates" opens a searchable animal list filtered to Available status, sorted by readiness score descending
- Selecting animals inserts rows into `drop_animals`
- Kanban columns: Candidates → In Prep → Photography → Ready to List
- Allow dragging animals between stages (update a `stage` field or use the drop status workflow)

### CSV Export
- "Export Shopify CSV" button generates a CSV matching Shopify's product import format from animals in the "Ready to List" stage
- "Export MorphMarket CSV" button generates a TSV matching MorphMarket's import format
- Both trigger browser downloads

## 4. PWA Setup

**Files:** `vite.config.ts`, new `public/manifest.json`, new icons

- Install `vite-plugin-pwa`
- Configure in `vite.config.ts` with:
  - `registerType: 'autoUpdate'`
  - Manifest: name "Sundown HQ", short_name "Sundown", theme_color matching dark theme, background_color, display "standalone"
  - Icons: generate from existing BrandLogo or create simple reptile-themed icon set (192x192, 512x512)
- Add `<meta name="theme-color">` to `index.html`
- Service worker caches app shell (HTML, JS, CSS) for offline-capable loading
- Test install on mobile Chrome/Safari

## 5. Wire Up Placeholder Pages

### Employee Dashboard (`src/pages/EmployeeDashboard.tsx`)
- Show today's assigned tasks from checklists
- Show pending observations (animals needing weight checks)
- Quick action cards: Log Observation, Start Checklist, View Schedule

### Scan Page (`src/pages/Scan.tsx`)
- Integrate a QR/barcode scanner library (e.g. `html5-qrcode`)
- Scan a rack label → navigate to `AnimalDetail` for the scanned animal ID
- Show fallback manual ID entry field

### Employee Settings
- Replace placeholder with basic settings: name display, PIN change, notification preferences, dark mode toggle

### Inventory Page (`src/pages/Inventory.tsx`)
- Summary stats: total animals by species, by status, by building
- Filterable table view with species/building/status breakdown
- Visual charts (bar chart of species counts, pie chart of statuses)

### Integrations Page (`src/pages/admin/Integrations.tsx`)
- Show connection status cards for Shopify, MorphMarket, Google Sheets, n8n
- For now, display configured/not-configured status
- Link to Supabase dashboard and n8n instance URL from env vars
- Future: actual webhook test buttons

## 6. Supabase Auth URL Configuration

- Verify Site URL in Supabase Dashboard → Auth → URL Configuration matches the Vercel production URL
- Add redirect URLs for both localhost and production domains
- Document the correct values in a setup section of the README
- Rotate any keys that were shared during development if needed

## 7. Storage Bucket Setup

- Create `observation-photos` bucket in Supabase Dashboard → Storage
- Set to public (photos need to be viewable)
- Max file size: 5MB
- Add storage policies:
  ```sql
  create policy "upload_observation_photos" on storage.objects
    for insert with check (
      bucket_id = 'observation-photos' and auth.role() = 'authenticated'
    );
  create policy "view_observation_photos" on storage.objects
    for select using (bucket_id = 'observation-photos');
  ```
- Also verify `calendar-files` bucket exists (for event attachments from calendar system)

## 8. CSV Import Validation

- Test the CSV import flow in `admin/Animals.tsx` with the actual February 2025 inventory CSV
- Verify all columns map correctly (species lookup, status, building, etc.)
- Fix any column mapping or parsing issues
- Confirm inserted/skipped/failed counts display correctly

## 9. Employee PIN Login Verification

- Test on deployed Vercel site: select employee name → enter PIN → verify login succeeds
- Verify session persists across page refreshes
- Verify employee can only see employee routes
- Verify admin login with email/password still works

## 10. README & Clean Machine Setup

- Update README.md with:
  - Prerequisites (Node 20+, npm)
  - Environment variable setup (which Supabase keys are needed)
  - Database setup instructions (run migrations in order)
  - Storage bucket creation steps
  - Local development (`npm install && npm run dev`)
  - Deployment (Vercel auto-deploy from GitHub)
  - CI pipeline description
- Test the instructions on a clean `git clone`

## Priority Order

1. **Storage bucket setup** (7) — unblocks photo upload
2. **Observation photo upload** (1) — high-value employee feature
3. **Realtime checklists** (2) — high-value admin feature
4. **PWA setup** (4) — enables employee phone install
5. **Drop Planner workflow** (3) — key admin feature
6. **Placeholder pages** (5) — fills out the app
7. **Auth config** (6), **CSV validation** (8), **PIN verify** (9) — verification tasks
8. **README** (10) — final polish

## Acceptance Criteria

- Employees can photograph observations and see them on animal detail pages
- Admin sees live checklist updates without refreshing
- Admin can create drops, assign animals by readiness score, export Shopify/MorphMarket CSVs
- App installs as PWA on employee phones
- All placeholder pages show functional content instead of "Coming Soon"
- CSV import works with real inventory data
- Employee PIN login works on production
- A new developer can set up the project from README alone
