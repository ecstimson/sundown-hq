# Sundown HQ — Product Requirements Document
## Animal Management, SOPs & Inventory Drop Planner
## March 1, 2026

---

## 1. Overview

### Problem
Sundown Reptiles manages ~1,000 geckos + 60 tree monitor breeders across 2 warehouse buildings with 3 employees. The current system is a local database on Bryan's old laptop in the gecko building. Employees have no structured way to log observations, complete daily tasks, or reference SOPs. There's no protection against accidental data corruption, and no system to intelligently decide which of the ~700 sellable animals should be listed next.

### Solution
**Sundown HQ** — a two-part web application:
1. **Employee PWA** (mobile-first): Protected interface for viewing animals, logging observations with photos, completing daily checklists, and reading SOPs
2. **Admin Dashboard** (desktop-first): Full database management, SOP authoring, checklist review, drop planning with weighted scoring, and Shopify/MorphMarket sync triggers

### Users
| Role | User | Access |
|------|------|--------|
| **Super Admin** | You (tech/development) | Full access + deployment + automation config |
| **Admin** | Bryan (Sundown Reptiles owner) | Full CRUD on all records, drop planner, SOP management, checklist review |
| **Employee** | 3 warehouse staff | View animals, update weights/notes, attach observation photos, complete daily checklists, read SOPs |

---

## 2. Technical Architecture

### Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Frontend** | Next.js 14+ (App Router) + Tailwind CSS + shadcn/ui | Single codebase, route-based role separation |
| **PWA** | next-pwa or @serwist/next | Installable on employee phones, add-to-home-screen |
| **Hosting** | Vercel (free tier) | Auto-deploy from GitHub |
| **Database** | Google Sheets (via Sheets API) | Bryan's single source of truth, readable by n8n/Claude Code |
| **API Middleware** | n8n (Railway) | Handles Sheets API calls, webhooks, Shopify sync |
| **Photo Storage** | Vercel Blob (free tier: 1GB) | Observation photos only — listing photos stay in Google Drive |
| **Auth** | Simple role-based: PIN code per employee, password for admin | No Supabase needed for v1. Upgrade path to Supabase Auth if needed. |
| **Design** | Google AI Studio for initial UI design → Cursor for build | See `sundown-hq-ai-studio-design-prompt.md` |

### Data Flow
```
Employee PWA ──→ n8n API ──→ Google Sheets
                   │
Admin Dashboard ───┘
                   │
                   ├──→ Shopify Admin API (create/update product drafts)
                   ├──→ MorphMarket CSV export (download)
                   └──→ Vercel Blob (observation photos)
```

### Google Sheets Structure (Backend)

**Sheet 1: Animals**

| Column | Field | Type | Employee Editable? |
|--------|-------|------|-------------------|
| A | Animal ID | String (`SR-GG-2025-0147`) | No |
| B | Species | String | No |
| C | Scientific Name | String | No |
| D | Gender | Enum: Male/Female/Unsexed | No |
| E | Pairing ID | String (`P-GG-042`) | No |
| F | Sire (Father ID) | String | No |
| G | Dam (Mother ID) | String | No |
| H | Hatch Date | Date (ISO) | No |
| I | Current Weight (g) | Number | **Yes** |
| J | Last Weighed | Date | **Yes** (auto on weight update) |
| K | Morph/Traits | String (comma-sep) | No |
| L | Price | Number (USD) | No |
| M | Status | Enum: Breeder/Available/Hold/Listed/Sold/Archived | No |
| N | Shopify Product ID | String | No |
| O | MorphMarket ID | String | No |
| P | Date Listed (Shopify) | Date | No |
| Q | Date Sold | Date | No |
| R | Buyer | String | No |
| S | Building | Enum: A/B | No |
| T | Rack/Enclosure | String (`A-3-14`) | No |
| U | Image Folder Link | URL (Google Drive) | No |
| V | Notes | String | **Yes** (append only) |
| W | Created Date | Date | No |
| X | Listing Readiness Score | Number (calculated) | No (auto-calculated) |
| Y | Last Observation Date | Date | **Yes** (auto on observation) |

**Sheet 2: Observations**

