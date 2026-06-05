# Guard + Resident Mobile Handoff

Date: 2026-06-04
Workspace: /opt/visitas-superadmin/superadmin-portal-dev6

## 1) GitHub Context

- Repository: jchavarriam/appsdevelop
- Remote name: origin
- Active branch: feature/billing
- Current state: dirty working tree with local changes and untracked files
- Security note: the configured remote URL includes an embedded GitHub token in local git config. Rotate token and migrate to SSH or credential helper.

## 2) Application Ownership Context

### Resident App

- Folder: [mobile](mobile)
- App name/slug: TAS-Kontrol Residente / tas-k-resident
- Expo owner: tas-kontrol
- EAS projectId: 65c9af8b-0ad6-4b21-a801-3e3277458af5
- OTA updates URL: https://u.expo.dev/65c9af8b-0ad6-4b21-a801-3e3277458af5

### Guard App

- Folder: [mobile-guard](mobile-guard)
- App name/slug: TASK-Garita / tas-k-guard
- Expo owner: tas-kontrol
- EAS projectId: f7e150c8-2f32-4970-99d0-776deb6a6c00
- OTA updates URL: https://u.expo.dev/f7e150c8-2f32-4970-99d0-776deb6a6c00

## 3) OTA / EAS Credentials Handoff

What exists in repo:
- Project IDs and update URLs in app config.
- Build profiles in eas.json.
- Build/update scripts in package.json.

What is not stored in repo (must be transferred by account owner/admin):
- Expo account login and organization permissions.
- EXPO_TOKEN for CI.
- EAS Secret values (if configured remotely).
- Android keystore access and credentials.
- Apple signing credentials and App Store Connect access.

Verification commands to run from each app folder:
- npx eas whoami
- npx eas project:info
- npx eas secret:list
- npx eas credentials
- npx eas branch:list
- npx eas channel:list

## 4) Resident App Source Map (iOS + Android)

Resident app is Expo managed workflow. There are no committed native ios/android folders in this repo at this time. Source is shared TypeScript/React Native via Expo Router.

Primary app routes/screens:
- [mobile/app/_layout.tsx](mobile/app/_layout.tsx)
- [mobile/app/index.tsx](mobile/app/index.tsx)
- [mobile/app/login.tsx](mobile/app/login.tsx)
- [mobile/app/activate.tsx](mobile/app/activate.tsx)
- [mobile/app/forgot-password.tsx](mobile/app/forgot-password.tsx)
- [mobile/app/reset-password.tsx](mobile/app/reset-password.tsx)
- [mobile/app/site-activation.tsx](mobile/app/site-activation.tsx)
- [mobile/app/(tabs)/_layout.tsx](mobile/app/(tabs)/_layout.tsx)
- [mobile/app/(tabs)/index.tsx](mobile/app/(tabs)/index.tsx)
- [mobile/app/(tabs)/visits.tsx](mobile/app/(tabs)/visits.tsx)
- [mobile/app/(tabs)/qr.tsx](mobile/app/(tabs)/qr.tsx)
- [mobile/app/(tabs)/log.tsx](mobile/app/(tabs)/log.tsx)

Core libraries:
- [mobile/lib/api.ts](mobile/lib/api.ts)
- [mobile/lib/auth.tsx](mobile/lib/auth.tsx)
- [mobile/lib/storage.ts](mobile/lib/storage.ts)
- [mobile/lib/push.ts](mobile/lib/push.ts)

Config files:
- [mobile/app.json](mobile/app.json)
- [mobile/eas.json](mobile/eas.json)
- [mobile/package.json](mobile/package.json)

## 5) Guard App Source Map (Android requested + iOS shared)

Guard app is Expo managed workflow. There are no committed native ios/android folders in this repo at this time. Source is shared TypeScript/React Native via Expo Router.

Primary app routes/screens:
- [mobile-guard/app/_layout.tsx](mobile-guard/app/_layout.tsx)
- [mobile-guard/app/index.tsx](mobile-guard/app/index.tsx)
- [mobile-guard/app/login.tsx](mobile-guard/app/login.tsx)
- [mobile-guard/app/home.tsx](mobile-guard/app/home.tsx)
- [mobile-guard/app/entry-code.tsx](mobile-guard/app/entry-code.tsx)
- [mobile-guard/app/exit-code.tsx](mobile-guard/app/exit-code.tsx)
- [mobile-guard/app/entry-no-code.tsx](mobile-guard/app/entry-no-code.tsx)
- [mobile-guard/app/entry-no-code-area.tsx](mobile-guard/app/entry-no-code-area.tsx)
- [mobile-guard/app/entry-no-code-sub-area.tsx](mobile-guard/app/entry-no-code-sub-area.tsx)
- [mobile-guard/app/entry-no-code-sector.tsx](mobile-guard/app/entry-no-code-sector.tsx)
- [mobile-guard/app/entry-no-code-name.tsx](mobile-guard/app/entry-no-code-name.tsx)
- [mobile-guard/app/entry-no-code-id.tsx](mobile-guard/app/entry-no-code-id.tsx)
- [mobile-guard/app/entry-no-code-summary.tsx](mobile-guard/app/entry-no-code-summary.tsx)
- [mobile-guard/app/wait-approval.tsx](mobile-guard/app/wait-approval.tsx)

