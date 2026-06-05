# taskmobileapps

Consolidated repository for Taskontrol mobile applications, prepared from the verified buildable sources used in recent Android/iOS build and TestFlight submission work.

## Repository Contents

- `mobile/`: Taskontrol Resident app (Expo/React Native)
- `mobile-guard/`: Taskontrol Guard app (Expo/React Native)
- `Guard_Resident_Handoff.md`: implementation and handoff notes
- `memories/`: session and repository memory records

## Quick Start

### Resident app

1. `cd mobile`
2. `npm install`
3. `npm run start`
4. `npm run android` or `npm run ios`

### Guard app

1. `cd mobile-guard`
2. `npm install`
3. `npm run start`
4. `npm run android` or `npm run ios`

## Build/Release Notes

- Both apps include `eas.json` and app configuration for EAS Build.
- Recent iOS/TestFlight pipeline was completed for Resident app with App Store Connect mapping.
- App-level `.easignore` was used to avoid monorepo-root archive contamination.

## Full Memory Content

### memories/session/expo-eas-audit.md

```markdown
# Expo/EAS Configuration Audit - /opt/visitas-superadmin/clouddev3

## Initial Findings Summary

### Mobile Apps Found
1. **mobile/** - Main resident app (Expo 54)
   - App name: "TASKontrol Residente"
   - Bundle ID (iOS): com.taskontrol.residente
   - Package name (Android): com.taskontrol.residente
   - Missing: eas.json, runtimeVersion, updates config

2. **mobile-guard/** - Guard app (Expo 54, built but source missing)
   - Project name: task-garita
   - Has package-lock.json but NO package.json or app.json
   - Only dist/ and node_modules/ present
   - Missing: source config files, eas.json

3. **mobile-resident/** - Empty folder (not used)

### Critical Gaps
- NO eas.json files found anywhere
- NO runtimeVersion specified in app.json
- NO updates config (expo-updates installed but not configured)
- NO CI/build scripts for EAS
- Release build uses debug keystore (SECURITY ISSUE)
- NO production signing config
- mobile-guard has no source config files
- NO certificates or provisioning profiles stored

### Next Steps
- Create eas.json for both apps
- Add runtimeVersion to app.json
- Configure expo-updates
- Setup release signing config for Android
- Create Apple provisioning profiles (will need manual Apple developer account setup)
- Create CI scripts for automated builds

## Session Outcomes (Implemented)

### Source-of-Truth and Mapping
- Guard app source confirmed in `/opt/visitas-superadmin/superadmin-portal-dev6/mobile-guard` mapped to Expo project `@tas-kontrol/tas-k-guard` (`f7e150c8-2f32-4970-99d0-776deb6a6c00`).
- Resident app source confirmed in `/opt/visitas-superadmin/superadmin-portal-dev6/mobile` mapped to Expo project `@tas-kontrol/tas-k-resident` (`65c9af8b-0ad6-4b21-a801-3e3277458af5`).
- Historical resident build lineage validated against commit `62023e09a59f4e24e9ecdd43c8eb93da1e7181a9`.

### Archive Hygiene and Build Context
- Root-cause found: monorepo-root EAS archives included unrelated files (`.md`, `.ps1`, installer/sql/docs/etc.).
- Added app-level `.easignore` files in both `mobile/` and `mobile-guard/`.
- Established clean staging build workflow using `/tmp/tas-k-guard-build` and `/tmp/tas-k-resident-build` to ensure app-only uploads.
- Verified archive content with `eas build:inspect` before reruns.

### Build Failures Fixed
- Fixed `npm ci` cloud failures by aligning staged lockfiles and adding `.npmrc` with `legacy-peer-deps=true` in staged folders.
- Fixed resident prebuild CRC failure: regenerated corrupted PNG assets (`icon.png`, `adaptive-icon.png`, `splash.png`, `favicon.png`) and validated locally.

### Build and Submission Results
- Resident Android preview build completed successfully (`e3e21d72-57e4-482f-bee9-a76505968599`) with APK artifact.
- Resident iOS preview build completed successfully (`ba57f394-b45d-452c-bbbe-b8d174d5ebda`).
- iOS production credentials configured for App Store/TestFlight with Team `WRJQ95R998`, bundle ID `com.taskontrol.residente`, profile `BP5543956C`.
- Resident iOS production build completed successfully (`67384fb8-7fa9-499e-8cdc-f42e4c2887f9`).
- TestFlight submission completed successfully (`f26d9e19-3b58-46ff-8812-8bf0904dc509`), ASC app id `6776858543`.

### User-Facing Guidance Delivered
- Explained Developer Mode limitation and TestFlight path for iPhone installs.
- Provided install flow via TestFlight invite and Apple ID matching guidance.

```

### memories/session/mobile-apps-assessment.md

