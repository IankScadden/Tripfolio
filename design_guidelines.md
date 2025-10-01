# Design Guidelines: Backpacking Budget Planner

## Design Approach

**Selected Approach:** Reference-Based (Travel/Productivity Hybrid)

Drawing inspiration from **Airbnb** (warm, travel-focused aesthetics) and **Notion** (clean data organization). This combines the approachable, adventure-oriented feel of travel platforms with the clarity and efficiency of productivity tools.

**Key Principles:**
- Clarity First: Budget data must be instantly scannable
- Travel Context: Warm, inviting aesthetics that inspire planning
- Efficiency: Quick data entry with minimal friction
- Shareable Polish: Outputs look presentation-ready

---

## Core Design Elements

### A. Color Palette

**Light Mode:**
- Primary Brand: 210 85% 45% (Deep travel blue - evokes adventure)
- Primary Hover: 210 85% 38%
- Background: 0 0% 100%
- Surface: 210 30% 98%
- Border: 210 20% 90%
- Text Primary: 215 25% 15%
- Text Secondary: 215 15% 45%

**Dark Mode:**
- Primary Brand: 210 75% 55%
- Primary Hover: 210 75% 48%
- Background: 220 15% 10%
- Surface: 220 12% 14%
- Border: 220 10% 22%
- Text Primary: 210 20% 95%
- Text Secondary: 210 15% 70%

**Chart Colors (Category-specific):**
- Flights: 25 85% 55% (Warm orange)
- Transportation: 45 90% 50% (Golden yellow)
- Accommodation: 150 60% 45% (Teal)
- Food: 0 70% 55% (Red-orange)
- Activities: 270 60% 55% (Purple)

---

### B. Typography

**Font Families:**
- Display/Headings: 'Inter' (clean, modern, travel-friendly)
- Body/UI: 'Inter' (consistency across interface)

**Scale:**
- Hero/Page Titles: text-4xl font-bold (36px)
- Section Headers: text-2xl font-semibold (24px)
- Card Titles: text-lg font-semibold (18px)
- Body Text: text-base font-normal (16px)
- Labels: text-sm font-medium (14px)
- Captions/Meta: text-xs text-muted (12px)

---

### C. Layout System

**Spacing Primitives:** 2, 4, 6, 8, 12, 16, 24

**Common Patterns:**
- Component padding: p-6
- Section spacing: space-y-8
- Card gaps: gap-6
- Form field spacing: space-y-4
- Button padding: px-6 py-3
- Container max-width: max-w-6xl

---

### D. Component Library

**1. Trip Dashboard**
- Card-based layout with trip header (name, dates, destination count)
- Quick stats bar: Total Budget | Days | Cities
- Category sections in accordion-style expandable panels
- Prominent "Add Item" buttons within each category
- Floating action button for quick expense entry

**2. Budget Entry Forms**
- Inline editing within category cards
- Fields per item: Description, Cost (currency input), Date/Night, URL (optional link)
- Smart defaults: Daily food budget suggests per-day calculation
- Real-time total updates with smooth number transitions

**3. Data Visualization**
- Interactive donut chart (center shows total)
- Legend with category names, amounts, and percentages
- Hover states reveal detailed breakdowns
- Responsive: chart scales to container, legend stacks on mobile

**4. Item Cards**
- Category icon + color coding (left accent)
- Two-column layout: Details left, Cost right (prominent)
- Link indicators with external icon
- Edit/delete actions on hover (desktop) or always visible (mobile)

**5. Trip Header**
- Large trip name (editable inline)
- Date range display with calendar icon
- Total cost as hero number with currency symbol
- Share button (prominent, top-right) with copy link functionality

**6. Sharing View (Read-only)**
- Polished, print-friendly layout
- Header: "Shared by [User] • [Trip Name]"
- Clean itemized breakdown by category
- Pie chart visualization included
- Footer: "Create your own trip budget at [App Name]"

**7. Navigation**
- Top bar: Logo, "My Trips" link, "+ New Trip" button, User menu
- Breadcrumb on trip detail: My Trips > [Trip Name]

---

### E. Interactions & States

**Animations:** Minimal, purposeful only
- Number updates: Gentle count-up animation (300ms)
- Chart transitions: Smooth segment changes (400ms)
- Card hover: Subtle lift (2px) with shadow increase
- Form validation: Shake animation on error (subtle)

**Loading States:**
- Skeleton loaders for trip cards
- Spinner for calculation updates (if >100ms)

**Empty States:**
- Illustration: Backpack icon + "Start planning your adventure"
- Clear CTA: "Add your first expense"

---

## Images

**No large hero image required.** This is a utility-focused app where data entry and budget visibility take priority.

**Icon Usage:**
- Category icons: Heroicons (plane, train, home, utensils, ticket)
- UI icons: Heroicons throughout (plus, pencil, trash, share, link, calendar)
- All icons: Consistent 20px or 24px stroke width

---

## Mobile Considerations

- Stack trip stats vertically
- Full-width category cards
- Expandable categories collapsed by default
- Sticky "Add Item" button at bottom
- Chart: Reduce size, legend below
- Forms: Full-screen modal on mobile

---

**Final Note:** The design balances professional budget tracking with the excitement of travel planning. Clean data display ensures usability while warm colors and travel-themed details maintain emotional connection to the adventure being planned.