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
1. **User Authentication**: Sign in with Replit Auth (supports Google, GitHub, email/password)
2. **Trip Management**: Create, view, and organize multiple trip projects (user-specific)
3. **Expense Tracking**: Add expenses in 6 categories with description, cost, optional URL links, and dates
4. **Budget Visualization**: Interactive pie chart showing cost breakdown by category
5. **Trip Sharing**: Generate shareable links for read-only trip views
6. **Dark Mode**: Full light/dark theme support

### Data Model
- **Users**: id (sub from OIDC), email, firstName, lastName, profileImageUrl
- **Trips**: id, userId, name, startDate, endDate, days, shareId
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
- 2024-10-08: Added Replit Auth integration with user authentication
- 2024-10-08: Migrated from in-memory storage to PostgreSQL database
- 2024-10-08: Updated all routes to require authentication and filter by user
- 2024-10-08: Added landing page for logged-out users
- 2024-10-08: Added logout functionality to trip pages
- 2024-10-03: Initial application setup with full frontend prototype
- 2024-10-03: Implemented backend API routes for trips and expenses
- 2024-10-03: Connected frontend to backend with real data fetching

## API Routes

### Authentication Routes
- `GET /api/login` - Initiate Replit Auth login flow
- `GET /api/callback` - OAuth callback handler
- `GET /api/logout` - Log out user
- `GET /api/auth/user` - Get current user (requires auth)

### Trip Routes (all require authentication)
- `GET /api/trips` - Get all trips for current user
- `GET /api/trips/:id` - Get trip by ID
- `POST /api/trips` - Create new trip
- `PATCH /api/trips/:id` - Update trip
- `DELETE /api/trips/:id` - Delete trip

### Expense Routes (all require authentication)
- `GET /api/trips/:tripId/expenses` - Get expenses for a trip
- `POST /api/expenses` - Create expense
- `PATCH /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense

### Public Routes
- `GET /api/share/:shareId` - Get shared trip view (no auth required)

## User Preferences
- Design inspired by Airbnb (warm travel aesthetics) and Notion (clean data organization)
- Primary color: Deep travel blue (210 85% 45%)
- Category colors mapped to chart colors for visual consistency

## Future Vision
- Public trip discovery/search by destination
- Blog-style trip posts with stories and photos
- Community browsing of other users' trip budgets
- Social features for inspiration and collaboration
