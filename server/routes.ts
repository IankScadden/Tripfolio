import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTripSchema, insertExpenseSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/trips", async (req, res) => {
    try {
      const trips = await storage.getAllTrips();
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

  app.get("/api/trips/:id", async (req, res) => {
    try {
      const trip = await storage.getTrip(req.params.id);
      if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
      }
      const expenses = await storage.getExpensesByTrip(trip.id);
      const total = expenses.reduce((sum, e) => sum + parseFloat(e.cost), 0);
      res.json({ ...trip, totalCost: total });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch trip" });
    }
  });

  app.post("/api/trips", async (req, res) => {
    try {
      const tripData = insertTripSchema.parse(req.body);
      const trip = await storage.createTrip(tripData);
      res.json({ ...trip, totalCost: 0 });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid trip data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create trip" });
    }
  });

  app.patch("/api/trips/:id", async (req, res) => {
    try {
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

  app.delete("/api/trips/:id", async (req, res) => {
    try {
      const success = await storage.deleteTrip(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Trip not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete trip" });
    }
  });

  app.get("/api/trips/:tripId/expenses", async (req, res) => {
    try {
      const expenses = await storage.getExpensesByTrip(req.params.tripId);
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch expenses" });
    }
  });

  app.post("/api/expenses", async (req, res) => {
    try {
      const expenseData = insertExpenseSchema.parse(req.body);
      const expense = await storage.createExpense(expenseData);
      res.json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid expense data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create expense" });
    }
  });

  app.patch("/api/expenses/:id", async (req, res) => {
    try {
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

  app.delete("/api/expenses/:id", async (req, res) => {
    try {
      const success = await storage.deleteExpense(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Expense not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete expense" });
    }
  });

  app.get("/api/share/:shareId", async (req, res) => {
    try {
      const trips = await storage.getAllTrips();
      const trip = trips.find(t => t.shareId === req.params.shareId);
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