| Column | Field | Type |
|--------|-------|------|
| A | Observation ID | Auto-increment |
| B | Animal ID | String (lookup) |
| C | Employee Name | String |
| D | Observation Type | Enum: Feeding/Weight/Health Concern/Behavior/Shedding/Egg-Breeding/General Note |
| E | Details | Text |
| F | Urgency | Enum: Routine/Needs Attention/Urgent |
| G | Photo URL | URL (Vercel Blob) |
| H | Timestamp | DateTime |

**Sheet 3: Pairings**

| Column | Field | Type |
|--------|-------|------|
| A | Pairing ID | String |
| B | Sire ID | String |
| C | Dam ID | String |
| D | Species | String |
| E | Status | Enum: Active/Retired |
| F | Total Clutches | Number |
| G | Notes | Text |

**Sheet 4: Daily Checklists**

| Column | Field | Type |
|--------|-------|------|
| A | Date | Date |
| B | Building | Enum: A/B |
| C | Checklist Type | Enum: Opening/Feeding-AM/Feeding-PM/Closing/Weekly |
| D | Employee | String |
| E | Completed At | DateTime |
| F | Items Completed | JSON (array of task IDs with timestamps) |
| G | Notes | Text |

**Sheet 5: Drop Schedule**

| Column | Field | Type |
|--------|-------|------|
| A | Drop ID | String (`DROP-2026-03`) |
| B | Drop Date | Date |
| C | Animal IDs | String (comma-sep list) |
| D | Status | Enum: Planning/Prep/Listed/Complete |
| E | Type | Enum: Monthly/Tax Season/Black Friday/Vault Rotation |
| F | Discount Code | String |
| G | Notes | Text |

**Sheet 6: Shopify CSV Export**

Auto-generated tab for Shopify Products > Import. Formatted to match Shopify's native CSV spec. Script populates this from Drop animals.

| Column | Shopify Field | Source (from Animals sheet) | Notes |
|--------|--------------|---------------------------|-------|
| A | Handle | Auto-generated from Species + Animal ID (lowercase, hyphens) | e.g., `gargoyle-gecko-sr-gg-2025-0147` |
| B | Title | `[Species], [Gender] — Pairing [PairingID]` | e.g., "Gargoyle Gecko, Female — Pairing P-GG-042" |
| C | Body (HTML) | Template: ID, parents, hatch date, gender, weight, price. New Caledonian species include parent image tags. | HTML formatted description |
| D | Vendor | "Sundown Reptiles" | Static |
| E | Product Category | "Animals & Pet Supplies > Live Animals" | Shopify taxonomy |
| F | Type | Species common name | For filtering |
| G | Tags | `[species-slug], [gender], [morph-tags], [drop-id]` | Comma-separated |
| H | Published | TRUE or FALSE | TRUE for drop day, FALSE for drafts |
| I | Variant SKU | Animal ID (`SR-GG-2025-0147`) | Unique identifier |
| J | Variant Grams | Current Weight × 1 (grams) | From Animals sheet col I |
| K | Variant Inventory Qty | 1 | Always 1 (unique animal) |
| L | Variant Inventory Policy | "deny" | Can't oversell a live animal |
| M | Variant Price | Price from Animals sheet col L | |
| N | Variant Requires Shipping | TRUE | |
| O | Image Src | Google Drive public URL(s) | See image workflow below |
| P | Image Alt Text | `[Morph] [Species] [Gender] [ID] - Sundown Reptiles` | SEO alt text |
| Q | SEO Title | `[Species] [Morph] [Gender] For Sale - Sundown Reptiles` | 50-60 chars |
| R | SEO Description | Template with price, morph, parents, 20+ years experience | 150-160 chars |
| S | Collection | Species collection handle | Auto-sorts into collection pages |
| T | Status | "active" or "draft" | |

**Workflow:** Admin clicks "Generate Shopify CSV" in Drop Planner → n8n script reads Drop animals from Sheet 1, formats into Sheet 6 columns, Bryan downloads as CSV → Shopify Admin > Products > Import. Alternatively, use Matrixify app for more robust imports with metafields.

**Sheet 7: MorphMarket CSV Export**