```markdown
# Taskontrol Mobile Apps Assessment

## Key Findings

### Workspace Structure
- **mobile/** - Resident App (source + config)
- **mobile-guard/** - Guard App (build artifacts only, NO SOURCE CODE)
- **mobile-resident/** - EMPTY (abandoned)
- **mobile/** root files show it's resident app only

### Mobile (Resident App) Status
- **Framework:** Expo 54.0.0 + React Native 0.81.5 + Expo Router 6.0.23
- **Package Manager:** npm (package-lock.json present)
- **Entry Point:** expo-router/entry -> app/_layout.tsx -> auth-based routing
- **Build Status:** BUILDS (no TypeScript errors)
- **Scripts:** start, android, ios, web

### Mobile-Guard (Guard App)
- **Build Output:** dist/ contains _expo/static/js (iOS & Android HBC bundles)
- **Source Code:** MISSING - only build artifacts exist
- **Package Lock:** Shows "task-garita" (garita = guardhouse in Spanish)
- **Dependencies:** More extensive (camera, speech, TCP sockets, QR SVG, image manipulation)
- **Critical Issue:** NO SOURCE CODE IN mobile-guard/ - cannot rebuild or modify

### Resident App Key Features
- Activation flow (activation code -> password -> auto-config)
- Login with email/password
- Tab navigation (home, visits, QR, log)
- AsyncStorage for credentials
- Secure Store for tokens
- Core screens 70% complete (index, activate, login, (tabs))

### Guard App Dependencies (from package-lock)
- @expo/vector-icons (UI icons)
- expo-camera (hardware access)
- expo-speech (text-to-speech)
- expo-image-manipulator (image processing)
- react-native-qrcode-svg (QR generation)
- react-native-tcp-socket (device communication)
- expo-updates (OTA updates)

## Major Blockers

1. **Guard App Source Missing** - Build exists but cannot iterate
2. **No app.json in mobile-guard** - Cannot verify store configuration
3. **mobile-resident is empty** - Was this supposed to be a monorepo?
4. **No bundle identifiers verified** - Need app.json files
5. **No store submission metadata** - Privacy policy, terms not in evidence
6. **Build scripts minimal** - No EAS config for app store builds

## Missing for Store Submission

### iOS Requirements
- Provisioning profiles
- Team ID configuration
- App Store certificate
- Privacy manifest (NSPrivacyTracking, etc.)
- app.json: bundleIdentifier setup
- eas.json config

### Android Requirements
- Keystore file
- app.json: package name + keystore config
- Google Play signing certificate
- Permissions cleanup (camera, location, etc.)
- eas.json or gradlew config

### Both Platforms
- app.json configurations (guard app has none visible)
- .env for API endpoints
- Version management strategy
- Testing status (no test scripts in package.json)
- Crash reporting setup (Sentry, etc.)

## Status Summary

**Resident App:** Partially complete - basic auth flows implemented, tab structure ready, but no real feature screens
**Guard App:** Built but source unreachable - cannot iterate without source code recovery
**Monorepo Setup:** Incomplete - mobile-resident empty, no workspace configuration for two apps

```

### memories/session/plan.md

