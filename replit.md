# Tripfolio - Backpacking Budget Planner

## Overview
A web application for planning and tracking backpacking trip budgets. Users can create trips, add itemized expenses across multiple categories (flights, transportation, accommodation, food, activities), visualize their spending with charts, and share their trip budgets with friends.

## Project Architecture

### Tech Stack
- **Frontend**: React, TypeScript, Wouter (routing), TanStack Query (data fetching), Shadcn UI, Tailwind CSS, Recharts
- **Backend**: Express.js, TypeScript, Passport.js (Replit Auth)
- **Database**: PostgreSQL (Neon)
- **Authentication**: Replit Auth (OpenID Connect)

### Key Features
1. **Public Landing Page**: "Budget Your Dream Trip" page visible to all visitors
2. **Smart Authentication**: Login only required when creating trips or exploring community
3. **Trip Management**: Create, view, and organize multiple trip projects (user-specific)
4. **Expense Tracking**: Add expenses in 6 categories with description, cost, optional URL links, and dates
5. **Budget Visualization**: Interactive pie chart showing cost breakdown by category
6. **Trip Sharing**: Generate shareable links for read-only trip views
7. **Day-by-Day Planning**: Detailed daily itinerary planning with automatic expense sync
8. **Dark Mode**: Full light/dark theme support

### Data Model
- **Users**: id (sub from OIDC), email, firstName, lastName, profileImageUrl
- **Trips**: id, userId, name, startDate, endDate, days, shareId, favorite (integer: 0 or 1)
- **Expenses**: id, tripId, category, description, cost, url, date, dayNumber (links expense to specific day)
- **DayDetails**: id, tripId, dayNumber, destination, localTransportNotes, foodBudgetAdjustment, stayingInSameCity, intercityTransportType
- **Sessions**: sid, sess, expire (for Replit Auth)

### Categories
- Flights
- City to City Transportation (trains between cities)
- Local Transportation (buses, metro within cities)
- Accommodation
- Food
- Activities
- Other Costs (miscellaneous expenses)

