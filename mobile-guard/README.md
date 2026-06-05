# TAS-Kontrol Residente - Mobile App

React Native mobile application for TAS-Kontrol residents, built with Expo.

## Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (for Mac) or Android Studio (for Android development)

## Setup

1. Install dependencies:
```bash
cd mobile
npm install
```

2. Start the development server:
```bash
npm start
```

3. Run on a device/simulator:
```bash
npm run ios     # iOS simulator
npm run android # Android emulator
npm run web     # Web browser
```

## Project Structure

```
mobile/
├── app/                    # Expo Router file-based routing
│   ├── _layout.tsx        # Root layout with auth provider
│   ├── index.tsx          # Entry point (redirects based on auth)
│   ├── activate.tsx       # Activation screen
│   ├── login.tsx          # Login screen
│   └── (tabs)/            # Tab navigation
│       ├── _layout.tsx    # Tab layout
│       ├── index.tsx      # Home screen
│       ├── visits.tsx     # Visits screen
│       ├── qr.tsx         # QR code screen
│       └── log.tsx        # Log screen
├── lib/
│   ├── storage.ts         # AsyncStorage helpers
│   ├── api.ts             # API client
│   └── auth.tsx           # Auth context provider
├── app.json               # Expo configuration
├── package.json
└── tsconfig.json
```

## Features

### Phase 1 (Current)
- ✅ Activation code flow
- ✅ Login/logout
- ✅ Tab navigation
- ✅ Placeholder screens

### Future Phases
- Create visitor requests
- Generate temporary QR codes
- View sector logs
- Receive notifications
- View community information

## Activation Flow

1. Resident receives activation code via email
2. Downloads the app
3. Enters activation code (which contains server URL)
4. Sets a new password
5. App auto-configures server connection
6. Logs in automatically

## API Integration

The app communicates with the TAS-Kontrol backend:
- `/api/resident/activate` - Activation endpoint
- `/api/resident/auth/login` - Login endpoint

Server URL is extracted from the activation code and stored locally.