```markdown
## Plan: Server-First Deep Search and Store Readiness

Perform a server-first deep search on 192.168.1.51 (clouddev3), verify API/live endpoint behavior on taskontrol.lat, and produce an execution path to App Store/Play Store readiness for Taskontrol Guard and Taskontrol Residente.

**Steps**
1. Phase 1 - Targeted Clouddev3 Deep Search (blocking): SSH to sysadmin@192.168.1.51 and deeply inventory /opt/visitas-superadmin/clouddev3 with priority on folders mobile, mobile-guard, mobile-resident, and app. Capture canonical app roots, Expo/EAS files, source completeness, git branch/status, and last commit provenance.
2. Phase 1 - Whole-Server Discovery Pass (blocking after step 1): Run a whole-server scan outside clouddev3 to find alternate copies/backups of Guard/Resident apps, stale deployments, archived repos, and config duplicates (app.json, eas.json, package.json, route trees). Produce a deduplicated location map and mark authoritative paths.
3. Phase 1 - API Surface Extraction on Server (blocking): Enumerate backend routes from app/api/**/route.ts and generate grouped endpoint index (resident, guard, admin, billing, whatsapp, cron, health). Record method signatures and auth expectations.
4. Phase 1 - Production Endpoint Validation (parallel with step 3): Probe taskontrol.lat and server base URL endpoints for health, auth gates, webhook exposure, and method constraints. Classify each route as public, authenticated, webhook-only, or internal-cron.
5. Phase 2 - Mobile Dependency Crosswalk (depends on 1 and 3): Map every mobile API call to backend endpoints and identify dead/missing routes, mismatched methods, and base URL resolution rules for Guard and Resident.
6. Phase 2 - Guard Source Recovery/Verification (depends on 1 and 2): If Guard source exists in clouddev3 or anywhere else on server, restore it into canonical path with app config and entry points; if unavailable, trigger fallback Guard rebuild plan.
7. Phase 2 - Expo/EAS State Audit (depends on 1): Validate app.json/app.config, eas.json, identifiers, runtimeVersion/updates policy, credentials flow, and build profiles for both apps. Flag gaps blocking Android/iOS release builds.
8. Phase 3 - Build/Signing Readiness (depends on 6 and 7): Configure Android release keystore + Play signing flow and iOS certificates/profiles + App Store Connect mapping for both apps.
9. Phase 3 - Backend Production Readiness (parallel with 8): Validate production env vars, auth/session behavior, callback URLs, and payment/webhook settings used by mobile release paths.
10. Phase 4 - Internal + Public Release Track (depends on 8 and 9): Produce TestFlight/Play Internal builds first while preparing production metadata in parallel; then submit to App Store/Play production after QA sign-off.

**Relevant files**
- /opt/visitas-superadmin/clouddev3/mobile/app.json - Resident app identity and release metadata baseline.
- /opt/visitas-superadmin/clouddev3/mobile/package.json - Resident scripts/dependency baseline and release command surface.
- /opt/visitas-superadmin/clouddev3/mobile/lib/api.ts - Mobile API base URL resolution and endpoint call behavior.
- /opt/visitas-superadmin/clouddev3/mobile/lib/auth.tsx - Token/session lifecycle tied to API compatibility checks.
- /opt/visitas-superadmin/clouddev3/mobile/android/app/build.gradle - Android signing/build-type release correctness.
- /opt/visitas-superadmin/clouddev3/mobile-guard/ - Guard source recovery target and completeness validation.
- /opt/visitas-superadmin/clouddev3/app/api/**/route.ts - Canonical backend endpoint definitions.
- /opt/visitas-superadmin/clouddev3/src/lib/base-url.ts - Canonical app URL resolution used across server features.

**Verification**
1. Server inventory proof: command outputs for folder map, git state, and file presence (Guard + Resident + EAS files).
2. API index proof: route inventory with methods and auth class, generated from app/api source.
3. Live probe proof: endpoint response matrix for taskontrol.lat and LAN base URL (status/method/auth result).
4. Mobile crosswalk proof: each mobile endpoint mapped to existing backend route with no unresolved calls.
5. EAS/build proof: successful Android/iOS build profile runs and signed artifacts for both apps.
6. Submission proof: internal distribution available and production submission checklist complete.

**Decisions**
- Scope includes: deep search on server 192.168.1.51 with targeted focus on clouddev3/mobile, clouddev3/mobile-guard, clouddev3/mobile-resident, clouddev3/app, plus whole-server discovery; taskontrol.lat endpoint verification, backend readiness, and full release path.
- Assumption: Guard source exists externally and can be recovered during phase 1/2.
- Included release strategy: internal and production tracks prepared in parallel.

- Implementation note: /opt/visitas-superadmin/clouddev3/mobile/package-lock.json already included expo-updates in the root dependency set, so the release scaffold could be added by syncing package.json and app.json rather than re-resolving the lockfile.

**Further Considerations**
1. Execute server commands directly on 192.168.1.51 shell if remote tool access is unavailable in this session.
2. Keep a strict timebox for Guard source recovery before fallback rebuild is activated.
3. Preserve endpoint security posture by classifying webhook and cron routes separately from public app routes.

```

### memories/repo/option-21-redesign.md

```markdown
# Option 21: TAS Command Redesign

## Location
All files in: `redesign-options/option-21/` (23 files total)
NEVER modify files in `app/` - option-21 is a standalone proposal.

## Files Created
- `globals.css` - Full design system (CSS custom properties, tc-* component classes)
- `admin-layout.tsx` - Collapsible sidebar (240px/64px), mobile drawer
- `admin-dashboard.tsx` - KPI stats, quick actions, system status
- `admin-login.tsx` - Split-screen brand + form
- `admin-visits.tsx` - Full CRUD + status modal + KPI bar
- `admin-residents.tsx` - CRUD + temp password flow
- `admin-guards.tsx` - CRUD + password generator
- `admin-notifications.tsx` - Compose + history
- `admin-logs.tsx` - Audit log + JSON detail modal
- `admin-sectors.tsx` - Expandable area/subarea/sector tree
- `admin-tags.tsx` - SAC NFC tags CRUD + sync status
- `admin-common-areas.tsx` - Card grid CRUD + toggle active
- `resident-layout.tsx` - Mobile bottom nav + desktop sidebar
- `resident-dashboard.tsx` - Greeting hero + quick actions + recent access
- `resident-login.tsx` - Clean login with brand header
- `resident-visits.tsx` - List + status chips + QR modal
- `resident-visits-new.tsx` - Create form with recurring support
- `resident-log.tsx` - Timeline grouped by date
- `resident-notifications.tsx` - Expandable inbox + mark read
- `resident-qr.tsx` - QR display + countdown + regenerate
- `resident-profile.tsx` - Info display + edit + change password
- `resident-events.tsx` - Area booking cards + reservation list
- `landing-page.tsx` - Full marketing page (Nav, Hero, Features, HowItWorks, Pricing, Testimonials, ContactCTA, Footer)

## Design System
- Brand: `#001F5B` navy, `#0060C7` blue, `#0EA5E9` accent
- Fonts: Sora (display) + DM Sans (body)
- Pattern: `className="tc-*"` CSS classes + `style={{ var(--token) }}`
- All CSS tokens in `globals.css`

```