Auto-generated tab for MorphMarket Bulk Import 2.0. Formatted to match MM's TSV/CSV spec.

| Column | MM Field | Source (from Animals sheet) | Notes |
|--------|----------|---------------------------|-------|
| A | Category | Species common name (MM taxonomy) | e.g., "gargoyle gecko" (lowercase) |
| B | Title | `[Morph] [Species]` | e.g., "Red Stripe Gargoyle Gecko" |
| C | Serial | Animal ID (`SR-GG-2025-0147`) | Unique key for sync/update |
| D | Price | Price from Animals sheet | Number, no $ symbol |
| E | Sex | "male" / "female" / "unsexed" | Lowercase |
| F | Maturity | "baby" / "juvenile" / "sub-adult" / "adult" | Calculated from age |
| G | Dob | Hatch Date (MM-DD-YYYY format) | MM date format |
| H | Weight | Current Weight in grams | |
| I | Traits | Morph/Traits (space-separated for MM) | e.g., "red stripe blotched" |
| J | Desc | Same body text as Shopify but plain text (no HTML) | Strip tags |
| K | Photo_Urls | Google Drive public URLs (pipe-separated for multiple) | MM supports Google Drive links directly |
| L | Quantity | 1 | Always 1 |
| M | Availability | "available" / "on hold" / "sold" | Maps from Status |
| N | Origin | "domestically produced" | USCBB |
| O | Proven_Breeder | "no" (for hatchlings) / "yes" (for proven adults) | |
| P | Is_Negotiable | "FALSE" | Premium pricing, not negotiable |
| Q | Min_Shipping | Shipping minimum | |
| R | Max_Shipping | Shipping maximum | |

**Workflow:** Admin clicks "Generate MorphMarket CSV" in Drop Planner → n8n script reads animals, formats into Sheet 7 columns, Bryan downloads as TSV → MorphMarket > Seller Tools > Import > Upload. Use "Synchronize" mode to update existing listings by Serial (Animal ID).

### Google Sheets Access Model

| User | Access Level | How |
|------|-------------|-----|
| **Bryan** | Full read/write to ALL sheets | Direct Google Sheets access + Admin Dashboard |
| **You** | Full read/write to ALL sheets | Direct Google Sheets access + scripts |
| **Employees** | NO direct Sheet access | Only interact via Sundown HQ PWA (which writes through n8n API) |
| **n8n / Claude Code** | Service account read/write | Google Sheets API via service account credentials |

Bryan can always open Google Sheets directly, add animals by typing in new rows, edit anything, export CSVs manually — the app is an *additional* interface, not the only one. The Sheet is the source of truth regardless of how data gets in.

---

## 3. Employee PWA — Feature Spec

### 3.1 Authentication
- **Login screen:** Employee selects their name from a dropdown, enters a 4-digit PIN
- **Session:** Persists via cookie/localStorage, auto-logout after 12 hours
- **No signup flow** — Bryan creates employee accounts via admin dashboard

### 3.2 Home Screen (Dashboard)
After login, the employee sees:
- **Today's Checklists:** Outstanding tasks for their assigned building(s) with completion status
- **Urgent Alerts:** Any animals flagged "Urgent" or "Needs Attention" in the last 24 hours
- **Quick Actions:** "Log Observation", "Update Weight", "View Animals"
- **Building selector:** Toggle between Building A and Building B

### 3.3 Animal List
- **Search:** By Animal ID, species, rack/enclosure location
- **Filters:** Species, Building, Status (employees see Breeder/Available/Hold/Listed — not price-related filters)
- **Sort:** By species, location, last observation date, weight
- **Card view:** Each animal shows: ID, species, gender, morph, location, last weight, last observation date
- **Tap to open detail view**

### 3.4 Animal Detail View
**Header:** Animal ID, Species, Gender, Morph/Traits, Location (Rack/Enclosure)

**Info Section (read-only for employees):**
- Hatch Date, Age (calculated)
- Pairing ID, Sire, Dam
- Status (Breeder/Available/Hold/Listed)
- Image folder link (opens Google Drive)

**Editable Section:**
- **Current Weight:** Tap to update. Auto-sets "Last Weighed" to now.
- **Notes:** Append-only text field. Shows history of all notes with timestamps.

