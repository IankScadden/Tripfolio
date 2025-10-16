# TripBudget - Backpacking Budget Planner

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
7. **Dark Mode**: Full light/dark theme support

### Data Model
- **Users**: id (sub from OIDC), email, firstName, lastName, profileImageUrl
- **Trips**: id, userId, name, startDate, endDate, days, shareId, favorite (integer: 0 or 1)
- **Expenses**: id, tripId, category, description, cost, url, date
- **Sessions**: sid, sess, expire (for Replit Auth)

### Categories
- Flights
- Intercity Transportation (trains between cities)
- Local Transportation (buses, metro within cities)
- Accommodation
- Food
- Activities

## Recent Changes
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
