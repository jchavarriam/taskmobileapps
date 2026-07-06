# Store Readiness Audit

_Audit date: 2026-06-19 · Auditor: Claude Code (read-only inspection) · Repo: `/opt/visitas-superadmin/taskmobileapps/`_

> Scope: **Guard App (Android only)** and **Resident App (Android + iOS)**. No builds, submissions, deletions, or credential changes were performed. All findings are from local source, git, and read-only EAS CLI queries.

---

## Executive Summary

| App | Platform | Store | Status | Main blockers | Can build? | Can submit? |
| --- | --- | --- | --- | --- | --- | --- |
| Guard | Android | Google Play | **Not ready** | EAS project owned by inaccessible `tashonduras` org; assets/config uncommitted; no submit profile; no Play listing | **No** (no account access) | No |
| Resident | Android | Google Play | **Almost ready** | `normalizeServerUrl` prod bug; no Play submit creds; no listing/Data Safety; source not committed | **Yes** (proven) | No (needs Play service acct + listing) |
| Resident | iOS | Apple App Store | **Almost ready** | App Store listing + privacy labels + screenshots; `normalizeServerUrl` prod bug | **Yes** (proven) | Partial — already on TestFlight; needs App Store review submission |

**Build "proven"** = a `finished` production store-distribution build already exists in EAS for that platform (see build history).

---

## Local Repository Status

- **Path:** `/opt/visitas-superadmin/taskmobileapps`
- **Git branch:** `main` (tracks `origin/main`, reported "up to date")
- **Remote:** `https://github.com/jchavarriam/taskmobileapps.git`
- **Latest commit:** `be8deaa feat: add mobile apps source and full memory readme` — **the only commit in history**
- **Uncommitted changes:** YES — large dirty working tree:
  - Modified: `mobile-guard/app.json`, `eas.json`, `.easignore`, `app/entry-code.tsx`, `app/settings.tsx`, `components/DoorController.tsx`, `lib/api.ts`, `lib/photo-upload.ts`, `package.json`, `package-lock.json`, `tsconfig.json`; `mobile/app.json`, `eas.json`, `app/login.tsx`, `lib/api.ts`, `lib/auth.tsx`, `lib/storage.ts`, `package-lock.json`
  - Deleted (good — debug screens removed): `mobile-guard/app/direct-webview-test.tsx`, `mobile-guard/app/updated-webview-test.tsx`
  - **Untracked (not in git at all):** `mobile-guard/assets/` (the app icons!), `mobile-guard/app/event-guests.tsx`, `mobile-guard/logs/`, `mobile/.npmrc`
- **Source freshness risk — HIGH:** The production-ready state lives **only in the working tree**. Icons for Guard, the new `event-guests` screen, and all the config/version changes are **not committed and not pushed**. The remote `origin/main` is an early snapshot. If this machine is lost, the launch-ready state is lost. Single-commit history means there are no production/staging/dev branches and no tags.
- **Package manager:** npm (package-lock.json present in both apps; `mobile/.npmrc` sets `legacy-peer-deps=true`).
- **Structure:** Two **separate Expo apps** (not a monorepo, no shared workspace). `mobile/` = Resident, `mobile-guard/` = Guard. They duplicate code (own `lib/api.ts`, `lib/storage.ts`, etc.) rather than sharing a package. Each is its own Expo/EAS project.

---

## Expo/EAS Status

- **Expo account logged in:** `jchavarriam` (`jchavarriam@tas-seguridad.com`)
- **Accessible accounts/orgs:** `jchavarriam` (Owner), `tas-kontrol` (Owner)
- **EAS CLI:** `eas-cli/20.1.0` global (20.3.0 available); **Node** v20.20.0; **npm** 10.8.2
- **Resident project:** `@tas-kontrol/tas-k-resident` · ID `65c9af8b-0ad6-4b21-a801-3e3277458af5` — **accessible** ✅
- **Guard project:** `@tashonduras/tas-k-guard` · ID `1d299709-871d-4d06-a334-14215918539a` — **NOT accessible** ❌ (`Entity not authorized ... AppEntity[1d299709…]`). The logged-in user is not a member of the `tashonduras` org.
- **Credential status:**
  - Resident Android: keystore exists (production store AAB built successfully).
  - Resident iOS: distribution cert + provisioning configured (production store IPA built + TestFlight submitted). Apple Team `WRJQ95R998`, ASC App ID `6776858543` (from handoff doc).
  - Guard Android: **Unknown / needs access** — cannot query credentials for the `tashonduras` project.

### Build history (read-only)

