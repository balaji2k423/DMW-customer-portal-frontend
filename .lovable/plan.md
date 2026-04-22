
# DMW Robotics — Enterprise B2B Customer Portal

A high-fidelity, demo-ready customer portal for a robotics company. Mock data throughout, a working (UI-only) login gate, light + dark themes, and a balanced futuristic-corporate aesthetic.

## Design system
- **Palette (light):** background `#FFFFFF`, deep industrial blue `#0B1F3A` for primary surfaces/text, steel grey `#E5E7EB` borders/dividers, electric blue `#2563EB` accent, restrained orange `#FF6A00` for highlights only, status greens/ambers/reds.
- **Palette (dark):** navy `#0B1F3A` base, elevated panels in slightly lighter navy, electric blue glow accents, soft-white text.
- **Typography:** Inter — bold headers, medium labels, light metadata. Tight, executive hierarchy.
- **Components:** elevated cards (12px radius, soft shadows), thin-line Lucide icons, status chips, glass header (subtle blur), animated progress bars, hover elevation, fade/slide transitions.
- **Theme toggle** in the top bar; persisted to localStorage.

## Screens

### 1. Login (`/login`)
Split layout: form left, atmospheric robotic-arm visual right with soft gradient overlay and subtle 3D accent. Email + password, "Forgot password" link, shield icon with "Secure Login (MFA enabled)". Glow on focus. Any credentials log you in (mock auth via localStorage).

### 2. Dashboard (`/`) — hero screen
- **Project status banner:** "Commissioning Phase – In Progress" with animated % progress bar.
- **KPI row (4 cards):** Overall Progress, Next Milestone (with date), Open Tickets, Documents Updated.
- **Main panels:** Milestone Preview card, Recent Activity timeline, Open Tickets summary.
- **Quick Actions:** prominent buttons — View Milestones, Open Documents, Raise Ticket.
- Smooth hover lift, subtle micro-interactions, animated counters.

### 3. Milestones (`/milestones`)
Horizontal stepper timeline + detailed milestone cards: name, planned vs actual dates, status chip (Completed / In Progress / Pending), owner avatar, deliverables (file icons), customer sign-off badge.

### 4. Documents (`/documents`)
Folder categories sidebar: Commercials, Manuals, Drawings, Commissioning Reports. Table view (with grid toggle): Name, Version, Updated, Owner, Actions. Sticky header, search bar with filter chips, file-type icons, hover-reveal preview/download actions.

### 5. Support Tickets (`/tickets`, `/tickets/:id`)
- **List:** ID, Title, Priority badge, Status, Last Updated. "+ Raise New Ticket" primary CTA top-right.
- **Detail:** chat-style conversation thread, attachments, assigned engineer avatar, SLA timer badge.

### 6. Notifications (`/notifications`)
Bell dropdown in header (badge + pulse animation) showing recent updates. Full page with vertical activity timeline grouped by day: milestone updates, document uploads, ticket changes.

### 7. Profile (`/profile`)
Lighter screen: avatar, company info, contact, notification preferences, theme toggle, logout.

## Layout & navigation
- Collapsible left sidebar (Dashboard, Milestones, Documents, Tickets, Notifications, Profile) with thin-line icons; active item shows glowing blue indicator bar.
- Glass-effect top bar: minimal metallic DMW Robotics wordmark, search, theme toggle, notification bell with badge, user avatar dropdown.
- Desktop-first 1440px grid, generous whitespace; gracefully responsive down to tablet.

## Polish & micro-interactions
- Card hover elevation, animated progress bars, fade/slide route transitions, notification pulse, button glow on hover, skeleton loaders on first paint, thoughtful empty states for each module.

## Mock data
Realistic robotics-industry seed data: a sample commissioning project, ~6 milestones, ~12 documents across folders, ~5 tickets (one with full chat thread), ~10 notifications, one demo user account.

## Out of scope (per brief)
No OEE dashboards, advanced analytics, ERP integrations, payments, or integrator portal.
