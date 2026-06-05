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
