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
- **Frontend**: React, TypeScript, Wouter (routing), TanStack Query (data fetching), Shadcn UI, Tailwind CSS, Recharts, Clerk (authentication)
- **Backend**: Express.js, TypeScript, Clerk Express SDK (authentication)
- **Database**: PostgreSQL (Neon)

### Admin Configuration
- **Admin Email**: ian@tripfolio.ai is automatically granted admin privileges via Clerk webhook
- Admin users can delete any public trip from the Explore page
- Admin status is set automatically when a user with the admin email signs in (both new and existing accounts)

### Core Features
- **Public Landing Page**: Engaging entry point for all visitors.
- **Smart Authentication**: Login required only for privileged actions like trip creation or community exploration.
- **Trip Management**: Comprehensive tools for creating, viewing, and organizing user-specific trip projects.
- **Post Trip**: Social media-style publishing feature where users add cover images, trip stories, hashtags, and photo galleries to share trips with the community. Trips remain in My Trips and become visible in Explore.
- **Expense Tracking**: Detailed expense entry across 7 categories with descriptions, costs, optional links, and dates.
- **Budget Tracking**: Trip budget input with automatic remaining budget calculation (budget - total cost) visible only in My Trips. Color-coded display (green for positive, red for negative) helps users monitor their spending. Budget data is private and not shown in shared links or public views.
- **Budget Visualization**: Interactive pie charts for clear expense breakdown by category.
- **Trip Sharing**: Generation of shareable, read-only links for trip budgets (shared links display trip details without social engagement features).
- **Day-by-Day Planning**: Detailed itinerary planning with automatic expense synchronization, including multi-day lodging (supports both date-based and nights-based entry for flexible trip planning), flexible transportation entries, and daily notes section for personal reminders and trip planning thoughts.
- **Community Exploration**: Browse public trip budgets by destination/name as a practical research tool for planning. Features beautiful cards with hero images, descriptions, and hashtags.
- **Trip Cloning**: Copy entire trip structures (expenses + itinerary) as templates for personal planning.
- **User Profiles**: Customizable display names, bios, and profile pictures shown on public trips, manageable via Profile Settings page.
- **Public Profiles**: View other users' profiles showing their name, bio, profile picture, and all their public trips. Accessible by clicking usernames throughout the app.
- **Social Engagement**: Like and comment system for public trips. Users can like trips (with toggle functionality), post comments, and view engagement counts. All interactions require authentication.
- **Unpost Feature**: Users can unpublish their own trips from their public profile. Unpost button appears in top-left of trip cards on the user's own profile. Unpublishing sets isPublic to false, removing the trip from Explore and public view while keeping it in My Trips.
- **Admin Moderation**: Designated admin users can delete any public trip from the Explore page. Delete button appears only for admins in the top-left corner of trip cards. Authorization enforced at both UI and API levels.
- **My Map**: Interactive 2D map embedded directly on profile pages showing user's traveled locations via pins. Users can click anywhere on their own map to drop pins marking places they've visited. All maps are publicly viewable (read-only for others) for travel inspiration. Features Leaflet integration with CartoDB Voyager tiles (English labels), reverse geocoding via LocationIQ API, simplified location names (US: "City, State, USA", International: "City, Country"), no infinite horizontal wrapping, and full CRUD operations with ownership verification.
- **File Upload**: Comprehensive file upload system for profile pictures and trip images. Users can upload images from their local drive using the Uppy file uploader interface. Upload buttons appear next to URL inputs in Profile Settings (for profile pictures) and Post Trip page (for header images and photo gallery). Backend uses Replit App Storage with ACL policies for secure, authenticated file storage. Uploaded files are stored as object paths (/objects/<uuid>) and served via dedicated API routes.
- **Dark Mode**: Full support for light and dark themes.

### Data Model
- **Users**: Stores essential user information with Clerk ID linkage for authentication and personalization.
- **Trips**: Manages trip details, associated user, dates, shareable IDs, and budget (optional, private).
- **Expenses**: Records individual expenses with category, cost, description, and linkage to specific trip days.
- **DayDetails**: Captures daily itinerary specifics, destinations, local transport notes, and daily notes for personal reminders.
- **Likes**: Tracks user likes on public trips with unique constraint preventing duplicate likes (tripId, userId).
- **Comments**: Stores user comments on public trips with content, timestamps, and user attribution.
- **TravelPins**: Stores user-dropped map pins with latitude/longitude (decimal precision), location names (via reverse geocoding), and user attribution. Publicly viewable for all users.

### Categories
- Flights
- City to City Transportation
- Local Transportation
- Accommodation
- Food
- Activities
- Other Costs

## External Dependencies
- **Clerk**: Production-grade authentication platform for user management with webhook support.
- **Neon (PostgreSQL)**: Serves as the primary relational database for persistent data storage.
- **Replit App Storage**: Cloud object storage for uploaded images with ACL policy management.
- **Shadcn UI**: Provides pre-built, accessible UI components.
- **Tailwind CSS**: Utility-first CSS framework for styling.
- **Recharts**: JavaScript charting library for data visualization.
- **Leaflet**: Interactive mapping library with OpenStreetMap tiles for the My Map feature.
- **LocationIQ API**: Reverse geocoding service to convert coordinates into location names.
- **Uppy**: File uploader library for client-side file selection and upload with progress tracking.