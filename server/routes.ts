import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTripSchema, insertExpenseSchema } from "@shared/schema";
import { z } from "zod";
import { setupAuth, isAuthenticated } from "./replitAuth";

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
      const tripsWithTotals = await Promise.all(
        trips.map(async (trip) => {
          const expenses = await storage.getExpensesByTrip(trip.id);
          const total = expenses.reduce((sum, e) => sum + parseFloat(e.cost), 0);
          return { ...trip, totalCost: total };
        })
      );
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