**Observation History:** Scrollable list of all past observations for this animal (newest first). Each shows: type, details, urgency, photo thumbnail, timestamp, employee name.

**Action Buttons:**
- "Log Observation" → opens observation form pre-filled with this Animal ID
- "Update Weight" → quick weight entry modal
- "Flag for Attention" → shortcut to create an "Urgent" observation

### 3.5 Log Observation
| Field | Input Type | Required? |
|-------|-----------|-----------|
| Animal ID | Pre-filled or searchable dropdown | Yes |
| Observation Type | Dropdown: Feeding, Weight, Health Concern, Behavior, Shedding, Egg/Breeding, General Note | Yes |
| Details | Multi-line text | Yes |
| Urgency | Radio: Routine / Needs Attention / Urgent | Yes |
| Photo | Camera capture or gallery upload (max 3 photos) | No |

On submit: writes to Observations sheet, updates animal's Last Observation Date. If Urgency = "Urgent", triggers n8n webhook → notification to Bryan (text/email/Basecamp).

### 3.6 Daily Checklists
**Organized by building and time of day:**

**Building A — Morning (Opening + AM Feeding)**
- [ ] Building unlocked, lights on, HVAC verified
- [ ] Incubator temp check: ___°F (input field)
- [ ] Incubator humidity check: ___%  (input field)
- [ ] Misting system check (all nozzles functioning)
- [ ] Water changes (bowls/drippers)
- [ ] AM feeding round complete
- [ ] Calcium dusting applied (Y/N)
- [ ] Visual health scan — any concerns? (text field)

**Building A — Evening (PM Feeding + Closing)**
- [ ] PM feeding round complete
- [ ] Insect colony check (crickets/roaches)
- [ ] Egg checks (if applicable)
- [ ] Record any mating behavior observed (text field)
- [ ] All enclosures latched and secured
- [ ] Lights/heat on night cycle
- [ ] Building locked

**Building B — Same structure**

**Weekly Tasks (triggered Monday)**
- [ ] Deep clean rotation (which enclosures this week)
- [ ] Weight check rounds
- [ ] Supply inventory count
- [ ] Insect colony maintenance

**Behavior:**
- Each checklist item shows a checkbox + optional input field
- Tapping a checkbox records the timestamp and employee name
- Bryan sees completion status in admin dashboard in real-time
- Incomplete checklists at end-of-day trigger a notification to Bryan
- Completed checklists are archived by date for audit trail

### 3.7 SOP Library
- **List view:** Categories matching Bryan's list (Opening Procedures, Incubator Checks, Feeding Schedule, etc.)
- **Detail view:** Read-only rich text document. May include images (e.g., photo of correct calcium dusting technique).
- **Search:** Full-text search across all SOPs
- **No editing** — employees can only read. Bryan manages content in admin.

### 3.8 PWA Configuration
- **Installable:** Add-to-home-screen prompt on first visit
- **Manifest:** App name "Sundown HQ", Sundown Reptiles icon, dark theme matching brand
- **Online-only:** No service worker caching of data (wifi confirmed reliable). Cache static assets only (app shell, icons, fonts).
- **Mobile-first layout:** Designed for phone screens. Usable on tablet but not optimized for desktop.

---

## 4. Admin Dashboard — Feature Spec

### 4.1 Authentication
- **Login:** Email + password (Bryan + you)
- **Session:** Persists, auto-logout after 30 days
- **Role:** Full access to all features

### 4.2 Dashboard Home
- **Today's Stats:** Animals by status (Breeder: 360, Available: 700, Hold: X, Listed: X, Sold: X, Archived: X)
- **Checklist Status:** Building A morning ✅ / Building B morning ⏳ / etc.
- **Urgent Alerts:** Any "Urgent" observations from today
- **Upcoming:** Next drop date, animals assigned to drop, prep status
- **Recent Activity:** Last 20 observations/weight updates across all employees

