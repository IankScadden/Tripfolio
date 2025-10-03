# TripBudget - Backpacking Budget Planner

## Overview
A web application for planning and tracking backpacking trip budgets. Users can create trips, add itemized expenses across multiple categories (flights, transportation, accommodation, food, activities), visualize their spending with charts, and share their trip budgets with friends.

## Project Architecture

### Tech Stack
- **Frontend**: React, TypeScript, Wouter (routing), TanStack Query (data fetching), Shadcn UI, Tailwind CSS, Recharts
- **Backend**: Express.js, TypeScript
- **Storage**: In-memory storage (MemStorage)

### Key Features
1. **Trip Management**: Create, view, and organize multiple trip projects
2. **Expense Tracking**: Add expenses in 6 categories with description, cost, optional URL links, and dates
3. **Budget Visualization**: Interactive pie chart showing cost breakdown by category
4. **Trip Sharing**: Generate shareable links for read-only trip views
5. **Dark Mode**: Full light/dark theme support

### Data Model
- **Trips**: name, startDate, endDate, days, shareId
- **Expenses**: tripId, category, description, cost, url, date

### Categories
- Flights
- Intercity Transportation (trains between cities)
- Local Transportation (buses, metro within cities)
- Accommodation
- Food
- Activities

## Recent Changes
- 2024-10-03: Initial application setup with full frontend prototype
- 2024-10-03: Implemented backend API routes for trips and expenses
- 2024-10-03: Connected frontend to backend with real data fetching

## API Routes
- `GET /api/trips` - Get all trips
- `GET /api/trips/:id` - Get trip by ID
- `POST /api/trips` - Create new trip
- `PATCH /api/trips/:id` - Update trip
- `DELETE /api/trips/:id` - Delete trip
- `GET /api/trips/:tripId/expenses` - Get expenses for a trip
- `POST /api/expenses` - Create expense
- `PATCH /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense
- `GET /api/share/:shareId` - Get shared trip view

## User Preferences
- Design inspired by Airbnb (warm travel aesthetics) and Notion (clean data organization)
- Primary color: Deep travel blue (210 85% 45%)
- Category colors mapped to chart colors for visual consistency