| App | Platform | Profile | Dist | Version | Code/Build | Status | Finished |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Resident | Android | production | store | 1.0.0 | vc 2 | ✅ finished | 2026-06-05 |
| Resident | iOS | production | store | 1.0.0 | build 3 | ✅ finished | 2026-06-05 |
| Resident | iOS | production | store | 1.0.0 | build 2 | ✅ finished | 2026-06-04 |
| Resident | iOS | preview | internal | 1.0.0 | build 1 | ✅ finished | 2026-06-04 |
| Resident | Android | preview | internal | 1.0.0 | vc 2 | ✅ finished | 2026-06-04 |
| Guard | — | — | — | — | — | **Unknown — no access** | — |

Per handoff doc: Resident iOS TestFlight submission `f26d9e19-3b58-46ff-8812-8bf0904dc509` completed.

---

## Guard App — Android

- **App name:** TASK-Garita
- **Package / bundle:** `com.taskontrol.garita`
- **Expo slug:** `tas-k-guard`
- **Owner / EAS project ID:** `tashonduras` / `1d299709-871d-4d06-a334-14215918539a` ⚠️ **mismatch vs handoff doc**, which listed Guard under `tas-kontrol` / `f7e150c8-2f32-4970-99d0-776deb6a6c00`. The app was re-pointed to a different Expo org the current account cannot access.
- **Version / versionCode:** `1.0.0` / managed remotely (`eas.json` → `cli.appVersionSource: "remote"`; no `versionCode` in app.json)
- **Build profiles:** `production` (android `app-bundle` ✅ AAB), `preview` (apk, internal). **No `submit` profile.**
- **Permissions:** Uses `expo-camera` in entry/exit/ID screens. `expo-camera` is a dependency but **not listed in `plugins`** — on Android the `CAMERA` permission is merged from the library's native manifest so it builds/works, but there is no declared camera usage string (cleaner to add the plugin). Cleartext + old architecture handled correctly via `expo-build-properties` (`usesCleartextTraffic: true`, `newArchEnabled: false`).
- **Firebase:** none.
- **API base URL:** none hardcoded — server URL is entered by the guard in Settings (placeholder shows `http://179.63.252.22:4100` / `https://taskontrol-saas.vercel.app`). Production points wherever the operator configures.
- **Credentials:** **Unknown / needs access.**
- **expo-doctor:** 18/18 checks pass ✅ (clean).
- **Latest build:** Unknown (no access).

**Google Play readiness:** **Not ready.**

**Blockers:**
1. EAS project owned by `tashonduras` — current account `jchavarriam` is **not authorized** → cannot build, manage credentials, or submit.
2. App icon/splash assets (`mobile-guard/assets/`) and `event-guests.tsx` are **untracked/uncommitted** — production state not in source control.
3. No `submit` profile in `eas.json`; Play Console app existence unknown; no service-account JSON.
4. Store listing + compliance assets not prepared (privacy policy, Data Safety, screenshots, etc.).

**Required fixes:**
- Decide ownership: either (a) add `jchavarriam`/`tas-kontrol` to the `tashonduras` org, or (b) re-point `app.json` `owner`/`projectId` back to a `tas-kontrol` project and re-run `eas init`/credentials. **Approval required** — this changes which account ships the app.
- Commit + push assets, `event-guests.tsx`, and config changes.
- Optionally add the `expo-camera` plugin with `cameraPermission` text.
- Add an Android `submit` profile once Play service account exists.

---

## Resident App — Android

- **App name:** TAS-Kontrol Residente
- **Package:** `com.taskontrol.residente`
- **Expo slug:** `tas-k-resident`
- **Owner / EAS project ID:** `tas-kontrol` / `65c9af8b-0ad6-4b21-a801-3e3277458af5` ✅ accessible
- **Version / versionCode:** `1.0.0` / `2` (app.json), `eas.json` `cli.appVersionSource: "local"` + `production.autoIncrement: true`
- **Build profiles:** `development`, `preview` (apk internal), `production` (channel `production`, autoIncrement, android `app-bundle` ✅ AAB). **`submit.production` is empty `{}`.**
- **Permissions:** notifications only (`expo-notifications`); no camera/location. Uses WebView to render the resident portal.
- **Firebase:** none. Push via Expo push tokens (`lib/push.ts`).
- **API base URL:** none hardcoded; server URL derived from the activation code (base64) and stored.
- **Credentials:** Android keystore configured (production AAB built ✅).
- **Latest build:** production AAB `3894f62f-…`, versionCode 2, **finished** 2026-06-05.

**Google Play readiness:** **Almost ready.**

**Blockers:**
1. **`normalizeServerUrl` production bug** (`mobile/app/(tabs)/index.tsx:14-31`): rewrites any server whose host is `localhost`, `127.0.0.1`, or **`179.63.252.22`** to the hardcoded LAN IP `192.168.1.51`. For real users whose backend is `179.63.252.22`, the WebView is silently redirected to a non-existent LAN address → broken app. Must remove/guard before public release.
2. No Play submission credentials: `submit.production` empty (no service-account JSON); Play Console app existence **Unknown / needs access**.
3. Store listing + Data Safety + privacy policy not prepared.
4. Source not committed/pushed (see Local Repository Status).
5. expo-doctor: missing peer dep `expo-constants` (imported in `lib/push.ts`) + 6 patch-version mismatches.

