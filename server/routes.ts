import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTripSchema, insertExpenseSchema, insertTravelPinSchema } from "@shared/schema";
import { z } from "zod";
import { requireClerkAuth, ensureUserInDb } from "./clerkAuth";
import { getAuth } from "@clerk/express";
import { randomUUID } from "crypto";
import { geocodeDestination } from "./geocoding";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { Webhook } from "svix";
import { CloudinaryStorageService, shouldUseCloudinary } from "./cloudinaryStorage";
import OpenAI from "openai";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { SitemapStream, streamToPromise } from "sitemap";

// OpenAI client - supports both direct API key (for Railway/production) 
// and Replit AI Integrations (for development on Replit)
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || undefined,
  apiKey: process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

// Helper function to sanitize user data for public endpoints
// Only returns public profile information, filtering out sensitive data
function sanitizeUserData(user: any) {
  return {
    id: user.id,
    displayName: user.displayName,
    bio: user.bio,
    profileImageUrl: user.profileImageUrl,
  };
}

export async function registerRoutes(app: Express): Promise<Server> {

  // Serve logo file for social media profile pictures
  app.get('/tripfolio-logo.svg', (req, res) => {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(`<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1a2e"/>
      <stop offset="50%" style="stop-color:#16213e"/>
      <stop offset="100%" style="stop-color:#0f3460"/>
    </linearGradient>
    <linearGradient id="sunGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#ff6b6b"/>
      <stop offset="50%" style="stop-color:#ee5a24"/>
      <stop offset="100%" style="stop-color:#f39c12"/>
    </linearGradient>
    <linearGradient id="mountainGrad1" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#2d3436"/>
      <stop offset="100%" style="stop-color:#636e72"/>
    </linearGradient>
    <linearGradient id="mountainGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#4a69bd"/>
      <stop offset="100%" style="stop-color:#1e3799"/>
    </linearGradient>
    <linearGradient id="planeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#ffffff"/>
      <stop offset="100%" style="stop-color:#dfe6e9"/>
    </linearGradient>
  </defs>
  <circle cx="200" cy="200" r="195" fill="url(#skyGrad)"/>
  <circle cx="200" cy="200" r="190" fill="none" stroke="#4a69bd" stroke-width="3" opacity="0.5"/>
  <circle cx="200" cy="130" r="50" fill="url(#sunGrad)"/>
  <circle cx="200" cy="130" r="60" fill="none" stroke="#f39c12" stroke-width="2" opacity="0.3"/>
  <path d="M40 280 L140 180 L200 230 L280 160 L360 280 Z" fill="url(#mountainGrad1)" opacity="0.6"/>
  <path d="M20 320 L100 220 L160 260 L240 190 L320 250 L380 320 Z" fill="url(#mountainGrad2)"/>
  <path d="M60 320 L60 280 L80 280 L80 320" fill="#2d3436" opacity="0.4"/>
  <path d="M300 300 L300 270 L320 270 L320 300" fill="#2d3436" opacity="0.4"/>
  <g transform="translate(260, 90) rotate(25)">
    <path d="M0 15 L50 15 L55 20 L50 25 L0 25 Z" fill="url(#planeGrad)"/>
    <path d="M15 15 L25 0 L30 0 L25 15 Z" fill="url(#planeGrad)"/>
    <path d="M15 25 L25 40 L30 40 L25 25 Z" fill="url(#planeGrad)"/>
    <path d="M45 18 L55 10 L55 15 L48 18 Z" fill="url(#planeGrad)"/>
    <path d="M45 22 L55 30 L55 25 L48 22 Z" fill="url(#planeGrad)"/>
  </g>
  <circle cx="100" cy="80" r="2" fill="#fff" opacity="0.8"/>
  <circle cx="320" cy="60" r="1.5" fill="#fff" opacity="0.6"/>
  <circle cx="80" cy="140" r="1" fill="#fff" opacity="0.5"/>
  <circle cx="340" cy="120" r="1.5" fill="#fff" opacity="0.7"/>
  <circle cx="150" cy="50" r="1" fill="#fff" opacity="0.4"/>
</svg>`);
  });

  // Auth endpoint to get current user
  app.get('/api/auth/user', requireClerkAuth, ensureUserInDb, async (req: any, res) => {
    try {
      const userId = (req as any).userId;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Trip routes - all require authentication
  app.get("/api/trips", requireClerkAuth, ensureUserInDb, async (req: any, res) => {
    try {
      const userId = (req as any).userId;
      // Use optimized method that calculates totals in SQL
      const tripsWithTotals = await storage.getAllTripsWithTotals(userId);
      res.json(tripsWithTotals);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch trips" });
    }
  });

  app.get("/api/trips/:id", requireClerkAuth, ensureUserInDb, async (req: any, res) => {
    try {
      const userId = (req as any).userId;
      // Use optimized method that calculates total in SQL
      const trip = await storage.getTripWithTotal(req.params.id);
      if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
      }
      // Verify ownership
      if (trip.userId !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      res.json(trip);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch trip" });
    }
  });

  app.post("/api/trips", requireClerkAuth, ensureUserInDb, async (req: any, res) => {
    try {
      const userId = (req as any).userId;
      const tripData = insertTripSchema.parse(req.body);
      const trip = await storage.createTrip(tripData, userId);
      res.json({ ...trip, totalCost: 0 });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid trip data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create trip" });
    }
  });

  app.patch("/api/trips/:id", requireClerkAuth, ensureUserInDb, async (req: any, res) => {
    try {
      const userId = (req as any).userId;
      // Verify ownership before updating
      const existingTrip = await storage.getTrip(req.params.id);
      if (!existingTrip) {
        return res.status(404).json({ error: "Trip not found" });
      }
      if (existingTrip.userId !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const updates = insertTripSchema.partial().parse(req.body);
      const trip = await storage.updateTrip(req.params.id, updates);
      if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
      }
      
      // If startDate was updated, recalculate dayNumbers for all expenses based on their dates
      if (updates.startDate && trip.startDate && updates.startDate !== existingTrip.startDate) {
        await storage.recalculateExpenseDayNumbers(trip.id, trip.startDate);
      }
      
      const expenses = await storage.getExpensesByTrip(trip.id);
      const total = expenses.reduce((sum, e) => sum + parseFloat(e.cost), 0);
      res.json({ ...trip, totalCost: total });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid trip data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update trip" });
    }
  });

  // Admin endpoint to hide trip from Explore (sets isPublic to false)
  app.patch("/api/trips/:id/hide", requireClerkAuth, ensureUserInDb, async (req: any, res) => {
    try {
      const userId = (req as any).userId;
      const user = await storage.getUser(userId);
      
      // Only admins can hide trips
      const isAdmin = user?.isAdmin === 1;
      if (!isAdmin) {
        return res.status(403).json({ error: "Forbidden - Admin only" });
      }
      
      const trip = await storage.getTrip(req.params.id);
      if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
      }
      
      // Set isPublic to 0 to hide from Explore
      const updatedTrip = await storage.updateTrip(req.params.id, { isPublic: 0 });
      if (!updatedTrip) {
        return res.status(404).json({ error: "Trip not found" });
      }
      
      res.json({ success: true, message: "Trip hidden from Explore" });
    } catch (error) {
      console.error("Error hiding trip:", error);
      res.status(500).json({ error: "Failed to hide trip" });
    }
  });

  app.delete("/api/trips/:id", requireClerkAuth, ensureUserInDb, async (req: any, res) => {
    try {
      const userId = (req as any).userId;
      const user = await storage.getUser(userId);
      
      // Check if user is admin
      const isAdmin = user?.isAdmin === 1;
      
      // Verify ownership or admin status before deleting
      const trip = await storage.getTrip(req.params.id);
      if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
      }
      
      // Allow deletion if user owns the trip or is admin
      if (trip.userId !== userId && !isAdmin) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      const success = await storage.deleteTrip(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Trip not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete trip" });
    }
  });

  // Duplicate trip (for user's own trips)
  app.post("/api/trips/:id/duplicate", requireClerkAuth, ensureUserInDb, async (req: any, res) => {
    try {
      const userId = (req as any).userId;
      const trip = await storage.getTrip(req.params.id);
      
      if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
      }
      
      // Verify ownership - only allow duplicating own trips
      if (trip.userId !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      // Clone the trip structure
      const newTrip = await storage.cloneTripStructure(req.params.id, userId);
      
      // Update the name to indicate it's a copy
      const updatedTrip = await storage.updateTrip(newTrip.id, {
        name: `${trip.name} (Copy)`,
        isPublic: 0, // Duplicated trips start as private
        shareId: null, // New trips get their own share ID when shared
      });
      
      res.json(updatedTrip || newTrip);
    } catch (error) {
      console.error("Error duplicating trip:", error);
      res.status(500).json({ error: "Failed to duplicate trip" });
    }
  });

  app.patch("/api/trips/:id/favorite", requireClerkAuth, ensureUserInDb, async (req: any, res) => {
    try {
      const userId = (req as any).userId;
      const trip = await storage.getTrip(req.params.id);
      if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
      }
      if (trip.userId !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      // Toggle favorite
      const newFavoriteValue = trip.favorite ? 0 : 1;
      const updatedTrip = await storage.updateTrip(req.params.id, { favorite: newFavoriteValue });
      if (!updatedTrip) {
        return res.status(404).json({ error: "Trip not found" });
      }
      const expenses = await storage.getExpensesByTrip(updatedTrip.id);
      const total = expenses.reduce((sum, e) => sum + parseFloat(e.cost), 0);
      res.json({ ...updatedTrip, totalCost: total });
    } catch (error) {
      res.status(500).json({ error: "Failed to update favorite" });
    }
  });

  app.post("/api/trips/:id/share", requireClerkAuth, ensureUserInDb, async (req: any, res) => {
    try {
      const userId = (req as any).userId;
      const trip = await storage.getTrip(req.params.id);
      if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
      }
      if (trip.userId !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      // Generate shareId if it doesn't exist
      let shareId = trip.shareId;
      if (!shareId) {
        // Use randomUUID without hyphens for secure shareId generation (32 chars of hex)
        shareId = randomUUID().replace(/-/g, '');
        const updatedTrip = await storage.updateTrip(req.params.id, { shareId });
        if (!updatedTrip) {
          return res.status(404).json({ error: "Trip not found" });
        }
      }
      res.json({ shareId });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate share link" });
    }
  });

  app.patch("/api/trips/:id/unpublish", requireClerkAuth, ensureUserInDb, async (req: any, res) => {
    try {
      const userId = (req as any).userId;
      const trip = await storage.getTrip(req.params.id);
      if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
      }
      if (trip.userId !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      // Set isPublic to false (0)
      const updatedTrip = await storage.updateTrip(req.params.id, { isPublic: 0 });
      if (!updatedTrip) {
        return res.status(404).json({ error: "Trip not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to unpublish trip" });
    }
  });

  // Expense routes - all require authentication
  app.get("/api/trips/:tripId/expenses", requireClerkAuth, ensureUserInDb, async (req: any, res) => {
    try {
      const userId = (req as any).userId;
      // Verify trip ownership
      const trip = await storage.getTrip(req.params.tripId);
      if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
      }
      if (trip.userId !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const expenses = await storage.getExpensesByTrip(req.params.tripId);
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch expenses" });
    }
  });

  app.post("/api/expenses", requireClerkAuth, ensureUserInDb, async (req: any, res) => {
    try {
      const userId = (req as any).userId;
      const expenseData = insertExpenseSchema.parse(req.body);
      // Verify trip ownership before creating expense
      const trip = await storage.getTrip(expenseData.tripId);
      if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
      }
      if (trip.userId !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const expense = await storage.createExpense(expenseData);
      res.json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid expense data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create expense" });
    }
  });

  app.patch("/api/expenses/:id", requireClerkAuth, ensureUserInDb, async (req: any, res) => {
    try {
      const userId = (req as any).userId;
      // Get existing expense to verify trip ownership
      const existingExpense = await storage.getExpense(req.params.id);
      if (!existingExpense) {
        return res.status(404).json({ error: "Expense not found" });
      }
      const trip = await storage.getTrip(existingExpense.tripId);
      if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
      }
      if (trip.userId !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const updates = insertExpenseSchema.partial().parse(req.body);
      const expense = await storage.updateExpense(req.params.id, updates);
      if (!expense) {
        return res.status(404).json({ error: "Expense not found" });
      }
      res.json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid expense data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update expense" });
    }
  });

  app.delete("/api/expenses/:id", requireClerkAuth, ensureUserInDb, async (req: any, res) => {
    try {
      const userId = (req as any).userId;
      // Get existing expense to verify trip ownership
      const existingExpense = await storage.getExpense(req.params.id);
      if (!existingExpense) {
        return res.status(404).json({ error: "Expense not found" });
      }
      const trip = await storage.getTrip(existingExpense.tripId);
      if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
      }
      if (trip.userId !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const success = await storage.deleteExpense(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Expense not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete expense" });
    }
  });

  // Day details routes
  app.get("/api/trips/:tripId/all-day-details", requireClerkAuth, ensureUserInDb, async (req: any, res) => {
    try {
      const userId = (req as any).userId;
      const trip = await storage.getTrip(req.params.tripId);
      if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
      }
      if (trip.userId !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const dayDetails = await storage.getAllDayDetails(req.params.tripId);
      res.json(dayDetails);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch day details" });
    }
  });

  app.get("/api/trips/:tripId/day-details/:dayNumber", requireClerkAuth, ensureUserInDb, async (req: any, res) => {
    try {
      const userId = (req as any).userId;
      const trip = await storage.getTrip(req.params.tripId);
      if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
      }
      if (trip.userId !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const dayDetail = await storage.getDayDetail(req.params.tripId, parseInt(req.params.dayNumber));
      res.json(dayDetail || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch day detail" });
    }
  });

  app.post("/api/trips/:tripId/day-details", requireClerkAuth, ensureUserInDb, async (req: any, res) => {
    try {
      const userId = (req as any).userId;
      const trip = await storage.getTrip(req.params.tripId);
      if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
      }
      if (trip.userId !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      // Geocode destination if provided and coordinates are not already set
      let latitude = req.body.latitude;
      let longitude = req.body.longitude;

      console.log('[Day Details] Saving day detail - destination:', req.body.destination, 'lat/lng:', latitude, longitude);

      if (req.body.destination && (!latitude || !longitude)) {
        console.log('[Day Details] Attempting to geocode destination:', req.body.destination);
        try {
          const geocodeResult = await geocodeDestination(req.body.destination);
          if (geocodeResult) {
            latitude = geocodeResult.lat;
            longitude = geocodeResult.lon;
            console.log('[Day Details] Geocoding successful - lat:', latitude, 'lng:', longitude);
          } else {
            console.log('[Day Details] Geocoding returned no results for:', req.body.destination);
          }
        } catch (error) {
          console.error('[Day Details] Geocoding error:', error);
          // Continue saving without coordinates - user can still see destination name
        }
      }

      const dayDetail = await storage.upsertDayDetail({
        tripId: req.params.tripId,
        dayNumber: req.body.dayNumber,
        destination: req.body.destination,
        latitude: latitude,
        longitude: longitude,
        localTransportNotes: req.body.localTransportNotes,
        foodBudgetAdjustment: req.body.foodBudgetAdjustment,
        stayingInSameCity: req.body.stayingInSameCity,
        intercityTransportType: req.body.intercityTransportType,
        notes: req.body.notes,
      });
      res.json(dayDetail);
    } catch (error) {
      res.status(500).json({ error: "Failed to save day detail" });
    }
  });

  // Bulk lodging creation for multi-day stays
  app.post("/api/trips/:tripId/lodging/bulk", requireClerkAuth, ensureUserInDb, async (req: any, res) => {
    try {
      const userId = (req as any).userId;
      const trip = await storage.getTrip(req.params.tripId);
      if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
      }
      if (trip.userId !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const { checkInDate, checkOutDate, nights: nightsParam, lodgingName, totalCost, url, startDayNumber, dayNumbersToDelete } = req.body;

      // Validate required fields
      if (!lodgingName || !totalCost) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      // Validate that either dates OR nights are provided
      if (trip.startDate) {
        // Trip has dates - require check-in/check-out
        if (!checkInDate || !checkOutDate) {
          return res.status(400).json({ error: "Check-in and check-out dates are required for trips with dates" });
        }
      } else {
        // Trip has no dates - require nights and startDayNumber
        if (!nightsParam || nightsParam <= 0) {
          return res.status(400).json({ error: "Number of nights is required for trips without dates" });
        }
        if (!startDayNumber) {
          return res.status(400).json({ error: "startDayNumber is required for trips without dates" });
        }
      }

      let nights: number;
      let nightlyRate: string;

      if (trip.startDate && checkInDate && checkOutDate) {
        // Calculate nights from dates
        const [checkInYear, checkInMonth, checkInDay] = checkInDate.split('-').map(Number);
        const [checkOutYear, checkOutMonth, checkOutDay] = checkOutDate.split('-').map(Number);
        const checkIn = new Date(checkInYear, checkInMonth - 1, checkInDay);
        const checkOut = new Date(checkOutYear, checkOutMonth - 1, checkOutDay);

        nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
        
        if (nights <= 0) {
          return res.status(400).json({ error: "Check-out date must be after check-in date" });
        }
      } else {
        // Use provided nights parameter
        nights = parseInt(nightsParam);
      }

      // Calculate nightly rate
      nightlyRate = (parseFloat(totalCost) / nights).toFixed(2);

      // Calculate day numbers and dates for each night
      const nightsData: Array<{ dayNumber: number; dateString: string }> = [];
      
      if (trip.startDate && checkInDate) {
        // Trip has dates - calculate from check-in date
        const [checkInYear, checkInMonth, checkInDay] = checkInDate.split('-').map(Number);
        
        for (let i = 0; i < nights; i++) {
          const currentDate = new Date(checkInYear, checkInMonth - 1, checkInDay + i);
          
          // Format date correctly using the Date object (handles month/year rollovers)
          const year = currentDate.getFullYear();
          const month = currentDate.getMonth() + 1; // getMonth() is 0-indexed
          const day = currentDate.getDate();
          const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          
          // Calculate day number
          const [tripYear, tripMonth, tripDay] = trip.startDate.split('-').map(Number);
          const tripStart = new Date(tripYear, tripMonth - 1, tripDay);
          const daysDiff = Math.ceil((currentDate.getTime() - tripStart.getTime()) / (1000 * 60 * 60 * 24));
          const dayNumber = daysDiff + 1; // Day 1 is the first day
          
          // Only include nights within the trip duration
          if (dayNumber >= 1 && (!trip.days || dayNumber <= trip.days)) {
            nightsData.push({ dayNumber, dateString });
          }
        }
      } else {
        // Trip has no dates - use day numbers only
        for (let i = 0; i < nights; i++) {
          const dayNumber = parseInt(startDayNumber) + i;
          
          // For trips without dates, we can't calculate actual dates
          // Use a placeholder date format (won't be displayed)
          const dateString = `2024-01-${String(dayNumber).padStart(2, '0')}`;
          
          // Only include nights within the trip duration
          if (dayNumber >= 1 && (!trip.days || dayNumber <= trip.days)) {
            nightsData.push({ dayNumber, dateString });
          }
        }
      }

      // Delete existing accommodation expenses
      // When editing (dayNumbersToDelete provided), only delete the specific booking range
      // When creating new, delete any overlapping days with the same lodging name
      const existingExpenses = await storage.getExpensesByTrip(req.params.tripId);
      let expensesToDelete;
      
      if (dayNumbersToDelete && dayNumbersToDelete.length > 0) {
        // Editing: Delete only the specific days from the original booking
        expensesToDelete = existingExpenses.filter(
          e => e.category === 'accommodation' && 
               e.description === lodgingName && 
               e.dayNumber && 
               dayNumbersToDelete.includes(e.dayNumber)
        );
      } else {
        // Creating new: Delete any accommodation with the SAME NAME on the new range days
        const newRangeDayNumbers = nightsData.map(night => night.dayNumber);
        expensesToDelete = existingExpenses.filter(
          e => e.category === 'accommodation' && 
               e.description === lodgingName && 
               e.dayNumber && 
               newRangeDayNumbers.includes(e.dayNumber)
        );
      }
      
      for (const expense of expensesToDelete) {
        await storage.deleteExpense(expense.id);
      }

      // Create accommodation expenses for each night
      const createdExpenses = [];
      for (const night of nightsData) {
        const expense = await storage.createExpense({
          tripId: req.params.tripId,
          category: 'accommodation',
          description: lodgingName,
          cost: nightlyRate,
          url: url || undefined,
          date: night.dateString,
          dayNumber: night.dayNumber,
        });
        createdExpenses.push(expense);
      }

      res.json({ 
        success: true, 
        nights, 
        nightlyRate, 
        expenses: createdExpenses 
      });
    } catch (error) {
      console.error("Bulk lodging error:", error);
      res.status(500).json({ error: "Failed to create bulk lodging" });
    }
  });

  // Public route for shared trips (no auth required)
  app.get("/api/share/:shareId", async (req, res) => {
    try {
      const trip = await storage.getTripByShareId(req.params.shareId);
      if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
      }
      const expenses = await storage.getExpensesByTrip(trip.id);
      const dayDetails = await storage.getAllDayDetails(trip.id);
      const total = expenses.reduce((sum, e) => sum + parseFloat(e.cost), 0);
      // Get owner info for tip routing
      const owner = await storage.getUser(trip.userId);
      res.json({ trip: { ...trip, totalCost: total }, expenses, dayDetails, owner });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch shared trip" });
    }
  });

  // Clone a shared trip as a template (requires auth)
  app.post("/api/share/:shareId/clone", requireClerkAuth, ensureUserInDb, async (req: any, res) => {
    try {
      const userId = (req as any).userId;
      const shareId = req.params.shareId;
      
      // Get the original trip by shareId
      const originalTrip = await storage.getTripByShareId(shareId);
      if (!originalTrip) {
        return res.status(404).json({ error: "Trip not found" });
      }
      
      // Clone the trip structure
      const newTrip = await storage.cloneTripStructure(originalTrip.id, userId);
      
      // Get the full trip details
      const expenses = await storage.getExpensesByTrip(newTrip.id);
      const total = expenses.reduce((sum, e) => sum + parseFloat(e.cost), 0);
      
      res.json({ ...newTrip, totalCost: total });
    } catch (error) {
      console.error("Error cloning shared trip:", error);
      res.status(500).json({ error: "Failed to clone trip" });
    }
  });

  // Profile routes
  app.get("/api/profile", requireClerkAuth, ensureUserInDb, async (req: any, res) => {
    try {
      const userId = (req as any).userId;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  app.patch("/api/profile", requireClerkAuth, ensureUserInDb, async (req: any, res) => {
    try {
      const userId = (req as any).userId;
      const { displayName, bio, profileImageUrl } = req.body;
      
      if (!displayName || typeof displayName !== 'string' || !displayName.trim()) {
        return res.status(400).json({ error: "Display name is required" });
      }
      
      const updates: any = {
        displayName: displayName.trim(),
      };
      
      if (bio !== undefined) {
        updates.bio = bio.trim();
      }
      
      if (profileImageUrl !== undefined) {
        updates.profileImageUrl = profileImageUrl.trim();
      }
      
      const user = await storage.updateUserProfile(userId, updates);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // Public user profile endpoint
  app.get("/api/users/:userId", async (req: any, res) => {
    try {
      const userId = req.params.userId;
      
      // Get user info
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Get user's public trips (fetch all with high limit, then filter by user)
      const { trips: allPublicTrips } = await storage.getPublicTrips(undefined, 1000, 0);
      const userPublicTrips = allPublicTrips.filter((t: any) => t.user.id === userId);
      
      // Get expenses for all trips to calculate totals
      const tripIds = userPublicTrips.map((t: any) => t.id);
      const allExpenses = await storage.getExpensesByTripIds(tripIds);
      
      // Group expenses by trip ID
      const expensesByTripId = allExpenses.reduce((acc, expense) => {
        if (!acc[expense.tripId]) {
          acc[expense.tripId] = [];
        }
        acc[expense.tripId].push(expense);
        return acc;
      }, {} as Record<string, typeof allExpenses>);
      
      // Calculate totals for each trip
      const tripsWithTotals = userPublicTrips.map((trip: any) => {
        const tripExpenses = expensesByTripId[trip.id] || [];
        const total = tripExpenses.reduce((sum, e) => sum + parseFloat(e.cost), 0);
        
        return {
          ...trip,
          totalCost: total,
        };
      });
      
      res.json({
        user: sanitizeUserData(user),
        trips: tripsWithTotals,
      });
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ error: "Failed to fetch user profile" });
    }
  });

  // Explore routes - public access
  app.get("/api/explore/trips", async (req: any, res) => {
    try {
      const searchQuery = req.query.search as string | undefined;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 12;
      const offset = (page - 1) * limit;
      
      const { trips: publicTrips, total } = await storage.getPublicTrips(searchQuery, limit, offset);
      
      // Get trip IDs for batch queries
      const tripIds = publicTrips.map(t => t.id);
      
      // Batch fetch ALL related data in parallel - eliminates N+1 queries
      const [allExpenses, likeCounts, commentCounts, dayDetailsByTripId] = await Promise.all([
        storage.getExpensesByTripIds(tripIds),
        storage.getLikesByTripIds(tripIds),
        storage.getCommentCountsByTripIds(tripIds),
        storage.getDayDetailsByTripIds(tripIds),
      ]);
      
      // Group expenses by trip ID
      const expensesByTripId = allExpenses.reduce((acc, expense) => {
        if (!acc[expense.tripId]) {
          acc[expense.tripId] = [];
        }
        acc[expense.tripId].push(expense);
        return acc;
      }, {} as Record<string, typeof allExpenses>);
      
      // Process trips synchronously - all data already fetched
      const tripsWithDetails = publicTrips.map((trip) => {
        const tripExpenses = expensesByTripId[trip.id] || [];
        const total = tripExpenses.reduce((sum, e) => sum + parseFloat(e.cost), 0);
        const dayDetails = dayDetailsByTripId[trip.id] || [];
        
        // Get unique destinations
        const destinations = Array.from(
          new Set(
            dayDetails
              .filter(d => d.destination)
              .map(d => d.destination as string)
          )
        );
        
        // Calculate expense counts by category
        const expenseCounts = {
          flights: tripExpenses.filter(e => e.category === 'flights').length,
          accommodation: tripExpenses.filter(e => e.category === 'accommodation').length,
          activities: tripExpenses.filter(e => e.category === 'activities').length,
        };
        
        // User data is sanitized in storage layer
        return {
          ...trip,
          totalCost: total,
          costPerDay: trip.days ? total / trip.days : 0,
          destinations,
          expenseCounts,
          likeCount: likeCounts[trip.id] || 0,
          commentCount: commentCounts[trip.id] || 0,
        };
      });
      
      res.json({
        trips: tripsWithDetails,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Error fetching public trips:", error);
      res.status(500).json({ error: "Failed to fetch public trips" });
    }
  });

  app.get("/api/explore/trips/:id", async (req: any, res) => {
    try {
      const trip = await storage.getTrip(req.params.id);
      if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
      }
      
      // Verify trip is public
      if (!trip.isPublic) {
        return res.status(403).json({ error: "This trip is not public" });
      }
      
      // Get trip owner info
      const owner = await storage.getUser(trip.userId);
      
      const expenses = await storage.getExpensesByTrip(trip.id);
      const total = expenses.reduce((sum, e) => sum + parseFloat(e.cost), 0);
      const dayDetails = await storage.getAllDayDetails(trip.id);
      
      res.json({
        trip: { ...trip, totalCost: total },
        expenses,
        dayDetails,
        owner,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch trip details" });
    }
  });

  app.post("/api/explore/trips/:id/clone", requireClerkAuth, ensureUserInDb, async (req: any, res) => {
    try {
      const userId = (req as any).userId;
      const originalTripId = req.params.id;
      
      // Verify original trip exists and is public
      const originalTrip = await storage.getTrip(originalTripId);
      if (!originalTrip) {
        return res.status(404).json({ error: "Trip not found" });
      }
      if (!originalTrip.isPublic) {
        return res.status(403).json({ error: "This trip is not public" });
      }
      
      // Clone the trip structure
      const newTrip = await storage.cloneTripStructure(originalTripId, userId);
      
      // Get the full trip details
      const expenses = await storage.getExpensesByTrip(newTrip.id);
      const total = expenses.reduce((sum, e) => sum + parseFloat(e.cost), 0);
      
      res.json({ ...newTrip, totalCost: total });
    } catch (error) {
      console.error("Error cloning trip:", error);
      res.status(500).json({ error: "Failed to clone trip" });
    }
  });

  // Like endpoints
  app.post("/api/trips/:id/like", requireClerkAuth, ensureUserInDb, async (req: any, res) => {
    try {
      const userId = (req as any).userId;
      const tripId = req.params.id;
      
      // Verify trip exists and is public
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
      }
      if (!trip.isPublic) {
        return res.status(403).json({ error: "Cannot like a private trip" });
      }
      
      const like = await storage.addLike(tripId, userId);
      const likeCount = await storage.getLikeCount(tripId);
      
      res.json({ liked: true, likeCount });
    } catch (error) {
      console.error("Error adding like:", error);
      res.status(500).json({ error: "Failed to add like" });
    }
  });

  app.delete("/api/trips/:id/like", requireClerkAuth, ensureUserInDb, async (req: any, res) => {
    try {
      const userId = (req as any).userId;
      const tripId = req.params.id;
      
      await storage.removeLike(tripId, userId);
      const likeCount = await storage.getLikeCount(tripId);
      
      res.json({ liked: false, likeCount });
    } catch (error) {
      console.error("Error removing like:", error);
      res.status(500).json({ error: "Failed to remove like" });
    }
  });

  app.get("/api/trips/:id/likes", async (req, res) => {
    try {
      const tripId = req.params.id;
      const userId = (req as any).user?.claims?.sub;
      
      const likeCount = await storage.getLikeCount(tripId);
      const hasLiked = userId ? await storage.hasUserLiked(tripId, userId) : false;
      
      res.json({ likeCount, hasLiked });
    } catch (error) {
      console.error("Error fetching likes:", error);
      res.status(500).json({ error: "Failed to fetch likes" });
    }
  });

  // Comment endpoints
  app.get("/api/trips/:id/comments", async (req, res) => {
    try {
      const tripId = req.params.id;
      const comments = await storage.getCommentsByTrip(tripId);
      
      // User data is sanitized in storage layer
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  app.post("/api/trips/:id/comments", requireClerkAuth, ensureUserInDb, async (req: any, res) => {
    try {
      const userId = (req as any).userId;
      const tripId = req.params.id;
      const { content } = req.body;
      
      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: "Comment cannot be empty" });
      }
      
      // Verify trip exists and is public
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
      }
      if (!trip.isPublic) {
        return res.status(403).json({ error: "Cannot comment on a private trip" });
      }
      
      const newComment = await storage.addComment({ tripId, userId, content: content.trim() });
      
      res.json(newComment);
    } catch (error) {
      console.error("Error adding comment:", error);
      res.status(500).json({ error: "Failed to add comment" });
    }
  });

  app.delete("/api/comments/:id", requireClerkAuth, ensureUserInDb, async (req: any, res) => {
    try {
      const userId = (req as any).userId;
      const commentId = req.params.id;
      
      // Note: In a production app, you'd want to verify the user owns this comment
      // For now, we'll allow anyone to delete any comment
      const deleted = await storage.deleteComment(commentId);
      
      if (deleted) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Comment not found" });
      }
    } catch (error) {
      console.error("Error deleting comment:", error);
      res.status(500).json({ error: "Failed to delete comment" });
    }
  });

  // Travel pin endpoints
  // Note: This endpoint is intentionally public (no authentication required)
  // The My Map feature is designed to be publicly viewable, similar to public trips
  // This allows users to see each other's travel pins for inspiration and exploration
  app.get("/api/users/:userId/pins", async (req, res) => {
    try {
      const userId = req.params.userId;
      const pins = await storage.getTravelPinsByUser(userId);
      
      res.json(pins);
    } catch (error) {
      console.error("Error fetching travel pins:", error);
      res.status(500).json({ error: "Failed to fetch travel pins" });
    }
  });

  app.post("/api/pins", requireClerkAuth, ensureUserInDb, async (req: any, res) => {
    try {
      const userId = (req as any).userId;
      // Always use authenticated user's ID, ignore any client-provided userId
      const { latitude, longitude, locationName } = req.body;
      const pinData = insertTravelPinSchema.parse({ 
        userId, 
        latitude, 
        longitude, 
        locationName 
      });
      
      const pin = await storage.addTravelPin(pinData);
      res.json(pin);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid pin data", details: error.errors });
      }
      console.error("Error adding travel pin:", error);
      res.status(500).json({ error: "Failed to add travel pin" });
    }
  });

  app.delete("/api/pins/:id", requireClerkAuth, ensureUserInDb, async (req: any, res) => {
    try {
      const userId = (req as any).userId;
      const pinId = req.params.id;
      
      // Verify ownership before deleting
      const pin = await storage.getTravelPin(pinId);
      if (!pin) {
        return res.status(404).json({ error: "Pin not found" });
      }
      
      if (pin.userId !== userId) {
        return res.status(403).json({ error: "You can only delete your own pins" });
      }
      
      const deleted = await storage.deleteTravelPin(pinId);
      
      if (deleted) {
        res.json({ success: true });
      } else {
        res.status(500).json({ error: "Failed to delete pin" });
      }
    } catch (error) {
      console.error("Error deleting travel pin:", error);
      res.status(500).json({ error: "Failed to delete travel pin" });
    }
  });

  // Object Storage routes - for file uploads
  app.post("/api/objects/upload", requireClerkAuth, ensureUserInDb, async (req, res) => {
    try {
      // Use Cloudinary in production (Railway), Replit object storage in dev
      if (shouldUseCloudinary()) {
        const cloudinaryService = new CloudinaryStorageService();
        const uploadData = await cloudinaryService.getUploadSignature();
        res.json({ 
          uploadType: 'cloudinary',
          ...uploadData 
        });
      } else {
        const objectStorageService = new ObjectStorageService();
        const uploadURL = await objectStorageService.getObjectEntityUploadURL();
        res.json({ 
          uploadType: 'replit',
          uploadURL 
        });
      }
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  app.get("/objects/:objectPath(*)", requireClerkAuth, ensureUserInDb, async (req: any, res) => {
    const userId = (req as any).userId;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.put("/api/users/profile-picture", requireClerkAuth, ensureUserInDb, async (req: any, res) => {
    if (!req.body.profilePictureUrl) {
      return res.status(400).json({ error: "profilePictureUrl is required" });
    }

    const userId = (req as any).userId;

    try {
      const cloudinaryService = new CloudinaryStorageService();
      let objectPath = req.body.profilePictureUrl;
      
      // Only set ACL for Replit object storage, Cloudinary URLs are already public
      if (!cloudinaryService.isCloudinaryUrl(req.body.profilePictureUrl)) {
        const objectStorageService = new ObjectStorageService();
        objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
          req.body.profilePictureUrl,
          {
            owner: userId,
            visibility: "public",
          },
        );
      }

      await storage.updateUserProfile(userId, { profileImageUrl: objectPath });

      res.status(200).json({ objectPath });
    } catch (error) {
      console.error("Error setting profile picture:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/trips/:id/header-image", requireClerkAuth, ensureUserInDb, async (req: any, res) => {
    if (!req.body.headerImageUrl) {
      return res.status(400).json({ error: "headerImageUrl is required" });
    }

    const userId = (req as any).userId;

    try {
      const trip = await storage.getTrip(req.params.id);
      if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
      }
      if (trip.userId !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const cloudinaryService = new CloudinaryStorageService();
      let objectPath = req.body.headerImageUrl;
      
      // Only set ACL for Replit object storage, Cloudinary URLs are already public
      if (!cloudinaryService.isCloudinaryUrl(req.body.headerImageUrl)) {
        const objectStorageService = new ObjectStorageService();
        objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
          req.body.headerImageUrl,
          {
            owner: userId,
            visibility: "public",
          },
        );
      }

      await storage.updateTrip(req.params.id, { headerImageUrl: objectPath });

      res.status(200).json({ objectPath });
    } catch (error) {
      console.error("Error setting header image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/trips/:id/photos", requireClerkAuth, ensureUserInDb, async (req: any, res) => {
    if (!req.body.photoUrl) {
      return res.status(400).json({ error: "photoUrl is required" });
    }

    const userId = (req as any).userId;

    try {
      const trip = await storage.getTrip(req.params.id);
      if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
      }
      if (trip.userId !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const cloudinaryService = new CloudinaryStorageService();
      let objectPath = req.body.photoUrl;
      
      // Only set ACL for Replit object storage, Cloudinary URLs are already public
      if (!cloudinaryService.isCloudinaryUrl(req.body.photoUrl)) {
        const objectStorageService = new ObjectStorageService();
        objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
          req.body.photoUrl,
          {
            owner: userId,
            visibility: "public",
          },
        );
      }

      const currentPhotos = trip.photos || [];
      const updatedPhotos = [...currentPhotos, objectPath];
      await storage.updateTrip(req.params.id, { photos: updatedPhotos });

      res.status(200).json({ objectPath, photos: updatedPhotos });
    } catch (error) {
      console.error("Error adding photo:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Travel Assistant Chat API - Context-aware AI for trip budgeting
  app.post("/api/chat", requireClerkAuth, ensureUserInDb, async (req: any, res) => {
    try {
      const { message, tripContext } = req.body;
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: "Message is required" });
      }

      // Build context-aware system prompt
      let systemPrompt = `You are a helpful travel budgeting assistant for Tripfolio, a backpacking trip budget planner. You help users estimate costs for trips, especially to European cities.

Your role is to provide practical, realistic cost estimates for:
- Flights (economy class, typical booking windows)
- Accommodation (hostels, budget hotels, Airbnbs)
- Meals (street food, casual restaurants, grocery stores)
- Activities (museums, tours, attractions)
- Local transportation (metro, buses, trains between cities)

Guidelines:
1. Always provide specific price ranges (e.g., "$15-25 per meal" not "moderate prices")
2. Mention that prices vary by season, booking time, and preferences
3. For flights, acknowledge you're giving typical ranges, not live prices
4. Be concise and helpful - travelers need quick, actionable info
5. When giving a cost estimate, always format it clearly

IMPORTANT: When you provide a cost estimate that could be added as an expense, include a JSON block at the end of your response in this exact format:
\`\`\`expense
{"category": "flights|accommodation|food|activities|local_transportation|city_transportation|other", "cost": <number>, "description": "<brief description>"}
\`\`\`

Categories must be one of: flights, accommodation, food, activities, local_transportation, city_transportation, other

Example response:
"A flight from Las Vegas to Madrid typically costs between $600-900 for economy class, depending on the season and how far in advance you book. May is shoulder season, so you might find deals around $700-750 if you book 2-3 months ahead.

\`\`\`expense
{"category": "flights", "cost": 750, "description": "Flight from Las Vegas to Madrid"}
\`\`\`"`;

      // Add trip-specific context if provided
      if (tripContext) {
        systemPrompt += `\n\nThe user is currently planning a trip called "${tripContext.name}"`;
        if (tripContext.destination) {
          systemPrompt += ` to ${tripContext.destination}`;
        }
        if (tripContext.startDate && tripContext.endDate) {
          systemPrompt += ` from ${tripContext.startDate} to ${tripContext.endDate}`;
        }
        if (tripContext.budget) {
          systemPrompt += `. Their budget is $${tripContext.budget}`;
        }
        systemPrompt += `. Tailor your responses to be relevant to this trip.`;
      }

      // Set headers for streaming
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const stream = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Using efficient model for quick responses
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        stream: true,
        max_tokens: 1000,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error: any) {
      console.error("Chat API error:", error);
      // If headers haven't been sent yet, send error response
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to process chat request" });
      } else {
        res.write(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`);
        res.end();
      }
    }
  });

  // Clerk webhook endpoint for user sync
  app.post("/api/webhooks/clerk", async (req, res) => {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

    if (!WEBHOOK_SECRET) {
      return res.status(500).json({ error: "Missing webhook secret" });
    }

    const headers = req.headers;
    const payload = JSON.stringify(req.body);

    const svix_id = headers["svix-id"] as string;
    const svix_timestamp = headers["svix-timestamp"] as string;
    const svix_signature = headers["svix-signature"] as string;

    if (!svix_id || !svix_timestamp || !svix_signature) {
      return res.status(400).json({ error: "Missing svix headers" });
    }

    const wh = new Webhook(WEBHOOK_SECRET);
    let evt: any;

    try {
      evt = wh.verify(payload, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      });
    } catch (err) {
      console.error("Error verifying webhook:", err);
      return res.status(400).json({ error: "Invalid webhook signature" });
    }

    const eventType = evt.type;

    if (eventType === "user.created" || eventType === "user.updated") {
      const { id, email_addresses, first_name, last_name, image_url } = evt.data;

      try {
        const email = email_addresses?.[0]?.email_address || "";
        const isAdminEmail = email.toLowerCase() === "ian@tripfolio.ai";
        
        const existingUser = await storage.getUserByClerkId(id);

        if (!existingUser) {
          await storage.createUserFromClerk({
            clerkId: id,
            email,
            firstName: first_name || "",
            lastName: last_name || "",
            profileImageUrl: image_url || "",
            isAdmin: isAdminEmail,
          });
        } else {
          const updates: { profileImageUrl?: string; isAdmin?: boolean } = {
            profileImageUrl: image_url || existingUser.profileImageUrl,
          };
          
          if (isAdminEmail && !existingUser.isAdmin) {
            updates.isAdmin = true;
          }
          
          await storage.updateUserProfile(existingUser.id, updates);
        }
      } catch (error) {
        console.error("Error syncing user from webhook:", error);
        return res.status(500).json({ error: "Failed to sync user" });
      }
    }

    res.status(200).json({ success: true });
  });

  // Stripe webhook endpoint for subscription updates
  // Note: This needs raw body, so it's registered here but body parsing is handled in index.ts
  app.post("/api/stripe/webhook", async (req, res) => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.error("Missing STRIPE_WEBHOOK_SECRET");
      return res.status(500).json({ error: "Webhook not configured" });
    }

    const sig = req.headers['stripe-signature'] as string;
    
    if (!sig) {
      return res.status(400).json({ error: "Missing stripe-signature header" });
    }

    let event;

    try {
      const stripe = await getUncachableStripeClient();
      // req.body should be raw buffer from express.raw() middleware
      const rawBody = req.body;
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    console.log("Stripe webhook received:", event.type);

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as any;
          console.log("Checkout completed for customer:", session.customer);
          
          // Get subscription details if this was a subscription checkout
          if (session.subscription) {
            const stripe = await getUncachableStripeClient();
            const subscription = await stripe.subscriptions.retrieve(session.subscription as string) as any;
            
            // Find user by customer ID
            const user = await storage.getUserByStripeCustomerId(session.customer as string);
            if (user) {
              await storage.updateUserSubscription(user.id, {
                subscriptionPlan: 'premium',
                subscriptionStatus: 'active',
                stripeSubscriptionId: subscription.id,
                aiUsesRemaining: 999999,
                subscriptionEndsAt: new Date(subscription.current_period_end * 1000),
              });
              console.log("User upgraded to premium:", user.id);
            } else {
              console.log("User not found for customer:", session.customer);
            }
          }
          break;
        }

        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
          const subscription = event.data.object as any;
          const user = await storage.getUserByStripeCustomerId(subscription.customer as string);
          
          if (user) {
            const isActive = subscription.status === 'active' || subscription.status === 'trialing';
            await storage.updateUserSubscription(user.id, {
              subscriptionPlan: isActive ? 'premium' : 'free',
              subscriptionStatus: subscription.status,
              stripeSubscriptionId: subscription.id,
              aiUsesRemaining: isActive ? 999999 : 3,
              subscriptionEndsAt: new Date(subscription.current_period_end * 1000),
            });
            console.log("Subscription updated for user:", user.id, "Status:", subscription.status);
          }
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as any;
          const user = await storage.getUserByStripeCustomerId(subscription.customer as string);
          
          if (user) {
            await storage.updateUserSubscription(user.id, {
              subscriptionPlan: 'free',
              subscriptionStatus: 'canceled',
              stripeSubscriptionId: null,
              aiUsesRemaining: 3,
            });
            console.log("Subscription canceled for user:", user.id);
          }
          break;
        }

        default:
          console.log("Unhandled webhook event type:", event.type);
      }

      res.json({ received: true });
    } catch (error) {
      console.error("Error processing webhook:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });

  // ==================== BILLING & SUBSCRIPTION ROUTES ====================

  // Get Stripe publishable key for frontend
  app.get("/api/billing/publishable-key", async (req, res) => {
    try {
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error) {
      console.error("Error getting publishable key:", error);
      res.status(500).json({ error: "Failed to get publishable key" });
    }
  });

  // Get user subscription status
  app.get("/api/subscription", requireClerkAuth, ensureUserInDb, async (req: any, res) => {
    try {
      const userId = (req as any).userId;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({
        plan: user.subscriptionPlan || 'free',
        aiUsesRemaining: user.aiUsesRemaining || 0,
        status: user.subscriptionStatus,
        endsAt: user.subscriptionEndsAt,
      });
    } catch (error) {
      console.error("Error fetching subscription:", error);
      res.status(500).json({ error: "Failed to fetch subscription" });
    }
  });

  // Create checkout session for premium subscription
  app.post("/api/billing/checkout", requireClerkAuth, ensureUserInDb, async (req: any, res) => {
    try {
      const userId = (req as any).userId;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const stripe = await getUncachableStripeClient();
      
      // Get or create Stripe customer
      let customerId = user.stripeCustomerId;
      
      // Verify existing customer exists, or create a new one
      if (customerId) {
        try {
          await stripe.customers.retrieve(customerId);
        } catch (customerError: any) {
          // Customer doesn't exist (maybe from test mode), create new one
          console.log("Existing customer not found, creating new one:", customerError.message);
          customerId = null;
        }
      }
      
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email || undefined,
          metadata: { userId: user.id },
        });
        customerId = customer.id;
        await storage.updateUserStripeInfo(user.id, { stripeCustomerId: customerId });
      }

      // Find the premium price - use known price ID or search by metadata
      const KNOWN_PRICE_ID = process.env.STRIPE_PREMIUM_PRICE_ID || 'price_1SYDRGIKucH7KYYrhnqVFwcR';
      let priceId = KNOWN_PRICE_ID;
      
      // Verify the price exists
      try {
        const price = await stripe.prices.retrieve(priceId);
        if (!price.active) {
          // Try searching for an active price with metadata
          const prices = await stripe.prices.search({
            query: "active:'true' metadata['plan']:'premium_monthly'",
          });
          if (prices.data.length > 0) {
            priceId = prices.data[0].id;
          } else {
            console.error("No active premium price found");
            return res.status(500).json({ error: "Premium plan not configured" });
          }
        }
      } catch (priceError) {
        console.error("Error fetching price, trying search:", priceError);
        // Fallback to search
        const prices = await stripe.prices.search({
          query: "active:'true' metadata['plan']:'premium_monthly'",
        });
        if (prices.data.length > 0) {
          priceId = prices.data[0].id;
        } else {
          return res.status(500).json({ error: "Premium plan not configured" });
        }
      }

      // Get the base URL for redirects
      const baseUrl = req.headers.origin || `${req.protocol}://${req.get('host')}`;

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'subscription',
        success_url: `${baseUrl}/?upgraded=true`,
        cancel_url: `${baseUrl}/`,
        allow_promotion_codes: true,
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Error creating checkout session:", error);
      // Return more specific error message for debugging
      const errorMessage = error.message || "Failed to create checkout session";
      const errorCode = error.code || error.type || "unknown";
      console.error("Stripe error details:", { message: errorMessage, code: errorCode });
      res.status(500).json({ 
        error: `Checkout failed: ${errorMessage}`,
        code: errorCode 
      });
    }
  });

  // Handle successful checkout - update user subscription
  app.get("/api/billing/success", requireClerkAuth, ensureUserInDb, async (req: any, res) => {
    try {
      const userId = (req as any).userId;
      const { session_id } = req.query;
      
      if (!session_id) {
        return res.status(400).json({ error: "Missing session ID" });
      }

      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(session_id as string, {
        expand: ['subscription'],
      });

      if (session.payment_status === 'paid') {
        const subscription = session.subscription as any;
        
        await storage.updateUserSubscription(userId, {
          subscriptionPlan: 'premium',
          subscriptionStatus: subscription.status,
          stripeSubscriptionId: subscription.id,
          aiUsesRemaining: 999999, // Unlimited
          subscriptionEndsAt: new Date(subscription.current_period_end * 1000),
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error processing checkout success:", error);
      res.status(500).json({ error: "Failed to process checkout" });
    }
  });

  // Create customer portal session for managing subscription
  app.post("/api/billing/portal", requireClerkAuth, ensureUserInDb, async (req: any, res) => {
    try {
      const userId = (req as any).userId;
      const user = await storage.getUser(userId);
      
      if (!user || !user.stripeCustomerId) {
        return res.status(400).json({ error: "No subscription found" });
      }

      const stripe = await getUncachableStripeClient();
      const baseUrl = req.headers.origin || `${req.protocol}://${req.get('host')}`;
      
      const session = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${baseUrl}/my-trips`,
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating portal session:", error);
      res.status(500).json({ error: "Failed to create portal session" });
    }
  });

  // Create tip checkout session with Stripe Connect support for creator payouts
  const ALLOWED_TIP_AMOUNTS = [300, 500, 1000]; // $3, $5, $10 in cents
  const PLATFORM_FEE_PERCENT = 15; // Platform takes 15% of tips
  
  app.post("/api/tips/checkout", async (req, res) => {
    try {
      const { tripId, tripName, amount, creatorName } = req.body;
      
      if (!tripId || !amount) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const tipAmount = parseInt(amount);
      if (!ALLOWED_TIP_AMOUNTS.includes(tipAmount)) {
        return res.status(400).json({ error: "Invalid tip amount. Allowed amounts: $3, $5, $10" });
      }

      // Look up the trip to find the creator
      const trip = await storage.getTrip(tripId);
      let creator = null;
      let canTransferToCreator = false;

      if (trip) {
        creator = await storage.getUser(trip.userId);
        // Check if creator has Stripe Connect enabled
        if (creator?.stripeConnectAccountId && 
            creator.stripeConnectChargesEnabled === 1 && 
            creator.stripeConnectPayoutsEnabled === 1) {
          canTransferToCreator = true;
        }
      }

      const stripe = await getUncachableStripeClient();
      const baseUrl = req.headers.origin || `${req.protocol}://${req.get('host')}`;

      // Build checkout session config
      const sessionConfig: any = {
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Tip for "${tripName || 'Trip'}"`,
                description: creatorName ? `Support ${creatorName}'s travel content` : 'Support this travel creator',
              },
              unit_amount: tipAmount,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${baseUrl}/tip-success?tripId=${tripId}&amount=${tipAmount}`,
        cancel_url: `${baseUrl}/explore/${tripId}`,
        metadata: {
          type: 'tip',
          tripId,
          amount: tipAmount.toString(),
          creatorId: creator?.id || '',
          transferToCreator: canTransferToCreator ? 'true' : 'false',
        },
      };

      // If creator has Connect enabled, route payment to them with platform fee
      if (canTransferToCreator && creator?.stripeConnectAccountId) {
        const platformFee = Math.round(tipAmount * PLATFORM_FEE_PERCENT / 100);
        sessionConfig.payment_intent_data = {
          application_fee_amount: platformFee,
          transfer_data: {
            destination: creator.stripeConnectAccountId,
          },
        };
      }

      const session = await stripe.checkout.sessions.create(sessionConfig);

      res.json({ url: session.url, transferToCreator: canTransferToCreator });
    } catch (error) {
      console.error("Error creating tip checkout:", error);
      res.status(500).json({ error: "Failed to create tip checkout" });
    }
  });

  // ==================== STRIPE CONNECT ENDPOINTS ====================

  // Create or get Stripe Connect account and return onboarding link
  app.post("/api/creators/stripe/connect-link", async (req, res) => {
    try {
      const auth = getAuth(req);
      if (!auth?.userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const user = await storage.getUserByClerkId(auth.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const stripe = await getUncachableStripeClient();
      const baseUrl = req.headers.origin || `${req.protocol}://${req.get('host')}`;

      let accountId = user.stripeConnectAccountId;

      // Create Express account if user doesn't have one
      if (!accountId) {
        const account = await stripe.accounts.create({
          type: 'express',
          email: user.email || undefined,
          metadata: {
            userId: user.id,
            clerkId: auth.userId,
          },
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
        });
        accountId = account.id;

        // Save the account ID
        await storage.updateUserStripeConnect(user.id, {
          stripeConnectAccountId: accountId,
          stripeConnectStatus: 'pending',
        });
      }

      // Create account link for onboarding
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${baseUrl}/profile-settings?connect=refresh`,
        return_url: `${baseUrl}/profile-settings?connect=complete`,
        type: 'account_onboarding',
      });

      res.json({ url: accountLink.url });
    } catch (error: any) {
      console.error("Error creating Connect account link:", error);
      
      // Check for specific Stripe Connect not enabled error
      if (error?.raw?.message?.includes("signed up for Connect") || 
          error?.message?.includes("signed up for Connect")) {
        return res.status(503).json({ 
          error: "Creator payouts are coming soon! This feature is currently being set up.",
          code: "CONNECT_NOT_ENABLED"
        });
      }
      
      res.status(500).json({ error: "Unable to connect your account. Please try again later." });
    }
  });

  // Get Stripe Connect account status
  app.get("/api/creators/stripe/account", async (req, res) => {
    try {
      const auth = getAuth(req);
      if (!auth?.userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const user = await storage.getUserByClerkId(auth.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (!user.stripeConnectAccountId) {
        return res.json({
          connected: false,
          status: 'not_connected',
          chargesEnabled: false,
          payoutsEnabled: false,
        });
      }

      // Fetch latest status from Stripe
      const stripe = await getUncachableStripeClient();
      const account = await stripe.accounts.retrieve(user.stripeConnectAccountId);

      // Update local status if changed
      const newStatus = account.details_submitted ? 
        (account.charges_enabled && account.payouts_enabled ? 'complete' : 'restricted') : 
        'pending';

      if (newStatus !== user.stripeConnectStatus || 
          (account.charges_enabled ? 1 : 0) !== user.stripeConnectChargesEnabled ||
          (account.payouts_enabled ? 1 : 0) !== user.stripeConnectPayoutsEnabled) {
        await storage.updateUserStripeConnect(user.id, {
          stripeConnectStatus: newStatus,
          stripeConnectChargesEnabled: account.charges_enabled ? 1 : 0,
          stripeConnectPayoutsEnabled: account.payouts_enabled ? 1 : 0,
          stripeConnectOnboardedAt: account.details_submitted && account.charges_enabled ? new Date() : null,
        });
      }

      res.json({
        connected: true,
        status: newStatus,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
      });
    } catch (error) {
      console.error("Error fetching Connect account:", error);
      res.status(500).json({ error: "Failed to fetch Connect account status" });
    }
  });

  // Get creator's Connect status for tip routing (public endpoint for tippers)
  app.get("/api/creators/:clerkId/tip-status", async (req, res) => {
    try {
      const user = await storage.getUserByClerkId(req.params.clerkId);
      if (!user) {
        return res.status(404).json({ error: "Creator not found" });
      }

      // Return minimal info about whether tips go to creator
      const canReceiveTips = user.stripeConnectAccountId && 
        user.stripeConnectChargesEnabled === 1 && 
        user.stripeConnectPayoutsEnabled === 1;

      res.json({
        canReceiveTips,
        creatorName: user.displayName || user.firstName || 'Creator',
      });
    } catch (error) {
      console.error("Error fetching creator tip status:", error);
      res.status(500).json({ error: "Failed to fetch creator tip status" });
    }
  });

  // Helper to get today's date string in YYYY-MM-DD format
  const getTodayString = () => new Date().toISOString().split('T')[0];
  
  // Helper to check and reset daily AI uses if needed
  const checkAndResetDailyUses = async (userId: string, user: any) => {
    const today = getTodayString();
    const lastResetDate = user.aiDailyResetDate;
    
    // If it's a new day, reset the uses to 3
    if (lastResetDate !== today) {
      await storage.updateUserAiUsesWithDate(userId, 3, today);
      return { remaining: 3, wasReset: true };
    }
    
    return { remaining: user.aiUsesRemaining || 0, wasReset: false };
  };

  // Track AI usage - called before each AI request
  app.post("/api/ai/check-usage", requireClerkAuth, ensureUserInDb, async (req: any, res) => {
    try {
      const userId = (req as any).userId;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const isPremium = user.subscriptionPlan === 'premium' && 
                        user.subscriptionStatus === 'active';
      
      // Premium users have unlimited access
      if (isPremium) {
        return res.json({ 
          canUse: true, 
          remaining: 'unlimited',
          plan: 'premium' 
        });
      }

      // Free users: check if we need to reset daily uses
      const { remaining } = await checkAndResetDailyUses(userId, user);
      
      res.json({ 
        canUse: remaining > 0, 
        remaining,
        dailyLimit: 3,
        plan: 'free' 
      });
    } catch (error) {
      console.error("Error checking AI usage:", error);
      res.status(500).json({ error: "Failed to check AI usage" });
    }
  });

  // Decrement AI usage after successful use
  app.post("/api/ai/use", requireClerkAuth, ensureUserInDb, async (req: any, res) => {
    try {
      const userId = (req as any).userId;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const isPremium = user.subscriptionPlan === 'premium' && 
                        user.subscriptionStatus === 'active';
      
      // Premium users don't decrement
      if (isPremium) {
        return res.json({ success: true, remaining: 'unlimited' });
      }

      // Free users: check if we need to reset daily uses first
      const { remaining: currentRemaining } = await checkAndResetDailyUses(userId, user);
      
      // Decrement for free users
      const newRemaining = Math.max(0, currentRemaining - 1);
      const today = getTodayString();
      await storage.updateUserAiUsesWithDate(userId, newRemaining, today);
      
      res.json({ success: true, remaining: newRemaining, dailyLimit: 3 });
    } catch (error) {
      console.error("Error tracking AI usage:", error);
      res.status(500).json({ error: "Failed to track AI usage" });
    }
  });

  // ==================== PROMO CODE ROUTES ====================

  // Redeem a promo code
  app.post("/api/promo-codes/redeem", requireClerkAuth, ensureUserInDb, async (req: any, res) => {
    try {
      const userId = (req as any).userId;
      const { code } = req.body;
      
      if (!code || typeof code !== 'string') {
        return res.status(400).json({ error: "Promo code required" });
      }

      const result = await storage.redeemPromoCode(userId, code.toUpperCase().trim());
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json({ 
        success: true, 
        message: result.message,
        aiUsesRemaining: result.aiUsesRemaining 
      });
    } catch (error) {
      console.error("Error redeeming promo code:", error);
      res.status(500).json({ error: "Failed to redeem promo code" });
    }
  });

  // Admin: Create a promo code
  app.post("/api/admin/promo-codes", requireClerkAuth, ensureUserInDb, async (req: any, res) => {
    try {
      const userId = (req as any).userId;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { code, description, benefitType, benefitValue, maxRedemptions, expiresAt } = req.body;
      
      if (!code || !benefitType || !benefitValue) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const promoCode = await storage.createPromoCode({
        code: code.toUpperCase().trim(),
        description,
        benefitType,
        benefitValue,
        maxRedemptions: maxRedemptions || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      });

      res.json(promoCode);
    } catch (error: any) {
      if (error.code === '23505') { // Unique violation
        return res.status(400).json({ error: "Promo code already exists" });
      }
      console.error("Error creating promo code:", error);
      res.status(500).json({ error: "Failed to create promo code" });
    }
  });

  // Admin: List all promo codes
  app.get("/api/admin/promo-codes", requireClerkAuth, ensureUserInDb, async (req: any, res) => {
    try {
      const userId = (req as any).userId;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const promoCodes = await storage.getAllPromoCodes();
      res.json(promoCodes);
    } catch (error) {
      console.error("Error fetching promo codes:", error);
      res.status(500).json({ error: "Failed to fetch promo codes" });
    }
  });

  // Admin: Toggle promo code active status
  app.patch("/api/admin/promo-codes/:id", requireClerkAuth, ensureUserInDb, async (req: any, res) => {
    try {
      const userId = (req as any).userId;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { id } = req.params;
      const { isActive } = req.body;

      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ error: "isActive must be a boolean" });
      }

      const updatedCode = await storage.updatePromoCode(id, { isActive: isActive ? 1 : 0 });
      if (!updatedCode) {
        return res.status(404).json({ error: "Promo code not found" });
      }

      res.json(updatedCode);
    } catch (error) {
      console.error("Error updating promo code:", error);
      res.status(500).json({ error: "Failed to update promo code" });
    }
  });

  // ==================== AFFILIATE LINKS ROUTES ====================

  // Public: Get all active affiliate links (grouped by category)
  app.get("/api/affiliate-links", async (req, res) => {
    try {
      const links = await storage.getAffiliateLinks();
      
      // Group by category
      const grouped: Record<string, { title: string; description: string; links: any[] }> = {};
      const categoryMeta: Record<string, { title: string; description: string }> = {
        flights: { title: "Find Flights", description: "Compare prices and find the best deals on flights" },
        lodging: { title: "Find Accommodation", description: "Find hostels, hotels, and unique places to stay" },
        localTransport: { title: "Find Local Transport", description: "Get around your destination easily" },
        cityToCity: { title: "Find Transportation", description: "Buses, trains, and intercity travel" },
      };
      
      for (const link of links) {
        if (!grouped[link.category]) {
          grouped[link.category] = {
            title: categoryMeta[link.category]?.title || link.category,
            description: categoryMeta[link.category]?.description || "",
            links: [],
          };
        }
        grouped[link.category].links.push({
          name: link.name,
          url: link.url,
          description: link.description,
        });
      }
      
      res.json(grouped);
    } catch (error) {
      console.error("Error fetching affiliate links:", error);
      res.status(500).json({ error: "Failed to fetch affiliate links" });
    }
  });

  // Admin: Get all affiliate links (including inactive)
  app.get("/api/admin/affiliate-links", requireClerkAuth, ensureUserInDb, async (req: any, res) => {
    try {
      const userId = (req as any).userId;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const links = await storage.getAllAffiliateLinksAdmin();
      res.json(links);
    } catch (error) {
      console.error("Error fetching affiliate links:", error);
      res.status(500).json({ error: "Failed to fetch affiliate links" });
    }
  });

  // Admin: Create affiliate link
  app.post("/api/admin/affiliate-links", requireClerkAuth, ensureUserInDb, async (req: any, res) => {
    try {
      const userId = (req as any).userId;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { category, name, url, description, displayOrder } = req.body;
      
      if (!category || !name || !url) {
        return res.status(400).json({ error: "Category, name, and URL are required" });
      }

      const link = await storage.createAffiliateLink({
        category,
        name,
        url,
        description: description || null,
        displayOrder: displayOrder || 0,
        isActive: 1,
      });
      
      res.json(link);
    } catch (error) {
      console.error("Error creating affiliate link:", error);
      res.status(500).json({ error: "Failed to create affiliate link" });
    }
  });

  // Admin: Update affiliate link
  app.patch("/api/admin/affiliate-links/:id", requireClerkAuth, ensureUserInDb, async (req: any, res) => {
    try {
      const userId = (req as any).userId;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { id } = req.params;
      const updates: any = {};
      
      if (req.body.name !== undefined) updates.name = req.body.name;
      if (req.body.url !== undefined) updates.url = req.body.url;
      if (req.body.description !== undefined) updates.description = req.body.description;
      if (req.body.displayOrder !== undefined) updates.displayOrder = req.body.displayOrder;
      if (req.body.isActive !== undefined) updates.isActive = req.body.isActive ? 1 : 0;
      if (req.body.category !== undefined) updates.category = req.body.category;

      const link = await storage.updateAffiliateLink(id, updates);
      if (!link) {
        return res.status(404).json({ error: "Affiliate link not found" });
      }

      res.json(link);
    } catch (error) {
      console.error("Error updating affiliate link:", error);
      res.status(500).json({ error: "Failed to update affiliate link" });
    }
  });

  // Admin: Delete affiliate link
  app.delete("/api/admin/affiliate-links/:id", requireClerkAuth, ensureUserInDb, async (req: any, res) => {
    try {
      const userId = (req as any).userId;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { id } = req.params;
      const success = await storage.deleteAffiliateLink(id);
      
      if (!success) {
        return res.status(404).json({ error: "Affiliate link not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting affiliate link:", error);
      res.status(500).json({ error: "Failed to delete affiliate link" });
    }
  });

  // Robots.txt for search engines
  app.get("/robots.txt", (req, res) => {
    const hostname = process.env.NODE_ENV === "production" 
      ? "https://tripfolio.ai" 
      : `${req.protocol}://${req.get("host")}`;
    
    res.header("Content-Type", "text/plain");
    res.send(`User-agent: *
Allow: /

Sitemap: ${hostname}/sitemap.xml
`);
  });

  // Sitemap for Google Search Console
  app.get("/sitemap.xml", async (req, res) => {
    try {
      res.header("Content-Type", "application/xml");
      
      const hostname = process.env.NODE_ENV === "production" 
        ? "https://tripfolio.ai" 
        : `${req.protocol}://${req.get("host")}`;
      
      const smStream = new SitemapStream({ hostname });
      
      // Static pages
      smStream.write({ url: "/", changefreq: "daily", priority: 1.0 });
      smStream.write({ url: "/explore", changefreq: "daily", priority: 0.9 });
      smStream.write({ url: "/travel-deals", changefreq: "weekly", priority: 0.8 });
      
      // Get all public trips for dynamic URLs
      const { trips: publicTrips } = await storage.getPublicTrips();
      for (const trip of publicTrips) {
        smStream.write({ 
          url: `/explore/${trip.id}`, 
          changefreq: "weekly", 
          priority: 0.7 
        });
        // Also add shareable link if it exists
        if (trip.shareId) {
          smStream.write({ 
            url: `/share/${trip.shareId}`, 
            changefreq: "weekly", 
            priority: 0.6 
          });
        }
      }
      
      // Get all users with public profiles (users who have posted public trips)
      const usersWithPublicTrips = new Set<string>();
      for (const trip of publicTrips) {
        if (trip.userId) {
          usersWithPublicTrips.add(trip.userId);
        }
      }
      
      // Add public profile URLs
      Array.from(usersWithPublicTrips).forEach((clerkId) => {
        smStream.write({ 
          url: `/profile/${clerkId}`, 
          changefreq: "weekly", 
          priority: 0.6 
        });
      });
      
      smStream.end();
      
      const sitemap = await streamToPromise(smStream);
      res.send(sitemap.toString());
    } catch (error) {
      console.error("Error generating sitemap:", error);
      res.status(500).send("Error generating sitemap");
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