Core libraries:
- [mobile-guard/lib/api.ts](mobile-guard/lib/api.ts)
- [mobile-guard/lib/auth.tsx](mobile-guard/lib/auth.tsx)
- [mobile-guard/lib/storage.ts](mobile-guard/lib/storage.ts)
- [mobile-guard/lib/photo-upload.ts](mobile-guard/lib/photo-upload.ts)

Config files:
- [mobile-guard/app.json](mobile-guard/app.json)
- [mobile-guard/eas.json](mobile-guard/eas.json)
- [mobile-guard/package.json](mobile-guard/package.json)

## 6) Latest Updates Snapshot

### Resident

Recent commits touching resident app:
- 44998b7 | 2026-02-27 | Promote dev6 snapshot as primary development baseline
- 3e19702 | 2026-02-19 | Add resident portal, mobile app, and admin activation code features

Current local changes in resident app:
- Modified: app.json, app/_layout.tsx, app/activate.tsx, app/login.tsx, lib/api.ts, package.json
- Untracked: .easignore, eas.json, app/forgot-password.tsx, app/reset-password.tsx, app/site-activation.tsx, lib/push.ts

High-signal resident additions:
- Push token registration and deactivation flow in [mobile/lib/push.ts](mobile/lib/push.ts).
- EAS/OTA scripts in [mobile/package.json](mobile/package.json).

### Guard

- Path currently appears untracked at repository level on this branch, so no branch-local commit history is available for mobile-guard in this checkout.
- Guard source and configs are present in [mobile-guard](mobile-guard).

High-signal guard implementation note:
- Controller door open logic in [mobile-guard/lib/api.ts](mobile-guard/lib/api.ts) includes verbose debug logs that currently print credentials/auth headers; sanitize before production release.

## 7) Risk and Security Notes

- Rotate GitHub token exposed in local remote URL.
- Review and remove sensitive logging from guard controller authentication path.
- Confirm EAS secrets and signing ownership are transferred to the target owner account.
- Confirm OTA branch/channel strategy and runtimeVersion compatibility before publishing updates.

## 8) Transfer Checklist

- Confirm GitHub access: repo permissions, protected branches, and CI secrets.
- Confirm Expo org access for tas-kontrol and both project IDs.
- Export/transfer Android keystores and credential passwords.
- Confirm Apple team roles and signing material for iOS builds.
- Validate build + OTA in both apps:
  - Resident: preview Android, preview iOS, production Android, production iOS, OTA update.
  - Guard: production Android build and OTA behavior.
- Remove secret-bearing logs and rotate any exposed secrets.
- Tag baseline handoff commit after cleanup.

## 9) Quick Commands

Resident app:
- cd mobile
- npm install
- npm run start
- npm run android
- npm run ios
- npm run eas:build:production:android
- npm run eas:build:production:ios
- npm run eas:update

Guard app:
- cd mobile-guard
- npm install
- npm run start
- npm run android
- npm run ios
- npx eas build --platform android --profile production

## 10) 2026-06-04 Verified Outcomes (Post-Handoff)

This section captures execution results after the initial handoff was written.

- Resident Android prebuild failures were fixed by replacing corrupted PNG assets in `mobile/assets`:
  - `adaptive-icon.png`
  - `favicon.png`
  - `icon.png`
  - `splash.png`
- Resident Android preview build succeeded:
  - Build ID: `e3e21d72-57e4-482f-bee9-a76505968599`
  - Artifact: APK (internal distribution)
- Resident iOS preview build succeeded:
  - Build ID: `ba57f394-b45d-452c-bbbe-b8d174d5ebda`
- iOS production credentials were configured and validated for TestFlight:
  - Bundle ID: `com.taskontrol.residente`
  - Apple Team ID: `WRJQ95R998`
  - ASC App ID: `6776858543`
  - Production profile ID: `BP5543956C`
- Resident iOS production build succeeded:
  - Build ID: `67384fb8-7fa9-499e-8cdc-f42e4c2887f9`
  - Artifact: IPA (store distribution)
- TestFlight submission completed successfully:
  - Submission ID: `f26d9e19-3b58-46ff-8812-8bf0904dc509`

Operational note:
- If TestFlight prompts for a redeem code, use the invitation email/link (`Start Testing`) with the same invited Apple ID instead of entering a manual code.
