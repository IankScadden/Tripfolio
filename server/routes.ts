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

export async function registerRoutes(app: Express): Promise<Server> {

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
      const trips = await storage.getAllTrips(userId);
      
      // Optimize: Get all expenses for all trips in a single query
      const tripIds = trips.map(trip => trip.id);
      const allExpenses = await storage.getExpensesByTripIds(tripIds);
      
      // Group expenses by trip ID
      const expensesByTripId = allExpenses.reduce((acc, expense) => {
        if (!acc[expense.tripId]) {
          acc[expense.tripId] = [];
        }
        acc[expense.tripId].push(expense);
        return acc;
      }, {} as Record<string, typeof allExpenses>);
      
      // Calculate totals and counts for each trip
      const tripsWithTotals = trips.map((trip) => {
        const tripExpenses = expensesByTripId[trip.id] || [];
        const total = tripExpenses.reduce((sum, e) => sum + parseFloat(e.cost), 0);
        
        const expenseCounts = {
          flights: tripExpenses.filter(e => e.category === 'flights').length,
          accommodation: tripExpenses.filter(e => e.category === 'accommodation').length,
          activities: tripExpenses.filter(e => e.category === 'activities').length,
        };
        
        return { ...trip, totalCost: total, expenseCounts };
      });
      
      res.json(tripsWithTotals);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch trips" });
    }
  });

  app.get("/api/trips/:id", requireClerkAuth, ensureUserInDb, async (req: any, res) => {
    try {
      const userId = (req as any).userId;
      const trip = await storage.getTrip(req.params.id);
      if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
      }
      // Verify ownership
      if (trip.userId !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const expenses = await storage.getExpensesByTrip(trip.id);
      const total = expenses.reduce((sum, e) => sum + parseFloat(e.cost), 0);
      res.json({ ...trip, totalCost: total });
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
      res.json({ trip: { ...trip, totalCost: total }, expenses, dayDetails });
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
      
      // Get user's public trips
      const publicTrips = await storage.getPublicTrips();
      const userPublicTrips = publicTrips.filter(t => t.user.id === userId);
      
      // Get expenses for all trips to calculate totals
      const tripIds = userPublicTrips.map(t => t.id);
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
      const tripsWithTotals = userPublicTrips.map((trip) => {
        const tripExpenses = expensesByTripId[trip.id] || [];
        const total = tripExpenses.reduce((sum, e) => sum + parseFloat(e.cost), 0);
        
        return {
          ...trip,
          totalCost: total,
        };
      });
      
      res.json({
        user,
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
      const publicTrips = await storage.getPublicTrips(searchQuery);
      
      // Get expenses for all trips to calculate totals
      const tripIds = publicTrips.map(t => t.id);
      const allExpenses = await storage.getExpensesByTripIds(tripIds);
      
      // Group expenses by trip ID
      const expensesByTripId = allExpenses.reduce((acc, expense) => {
        if (!acc[expense.tripId]) {
          acc[expense.tripId] = [];
        }
        acc[expense.tripId].push(expense);
        return acc;
      }, {} as Record<string, typeof allExpenses>);
      
      // Get likes and comments counts for all trips
      const likeCounts = await storage.getLikesByTripIds(tripIds);
      const commentCounts = await storage.getCommentCountsByTripIds(tripIds);
      
      // Get day details for all trips to show destinations
      const tripsWithDetails = await Promise.all(
        publicTrips.map(async (trip) => {
          const tripExpenses = expensesByTripId[trip.id] || [];
          const total = tripExpenses.reduce((sum, e) => sum + parseFloat(e.cost), 0);
          const dayDetails = await storage.getAllDayDetails(trip.id);
          
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
          
          return {
            ...trip,
            totalCost: total,
            costPerDay: trip.days ? total / trip.days : 0,
            destinations,
            expenseCounts,
            likeCount: likeCounts[trip.id] || 0,
            commentCount: commentCounts[trip.id] || 0,
          };
        })
      );
      
      res.json(tripsWithDetails);
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
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
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
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.profilePictureUrl,
        {
          owner: userId,
          visibility: "public",
        },
      );

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

      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.headerImageUrl,
        {
          owner: userId,
          visibility: "public",
        },
      );

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

      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.photoUrl,
        {
          owner: userId,
          visibility: "public",
        },
      );

      const currentPhotos = trip.photos || [];
      const updatedPhotos = [...currentPhotos, objectPath];
      await storage.updateTrip(req.params.id, { photos: updatedPhotos });

      res.status(200).json({ objectPath, photos: updatedPhotos });
    } catch (error) {
      console.error("Error adding photo:", error);
      res.status(500).json({ error: "Internal server error" });
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
        const existingUser = await storage.getUserByClerkId(id);

        if (!existingUser) {
          await storage.createUserFromClerk({
            clerkId: id,
            email: email_addresses?.[0]?.email_address || "",
            firstName: first_name || "",
            lastName: last_name || "",
            profileImageUrl: image_url || "",
          });
        } else {
          await storage.updateUserProfile(existingUser.id, {
            profileImageUrl: image_url || existingUser.profileImageUrl,
          });
        }
      } catch (error) {
        console.error("Error syncing user from webhook:", error);
        return res.status(500).json({ error: "Failed to sync user" });
      }
    }

    res.status(200).json({ success: true });
  });

  const httpServer = createServer(app);
  return httpServer;
}
