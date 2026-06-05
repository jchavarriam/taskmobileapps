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