**Required fixes:** remove the LAN rewrite; `npx expo install expo-constants` and align patch versions; add Play service account + submit profile; prepare listing/compliance; commit & push.

---

## Resident App — iOS

- **App name:** TAS-Kontrol Residente
- **Bundle identifier:** `com.taskontrol.residente`
- **Expo slug:** `tas-k-resident` · EAS project `65c9af8b-…` (`tas-kontrol`) ✅
- **Version / buildNumber:** `1.0.0` / `3` (app.json). `ios.infoPlist.ITSAppUsesNonExemptEncryption: false` set ✅ (skips export-compliance prompt).
- **Build profile:** `production` (store). No iOS-specific `submit` block, but TestFlight submission already done once (handoff).
- **Apple credentials:** configured — Team `WRJQ95R998`, ASC App ID `6776858543`, production IPA built + TestFlight submitted ✅. App Store Connect app **exists**.
- **App Tracking Transparency:** not used (no IDFA/tracking SDKs) — no ATT prompt needed.
- **Privacy manifest:** Expo SDK 54 auto-generates a baseline `PrivacyInfo.xcprivacy`; verify required-reason API declarations if Apple flags them.
- **Latest build:** production IPA `d1deebd2-…`, build 3, **finished** 2026-06-05.

**Apple App Store readiness:** **Almost ready** (technically through the pipeline; on TestFlight).

**Blockers:**
1. Same `normalizeServerUrl` LAN-rewrite bug as Android (shared screen) — would break real users and risks Apple "app is non-functional" rejection.
2. App Store listing not complete: screenshots (6.7"/6.5"/iPad if `supportsTablet`), description, keywords, subtitle, support URL, **App Privacy** answers, age rating, **privacy policy URL**.
3. Not yet submitted for **App Store review** (TestFlight ≠ public release).

**Required fixes:** remove LAN rewrite; complete App Store Connect metadata + App Privacy; submit for review (with approval).

---

## Environment and API Configuration

- **Production API URL:** Not hardcoded in either app — the backend is supplied at runtime (activation code for Resident, Settings field for Guard). No baked dev/prod default → no environment-mismatch risk **except** the Resident `normalizeServerUrl` override below.
- **Development URL risk — HIGH (Resident):** `mobile/app/(tabs)/index.tsx` forces hosts `localhost` / `127.0.0.1` / `179.63.252.22` → `192.168.1.51` (LAN). This is dev plumbing left in shippable code. **Remove before launch.**
- **Other URLs:** only protocol-normalization helpers (`http://` fallbacks) and a Settings placeholder string. No localhost defaults baked in.
- **Environment variables:** No `.env*` files anywhere; no `EXPO_PUBLIC_*` usage. Nothing to leak via bundling.
- **Secrets exposure:** **None found.** No Firebase files, no `google-services.json`/`GoogleService-Info.plist`, no API keys, no Supabase keys, no tokens in `.npmrc` (only `legacy-peer-deps=true`). Backend creds are server-side. ✅
- **Guard controller auth logging:** `mobile-guard/lib/api.ts` `openControllerDoor` logs credentials/headers, but `_layout.tsx` no-ops `console.*` when `!__DEV__`, so production is silenced. Low risk; recommended cleanup.

---

## Dependencies and Compatibility

- **Expo SDK:** 54 · **React Native:** 0.81.5 · **React:** 19.1.0 · **Node:** v20.20.0 · **package manager:** npm (legacy-peer-deps).
- **Guard expo-doctor:** ✅ 18/18 pass.
- **Resident expo-doctor:** ✖ 2 checks fail:
  - Missing peer dependency `expo-constants` (required by `expo-router`, and imported by `lib/push.ts`) → "may crash outside Expo Go". Fix: `npx expo install expo-constants`.
  - 6 patch-version mismatches: `expo` 54.0.33→54.0.35, `expo-asset`, `expo-linking`, `expo-notifications`, `expo-router`, `expo-updates`. Fix: `npx expo install --check`.
- **Native modules:** Guard uses `expo-camera`, `react-native-webview`, `react-native-tcp-socket`, `react-native-qrcode-svg`, `expo-speech`. Resident uses `react-native-webview`, `expo-notifications`, `react-native-reanimated`, `react-native-gesture-handler`. All EAS-build compatible; managed workflow (no committed `ios/`/`android/`), so EAS handles prebuild/CocoaPods.
- **Upgrade recommendation:** apply the patch alignment + `expo-constants` before the next production build. None are hard blockers (current builds finished), but the missing `expo-constants` is a real runtime risk worth fixing. Do **not** do a major SDK bump now.

