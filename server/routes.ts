import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTripSchema, insertExpenseSchema } from "@shared/schema";
import { z } from "zod";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { randomUUID } from "crypto";
import { geocodeDestination } from "./geocoding";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  await setupAuth(app);

  // Auth endpoint to get current user
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Trip routes - all require authentication
  app.get("/api/trips", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.get("/api/trips/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.post("/api/trips", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.patch("/api/trips/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.delete("/api/trips/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      // Verify ownership before deleting
      const trip = await storage.getTrip(req.params.id);
      if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
      }
      if (trip.userId !== userId) {
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

  app.patch("/api/trips/:id/favorite", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.post("/api/trips/:id/share", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  // Expense routes - all require authentication
  app.get("/api/trips/:tripId/expenses", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.post("/api/expenses", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.patch("/api/expenses/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.delete("/api/expenses/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
  app.get("/api/trips/:tripId/all-day-details", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.get("/api/trips/:tripId/day-details/:dayNumber", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.post("/api/trips/:tripId/day-details", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
        const geocodeResult = await geocodeDestination(req.body.destination);
        if (geocodeResult) {
          latitude = geocodeResult.lat;
          longitude = geocodeResult.lon;
          console.log('[Day Details] Geocoding successful - lat:', latitude, 'lng:', longitude);
        } else {
          console.log('[Day Details] Geocoding failed or returned null');
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
      });
      res.json(dayDetail);
    } catch (error) {
      res.status(500).json({ error: "Failed to save day detail" });
    }
  });

  // Bulk lodging creation for multi-day stays
  app.post("/api/trips/:tripId/lodging/bulk", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const trip = await storage.getTrip(req.params.tripId);
      if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
      }
      if (trip.userId !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const { checkInDate, checkOutDate, lodgingName, totalCost, url, startDayNumber, dayNumbersToDelete } = req.body;

      // Validate required fields
      if (!checkInDate || !checkOutDate || !lodgingName || !totalCost) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      // For trips without startDate, startDayNumber is required
      if (!trip.startDate && !startDayNumber) {
        return res.status(400).json({ error: "startDayNumber is required for trips without a start date" });
      }

      // Parse dates in local timezone
      const [checkInYear, checkInMonth, checkInDay] = checkInDate.split('-').map(Number);
      const [checkOutYear, checkOutMonth, checkOutDay] = checkOutDate.split('-').map(Number);
      const checkIn = new Date(checkInYear, checkInMonth - 1, checkInDay);
      const checkOut = new Date(checkOutYear, checkOutMonth - 1, checkOutDay);

      // Calculate number of nights (check-out day is not included in stay)
      const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      
      if (nights <= 0) {
        return res.status(400).json({ error: "Check-out date must be after check-in date" });
      }

      // Calculate nightly rate
      const nightlyRate = (parseFloat(totalCost) / nights).toFixed(2);

      // Calculate day numbers and dates for each night
      const nightsData: Array<{ dayNumber: number; dateString: string }> = [];
      
      for (let i = 0; i < nights; i++) {
        const currentDate = new Date(checkInYear, checkInMonth - 1, checkInDay + i);
        
        // Format date correctly using the Date object (handles month/year rollovers)
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1; // getMonth() is 0-indexed
        const day = currentDate.getDate();
        const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        // Calculate day number
        let dayNumber: number;
        if (trip.startDate) {
          const [tripYear, tripMonth, tripDay] = trip.startDate.split('-').map(Number);
          const tripStart = new Date(tripYear, tripMonth - 1, tripDay);
          const daysDiff = Math.ceil((currentDate.getTime() - tripStart.getTime()) / (1000 * 60 * 60 * 24));
          dayNumber = daysDiff + 1; // Day 1 is the first day
        } else {
          // For trips without startDate, use the provided startDayNumber
          dayNumber = parseInt(startDayNumber) + i;
        }
        
        // Only include nights within the trip duration
        if (dayNumber >= 1 && (!trip.days || dayNumber <= trip.days)) {
          nightsData.push({ dayNumber, dateString });
        }
        // Skip nights that exceed trip duration
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
      const total = expenses.reduce((sum, e) => sum + parseFloat(e.cost), 0);
      res.json({ trip: { ...trip, totalCost: total }, expenses });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch shared trip" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