## Recent Changes
- 2024-10-17: **Fixed Multi-Day Lodging Date Defaulting** - When clicking "Add Lodging" from a specific day, check-in now auto-fills with that day's date and check-out defaults to 2 days later (2 nights). This ensures lodging appears on the expected days. Also fixed TripCalendar date calculation bug that caused invalid dates across month boundaries (e.g., "2025-10-32").
- 2024-10-17: **Added Multi-Day Lodging Editing Feature** - Users can now edit existing multi-day lodging bookings to change dates, costs, or details. The system detects consecutive days with the same lodging name around the current day and displays an "Edit" button that pre-populates the booking form. **Selective Deletion Logic**: When editing, backend only deletes the specific day numbers from the original consecutive booking block (using dayNumbersToDelete parameter), enabling users to book the same hotel multiple times (e.g., days 1-5 AND days 8-10) without data loss. When creating new bookings, deletes only overlapping days with the same lodging name. Frontend uses useMemo to prevent infinite rendering loops and refetchQueries for immediate cache updates. Supports shortening, lengthening, or shifting date ranges. Users can independently manage multiple bookings of the same accommodation.
- 2024-10-17: **Added Multi-Day Lodging Feature** - Users can book lodging for multiple consecutive days at once via "Add Lodging" button, which opens a dialog to specify check-in/check-out dates, total cost, and lodging name. The system automatically calculates nightly rate and creates accommodation expenses for each night, auto-populating lodging across the date range. Backend uses nightsData array to skip nights exceeding trip duration, preventing null dayNumber values. Works for both date-based trips (calculates from startDate) and day-count trips (uses startDayNumber from frontend).
- 2024-10-17: **Fixed Timezone Display Bugs** - Resolved date parsing issues in TripCalendar and DayDetail that caused dates to display one day earlier than actual by using local timezone parsing instead of UTC
- 2024-10-17: **Added Edit Trip Feature** - Users can now edit trip duration and dates via pencil icon button next to trip info, which updates the day-by-day calendar layout accordingly
- 2024-10-17: Updated My Trips banner with world map background image and blue-to-teal gradient (#4F75FF → #5B9FD8 → #4DD0E1)
- 2024-10-17: **Fixed Category ID Mismatch Bugs** - DayDetail now uses correct category IDs: "local" (was "local_transport") and "intercity" (was "city_to_city_transport") to match TripDetail expectations
- 2024-10-17: **Implemented Day-by-Day Planning Feature** - Full itinerary planning system with TripCalendar and DayDetail modals
- 2024-10-17: Added dayDetails table and dayNumber field to expenses for day-specific tracking
- 2024-10-17: Created GET /api/trips/:tripId/day-details/:dayNumber and POST /api/trips/:tripId/day-details routes
- 2024-10-17: Day detail sections (lodging, activities, intercity transport) auto-create expenses linked to specific days
- 2024-10-17: Calendar supports both date-based trips (shows actual dates) and day-count trips (shows "Day 1, 2, 3...")
- 2024-10-17: Added navigation between days in day detail modal (Previous/Next buttons)
- 2024-10-17: Local transportation is notes-only in day-by-day view (no expense created)
- 2024-10-17: Food budget adjustment per day adds to the daily food budget calculation
- 2024-10-17: "Staying in same city" button hides intercity transport section and clears related data
- 2024-10-17: Added new "Other Costs" category for miscellaneous expenses with DollarSign icon
- 2024-10-17: Updated transportation category labels: "Main Transportation" → "City to City Transportation", "Local Transport" → "Local Transportation"
- 2024-10-17: Renamed "Expand Trip" button to "Day by Day Layout" on trip detail page
- 2024-10-16: Added trip sharing feature - share button on trip cards generates public shareable links
- 2024-10-16: Created SharedTrip public page at /share/:shareId for read-only trip views
- 2024-10-16: Added POST /api/trips/:id/share endpoint to generate/retrieve shareId
- 2024-10-16: Redesigned trip card actions - replaced three-dot menu with three visible buttons (star, share, delete)
- 2024-10-16: Performance optimization - reduced trips list load time from 3-6s to ~1s (N+1 to 2 queries)
- 2024-10-16: Improved shareId generation to use crypto.randomUUID for consistency and security
- 2024-10-16: Added clipboard fallback for share functionality (shows link in toast if clipboard unavailable)
- 2024-10-15: Added three-dot menu to trip cards for deleting trips - menu positioned next to star button
- 2024-10-15: Improved create trip flow - Home page "Create New Trip" button now opens dialog directly (no intermediate navigation)
- 2024-10-15: Redesigned My Trips page with Figma designs - gradient hero section, blue-focused color scheme
- 2024-10-15: Added favorite trips feature - star button to favorite/unfavorite, favorites appear first in list
- 2024-10-15: Added "Upcoming" badge for trips starting today or in the future
- 2024-10-15: Added expense category counts to trip cards (flights, accommodation, activities)
- 2024-10-15: Added PATCH /api/trips/:id/favorite endpoint for toggling favorites
- 2024-10-10: Updated landing flow - Home page now visible to all visitors, login only required for actions
- 2024-10-10: Header conditionally shows "Sign In" or "Logout" based on authentication state
- 2024-10-10: CTA buttons check authentication before navigating to protected pages
- 2024-10-10: Implemented new Home page design from user's Figma mockup (hero section, feature cards, CTAs)
- 2024-10-10: Restructured routing: "/" for Home (public), "/my-trips" for trips list, "/explore" for community (placeholder)
- 2024-10-08: Added Replit Auth integration with user authentication
- 2024-10-08: Migrated from in-memory storage to PostgreSQL database
- 2024-10-08: Updated all routes to require authentication and filter by user
- 2024-10-08: Added landing page for logged-out users
- 2024-10-03: Initial application setup with full frontend prototype
- 2024-10-03: Implemented backend API routes for trips and expenses
- 2024-10-03: Connected frontend to backend with real data fetching

## API Routes

### Authentication Routes
- `GET /api/login` - Initiate Replit Auth login flow
- `GET /api/callback` - OAuth callback handler
- `GET /api/logout` - Log out user
- `GET /api/auth/user` - Get current user (requires auth)

### Page Routes
- `/` - Home page (public) - Hero section with features and CTAs, visible to all visitors
- `/my-trips` - Trips list page (auth required) - View and manage all trips
- `/trip/:id` - Trip detail page (auth required) - View and edit trip with expenses
- `/explore` - Explore/community page (placeholder) - Future social features
- `/share/:shareId` - Public shared trip view (no auth required)

### Trip API Routes (all require authentication)
- `GET /api/trips` - Get all trips for current user (includes expense counts by category)
- `GET /api/trips/:id` - Get trip by ID
- `POST /api/trips` - Create new trip
- `PATCH /api/trips/:id` - Update trip
- `PATCH /api/trips/:id/favorite` - Toggle favorite status of a trip
- `POST /api/trips/:id/share` - Generate/retrieve shareId for trip sharing
- `DELETE /api/trips/:id` - Delete trip

### Expense Routes (all require authentication)
- `GET /api/trips/:tripId/expenses` - Get expenses for a trip
- `POST /api/expenses` - Create expense
- `PATCH /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense

### Day Details Routes (all require authentication)
- `GET /api/trips/:tripId/day-details/:dayNumber` - Get day detail for a specific day
- `POST /api/trips/:tripId/day-details` - Save/update day detail (auto-syncs to expenses)
- `POST /api/trips/:tripId/lodging/bulk` - Create multi-day lodging across date range (auto-calculates nightly rate)

### Public Routes
- `GET /api/share/:shareId` - Get shared trip view (no auth required)

## Design & User Preferences
- Home page design based on user's Figma mockup with travel-themed hero image and feature cards
- Public-first approach: Beautiful landing page visible to all visitors, login only when needed
- Design inspired by Airbnb (warm travel aesthetics) and Notion (clean data organization)
- Primary color: Deep travel blue (210 85% 45%)
- Category colors mapped to chart colors for visual consistency
- Shared Header component with conditional rendering: "Sign In" for visitors, nav links for authenticated users

## Future Vision
- Public trip discovery/search by destination
- Blog-style trip posts with stories and photos
- Community browsing of other users' trip budgets
- Social features for inspiration and collaboration
