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