---

## Store Listing Assets Needed

### Guard — Google Play
- App name, short description, full description
- Phone + tablet screenshots, 1024×500 feature graphic, 512×512 hi-res icon
- Privacy policy URL (app captures visitor/ID photos → must disclose)
- Data Safety answers (camera/photos, account data)
- Category, contact email, content rating questionnaire, target audience

### Resident — Google Play
- App name, short + full description
- Phone screenshots, feature graphic, hi-res icon
- Privacy policy URL (accounts + push tokens)
- Data Safety answers, category, contact email, content rating, target audience

### Resident — Apple App Store
- App name, subtitle, description, keywords
- Support URL, marketing URL (optional)
- Screenshots: 6.7" and 6.5" iPhone (+ 12.9" iPad, since `supportsTablet: true`)
- Privacy policy URL, App Privacy answers, age rating, review notes, demo account (login requires activation — provide a test account/server)

---

## Fix Plan

### Phase 1 — Critical blockers (prevent building/submitting)
1. **Guard ownership decision.** Either gain access to the `tashonduras` org for `jchavarriam`, OR re-point `mobile-guard/app.json` `owner`+`projectId` to a `tas-kontrol` project and re-run `eas init` + reconfigure Android credentials. _Requires your approval — changes the shipping account._
2. **Remove Resident LAN-rewrite bug** in `mobile/app/(tabs)/index.tsx` (`normalizeServerUrl`). Strip the `179.63.252.22`/localhost → `192.168.1.51` override (or gate behind `__DEV__`).
3. **Commit & push** the working tree: Guard `assets/`, `event-guests.tsx`, all config/version edits, Resident edits. Tag a launch baseline. (No deletion of anything.)

### Phase 2 — Store compliance (avoid rejection)
4. `npx expo install expo-constants` (Resident) and `npx expo install --check` to align patch versions; re-run `expo-doctor`.
5. Add `expo-camera` plugin with `cameraPermission` string (Guard) for an explicit usage description.
6. Confirm/clean Guard controller credential logging.
7. Prepare privacy policy URL(s) and Data Safety / App Privacy answers (photo capture, account data, push tokens).

### Phase 3 — Metadata & launch prep
8. Create/verify Play Console apps for both packages; create listings + assets (see above).
9. Complete App Store Connect metadata + screenshots + App Privacy for Resident iOS.
10. Add `submit` profiles to `eas.json`: Android `serviceAccountKeyPath` + `track`; iOS `appleId`/`ascAppId`/`appleTeamId`.

### Phase 4 — Build & submit (only after approval)
11. Rebuild after code fixes, then submit. Commands below.

---

## Exact Commands Needed Later

**Safe / read-only (no approval needed):**
```bash
# Resident
cd /opt/visitas-superadmin/taskmobileapps/mobile
npx expo install expo-constants
npx expo install --check
npx expo-doctor
eas build:list --limit 10
# Guard (only works after ownership is resolved)
cd ../mobile-guard
eas project:info
eas credentials   # interactive, read-only inspection
```

**Requires your approval (starts paid remote builds):**
```bash
# Resident Android production AAB
cd /opt/visitas-superadmin/taskmobileapps/mobile && npx eas build --platform android --profile production
# Resident iOS production IPA
cd /opt/visitas-superadmin/taskmobileapps/mobile && npx eas build --platform ios --profile production
# Guard Android production AAB (after ownership fix)
cd /opt/visitas-superadmin/taskmobileapps/mobile-guard && npx eas build --platform android --profile production
```

**Requires your approval (store submission):**
```bash
npx eas submit --platform android --profile production
npx eas submit --platform ios --profile production
```

---

## Questions / Missing Access

- **Expo `tashonduras` org:** Is Guard intentionally owned by `tashonduras`? Should `jchavarriam`/`tas-kontrol` be added, or should Guard be re-pointed to `tas-kontrol`? (Blocks all Guard EAS operations.)
- **Google Play Console:** Do apps already exist for `com.taskontrol.garita` and `com.taskontrol.residente`? Is a Play service-account JSON available for `eas submit`? — Unknown / needs access.
- **Apple App Store Connect:** Confirmed Resident app exists (ASC `6776858543`); need confirmation of who holds Admin/App Manager access for review submission.
- **Privacy policy URL(s):** Do public privacy policies exist for both apps? Required by both stores.
- **Backend/server:** Which production backend should the apps point to (the `179.63.252.22:4100` IP vs `taskontrol-saas.vercel.app`)? Needed to validate end-to-end and to remove the LAN override safely.
- **Demo account** for Apple review (login is gated by activation) — needed in review notes.
