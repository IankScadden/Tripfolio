# Tripfolio - Backpacking Budget Planner

## Overview
Tripfolio is a web application designed for planning and tracking backpacking trip budgets. It enables users to create detailed trip plans, itemize expenses across various categories like flights, accommodation, and activities, visualize spending patterns through interactive charts, and share their budget plans with others. The project aims to provide a comprehensive, user-friendly tool for travelers to manage their finances effectively, drawing inspiration from leading travel and productivity platforms.

## User Preferences
- Home page design based on user's Figma mockup with travel-themed hero image and feature cards.
- Public-first approach: Beautiful landing page visible to all visitors, login only when needed.
- Design inspired by Airbnb (warm travel aesthetics), Notion (clean data organization), and Instagram/blog aesthetics for visual storytelling.
- Primary color: Deep travel blue (210 85% 45%).
- Category colors mapped to chart colors for visual consistency.
- Shared Header component with conditional rendering: "Sign In" for visitors, nav links for authenticated users.
- Blog-post style for trip sharing: Hero images, descriptions, photo galleries, hashtags, and collapsible budget breakdowns.

## System Architecture
The application is built with a modern web stack, emphasizing a rich user experience and robust data management.

### Tech Stack
- **Frontend**: React, TypeScript, Wouter (routing), TanStack Query (data fetching), Shadcn UI, Tailwind CSS, Recharts
- **Backend**: Express.js, TypeScript, Passport.js (Replit Auth)
- **Database**: PostgreSQL (Neon)

### Core Features
- **Public Landing Page**: Engaging entry point for all visitors.
- **Smart Authentication**: Login required only for privileged actions like trip creation or community exploration.
- **Trip Management**: Comprehensive tools for creating, viewing, and organizing user-specific trip projects.
- **Post Trip**: Social media-style publishing feature where users add cover images, trip stories, hashtags, and photo galleries to share trips with the community. Trips remain in My Trips and become visible in Explore.
- **Expense Tracking**: Detailed expense entry across 7 categories with descriptions, costs, optional links, and dates.
- **Budget Visualization**: Interactive pie charts for clear expense breakdown by category.
- **Trip Sharing**: Generation of shareable, read-only links for trip budgets.
- **Day-by-Day Planning**: Detailed itinerary planning with automatic expense synchronization, including multi-day lodging and flexible transportation entries.
- **Community Exploration**: Browse public trip budgets by destination/name as a practical research tool for planning. Features beautiful cards with hero images, descriptions, and hashtags.
- **Trip Cloning**: Copy entire trip structures (expenses + itinerary) as templates for personal planning.
- **User Profiles**: Customizable display names shown on public trips, manageable via Profile Settings page.
- **Dark Mode**: Full support for light and dark themes.

### Data Model
- **Users**: Stores essential user information for authentication and personalization.
- **Trips**: Manages trip details, associated user, dates, and shareable IDs.
- **Expenses**: Records individual expenses with category, cost, description, and linkage to specific trip days.
- **DayDetails**: Captures daily itinerary specifics, destinations, and local notes.
- **Sessions**: Handles user session management for authentication.

### Categories
- Flights
- City to City Transportation
- Local Transportation
- Accommodation
- Food
- Activities
- Other Costs

## External Dependencies
- **Replit Auth**: Utilized for secure user authentication via OpenID Connect.
- **Neon (PostgreSQL)**: Serves as the primary relational database for persistent data storage.
- **Shadcn UI**: Provides pre-built, accessible UI components.
- **Tailwind CSS**: Utility-first CSS framework for styling.
- **Recharts**: JavaScript charting library for data visualization.