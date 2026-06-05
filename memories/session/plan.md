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