### 4.3 Animal Management (Full CRUD)
Everything the employee sees PLUS:
- **Create new animal** — full form with all fields
- **Edit any field** — including Status, Price, Pairing, Location
- **Delete animal** — with confirmation dialog ("Are you sure? This cannot be undone.")
- **Bulk actions:** Select multiple animals → change status, assign to building, assign to drop
- **Import:** CSV upload to bulk-create animals (for Bryan's laptop migration)
- **Export:** Download current database as CSV

### 4.4 Drop Planner

**The core feature that drives the monthly inventory release cycle.**

#### Listing Readiness Score (Weighted Algorithm)

Each "Available" animal gets a score from 0-100 based on:

| Factor | Weight | Scoring Logic |
|--------|--------|--------------|
| **Age/Weight Readiness** | 30% | Species-specific thresholds. E.g., gargoyle geckos: >20g and >2 months old = full points. Below threshold = 0. Approaching threshold = partial. |
| **Time in Inventory** | 25% | Days since status changed to "Available." Longer = higher score. >90 days = max points (listing urgency). |
| **Employee Observations** | 25% | Keywords in recent observations: "display-ready", "great color", "eating well", "healthy" = positive. "Not eating", "stress marks", "thin" = negative/zero. |
| **Photo Readiness** | 10% | Has images in Google Drive folder (link populated)? Has recent observation photos showing current appearance? |
| **Seasonal Demand** | 10% | Species-specific multiplier. During peak gecko season (summer→winter), gecko scores get a boost. Monitors stay flat year-round. |

**Score interpretation:**
- **80-100:** Ready to list NOW. Recommend for next drop.
- **60-79:** Almost ready. May need fresh photos or one more weight check.
- **40-59:** Getting there. Check again next month.
- **0-39:** Not ready (too young, underweight, health concern, or no photos).

#### Drop Planning Workflow
1. Bryan opens Drop Planner → sees all "Available" animals sorted by readiness score
2. System recommends a batch size based on the month (backlog months vs. steady state)
3. Bryan reviews top-scoring animals, checks/unchecks to customize the batch
4. Bryan assigns animals to the drop → Status changes to "Hold" (reserved for this drop)
5. During prep week: employees photograph, weigh, and log observations for assigned animals via PWA
6. Bryan reviews prep status in admin: "12/15 animals photographed, 14/15 weighed"
7. Bryan triggers "Generate Shopify CSV" → n8n populates Sheet 6 with all Shopify-formatted data including Google Drive image URLs → Bryan downloads CSV → uploads via Shopify Admin > Products > Import
8. Bryan triggers "Generate MorphMarket CSV" → n8n populates Sheet 7 → Bryan downloads TSV → uploads via MorphMarket Import
9. On drop day: Bryan verifies listings in Shopify Admin, publishes if status was set to draft

#### Drop Types
| Type | Frequency | Discount | Special Behavior |
|------|-----------|----------|-----------------|
| Monthly | 1st Friday | None | Standard scoring |
| Tax Season | Late Feb - mid Apr | SPRING15 (15%) | Boost scoring for mid-range animals ($300-800) — these are impulse-buy territory with refund money |
| Black Friday | Fri-Mon after Thanksgiving | BLACKFRIDAY (20%) | Hold premium animals from October drop. Highest volume of the year. |
| Vault Rotation | End of quarter | FOUNDER20 (20% subscribers only) | Pull all 90+ day listed animals. Re-photo. Subscriber-exclusive clearance. |

### 4.5 SOP Management
- **Create/edit SOPs:** Rich text editor (markdown or WYSIWYG)
- **Organize by category:** Drag-and-drop ordering within Bryan's 12 categories
- **Attach docs and images:** Upload SOP reference files (PDF, DOC/DOCX, images) from admin
- **Version history:** Basic — save previous version on edit

### 4.6 Checklist Management
- **Define checklists:** Create/edit checklist templates (items, input fields, building assignment, time-of-day)
- **Review completions:** Calendar view showing which checklists were completed each day, by whom, at what time
- **Flag incomplete:** See which days had missed checklists
- **Export:** Download checklist history as CSV for record-keeping

### 4.7 Employee Management
- **Create employee accounts:** Name, PIN, assigned building(s)
- **View activity:** Per-employee log of observations, checklist completions, weight updates
- **Deactivate:** Disable an employee's access without deleting their historical data

### 4.8 Integrations (Admin Only)

| Integration | Trigger | Action |
|-------------|---------|--------|
| **Sheet → Shopify CSV** | "Generate Shopify CSV" button in Drop Planner | n8n workflow: reads drop animals from Sheet 1, populates Sheet 6 (Shopify CSV Export) with all required Shopify fields, Bryan downloads CSV → Shopify Admin > Products > Import |
| **Sheet → MorphMarket CSV** | "Generate MorphMarket CSV" button in Drop Planner | n8n workflow: reads drop animals from Sheet 1, populates Sheet 7 (MorphMarket CSV Export), Bryan downloads TSV → MorphMarket > Import. Uses "Synchronize" mode keyed on Animal ID (Serial). |
| **Shopify → Sheet** | Shopify order webhook | n8n workflow: updates Sheet 1 status to "Sold", fills Date Sold + Buyer |
| **Urgent Alert** | Observation with Urgency = "Urgent" | n8n workflow: sends text/email to Bryan + posts to Basecamp |
| **Image URL Resolution** | Part of CSV generation | Script reads Image Folder Link from Sheet, generates public Google Drive URLs for all images in that animal's folder, populates Image Src (Shopify) or Photo_Urls (MorphMarket) columns |

---

## 5. Google Drive — Listing Photo Library

This is NOT part of the app. It's the organized folder system for primary listing photos. Bryan adds images here the same way he always has — open the folder, drop in photos. The naming convention makes them searchable and linkable.

### Folder Structure
```
📁 Sundown Reptiles — Animal Images
├── 📁 Gargoyle Gecko
│   ├── 📁 SR-GG-2025-0147
│   │   ├── SR-GG-2025-0147_fired_01.jpg
│   │   ├── SR-GG-2025-0147_unfired_01.jpg
│   │   └── SR-GG-2025-0147_weight_2026-02-20.jpg
│   └── ...
├── 📁 Chahoua Gecko
├── 📁 Crested Gecko
├── 📁 Leachianus
├── 📁 Blue Tree Monitor
├── 📁 Green Tree Monitor
├── 📁 Yellow Tree Monitor
├── 📁 Pilbara Rock Monitor
├── 📁 [etc.]
└── 📁 Parents (Breeders)
    ├── 📁 SR-GG-2020-0012_Sire
    └── 📁 SR-GG-2020-0023_Dam
```

**Image Naming Convention:** `[AnimalID]_[type]_[sequence].jpg`
Types: `fired`, `unfired`, `weight`, `parent`, `enclosure`

**New Caledonian species** get parent images linked in Shopify listing (sire + dam photos from the Parents folder).

### How Images Get Into Shopify & MorphMarket Listings

Both Shopify and MorphMarket support image URLs — you don't upload images to each platform separately. The workflow:

1. **Bryan photographs animals** and drops images into the correct Google Drive species folder using the naming convention
2. **Images are set to "Anyone with the link can view"** at the top-level folder (one-time setting, inherits to all subfolders)
3. **The CSV export scripts** automatically generate shareable Google Drive URLs for each animal's images based on the Image Folder Link in the Animals sheet
4. **Shopify CSV** uses these URLs in the `Image Src` column — Shopify downloads and hosts them on its CDN at import time
5. **MorphMarket CSV** uses the same URLs in the `Photo_Urls` field — MorphMarket supports Google Drive links directly

**Bryan's workflow stays simple:** Take photos → name them with the Animal ID → drop them in the right species folder on Drive. The automation handles the rest.

**Important Google Drive setting:** The top-level "Sundown Reptiles — Animal Images" folder must be shared as "Anyone with the link" for the image URLs to work in Shopify/MorphMarket imports. Individual subfolders inherit this permission.

---

## 6. Animal ID Convention

**Format:** `SR-[SPECIES]-[YEAR]-[SEQUENTIAL]`

| Species | Code | Example |
|---------|------|---------|
| Gargoyle Gecko | GG | SR-GG-2025-0147 |
| Chahoua Gecko | CH | SR-CH-2025-0031 |
| Crested Gecko | CG | SR-CG-2025-0220 |
| Leachianus | LC | SR-LC-2025-0008 |
| Blue Tree Monitor | BTM | SR-BTM-2025-0014 |
| Green Tree Monitor | GTM | SR-GTM-2025-0006 |
| Yellow Tree Monitor | YTM | SR-YTM-2025-0003 |
| Pilbara Rock Monitor | PRM | SR-PRM-2025-0009 |
| Abronia Graminea | AG | SR-AG-2025-0005 |
| Abronia Taeniata | AT | SR-AT-2025-0002 |
| Rough Knob-Tailed Gecko | RKT | SR-RKT-2025-0012 |
| Northern Spiny-Tailed Gecko | NST | SR-NST-2025-0007 |
| Mourning Gecko | MG | SR-MG-2025-0040 |
| Chinese Cave Gecko | CCG | SR-CCG-2025-0011 |
| Vieillard's Chameleon Gecko | VCG | SR-VCG-2025-0004 |
| Black Tree Monitor | BKM | SR-BKM-2025-0002 |
| Biak Tree Monitor | BIM | SR-BIM-2025-0001 |
| Eugenia Depressa | ED | SR-ED-2025-0003 |

**Shopify Title Format:** `[Species], [Gender] — Pairing [PairingID]`
Example: "Gargoyle Gecko, Female — Pairing P-GG-042"

**Shopify Description Includes:** Animal ID, parents (with parent images for New Caledonian species), hatch date, gender, current weight, price.

---

## 7. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| **Mobile load time** | < 2 seconds on 4G |
| **Concurrent users** | 5 (3 employees + Bryan + you) |
| **Data capacity** | 2,000+ animal records (current 1,000 + growth) |
| **Photo storage** | 1GB (Vercel Blob free tier) — ~2,000 observation photos at 500KB each |
| **Uptime** | Vercel SLA (99.99%) |
| **Browser support** | Chrome (Android), Safari (iOS), Chrome (Desktop) |
| **Theme** | Dark luxury aesthetic matching sundownreptiles.com |

### 7.1 Security Rollout (Dev/Test -> Production)

To unblock testing, attachment storage buckets may be public in development and QA. This is temporary.

**Production requirement (must be complete before launch):**

1. Set all attachment buckets to **private** (`observation-photos`, `calendar-files`, `sop-files`).
2. Serve attachments via **signed URLs** generated by authenticated app sessions.
3. Keep strict storage policies:
   - Admin/super_admin: upload and delete
   - Authenticated employees/admins: read only as permitted by app role and table access
4. Protect Vercel preview/staging deployments (password protection and noindex).
5. Treat public-bucket test links as potentially discoverable; do not store sensitive data until private mode is live.

**Employee impact:** none. Employees can continue PIN login; PIN auth establishes a valid authenticated session for secure file access.

---

## 8. Future Enhancements (Not v1)

| Feature | When | Why |
|---------|------|-----|
| **QR/NFC scanning** | v2 | Scan enclosure tag → jump to animal record. Requires NFC tags on racks. |
| **Supabase migration** | If/when Google Sheets hits limits | Real-time, row-level security, proper relational DB. App code barely changes — just swap the API layer. |
| **Genetics calculator** | v2 | Predict offspring morph probabilities from pairing data |
| **Shopify auto-publish** | v2 | One-click "Go Live" from admin drops drafts → active |
| **AppSheet fallback** | If custom build is too slow | Layer AppSheet on top of same Google Sheets for a quick admin interface |
| **Push notifications** | v2 | PWA push for urgent alerts instead of relying on n8n → text/email |
| **Customer-facing drop previews** | v3 | Public page showing upcoming drop with "notify me" buttons |

---

## 9. Success Metrics

| Metric | Target | Measured By |
|--------|--------|-------------|
| Employee adoption | 100% daily checklist completion within 2 weeks | Admin dashboard checklist review |
| Data accuracy | Zero accidental deletions or price changes by employees | Audit log |
| Drop execution time | Prep week → listed in 5 business days (down from "whenever Bryan gets to it") | Drop planner status tracking |
| Listing velocity | 100+ animals listed per month (up from sporadic) | Shopify product count + Sheet status tracking |
| First drop | Within 4 weeks of app launch | Calendar |
