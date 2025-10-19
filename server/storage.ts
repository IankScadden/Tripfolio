import { type Trip, type InsertTrip, type Expense, type InsertExpense, type User, type UpsertUser, type DayDetail, type InsertDayDetail, trips, expenses, users, dayDetails } from "@shared/schema";
import { db } from "./db";
import { eq, inArray, and } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Trip operations
  getAllTrips(userId: string): Promise<Trip[]>;
  getTrip(id: string): Promise<Trip | undefined>;
  getTripByShareId(shareId: string): Promise<Trip | undefined>;
  createTrip(trip: InsertTrip, userId: string): Promise<Trip>;
  updateTrip(id: string, trip: Partial<InsertTrip> & { shareId?: string | null }): Promise<Trip | undefined>;
  deleteTrip(id: string): Promise<boolean>;
  
  // Expense operations
  getExpensesByTrip(tripId: string): Promise<Expense[]>;
  getExpensesByTripIds(tripIds: string[]): Promise<Expense[]>;
  getExpense(id: string): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: string, expense: Partial<InsertExpense>): Promise<Expense | undefined>;
  deleteExpense(id: string): Promise<boolean>;
  
  // Day detail operations
  getDayDetail(tripId: string, dayNumber: number): Promise<DayDetail | undefined>;
  upsertDayDetail(dayDetail: InsertDayDetail): Promise<DayDetail>;
  
  // Recalculate dayNumbers for expenses based on their dates when trip dates change
  recalculateExpenseDayNumbers(tripId: string, newStartDate: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Upsert based on id (OIDC sub) - the stable identifier from Replit Auth
    // In production, OIDC sub is stable per user and won't change
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Trip operations
  async getAllTrips(userId: string): Promise<Trip[]> {
    return await db.select().from(trips).where(eq(trips.userId, userId));
  }

  async getTrip(id: string): Promise<Trip | undefined> {
    const [trip] = await db.select().from(trips).where(eq(trips.id, id));
    return trip;
  }

  async getTripByShareId(shareId: string): Promise<Trip | undefined> {
    const [trip] = await db.select().from(trips).where(eq(trips.shareId, shareId));
    return trip;
  }

  async createTrip(insertTrip: InsertTrip, userId: string): Promise<Trip> {
    // Generate shareId using full UUID without hyphens (32 chars of hex for security)
    const shareId = randomUUID().replace(/-/g, '');
    const [trip] = await db
      .insert(trips)
      .values({ ...insertTrip, userId, shareId })
      .returning();
    return trip;
  }

  async updateTrip(id: string, updates: Partial<InsertTrip> & { shareId?: string | null }): Promise<Trip | undefined> {
    const [trip] = await db
      .update(trips)
      .set(updates)
      .where(eq(trips.id, id))
      .returning();
    return trip;
  }

  async deleteTrip(id: string): Promise<boolean> {
    const result = await db.delete(trips).where(eq(trips.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Expense operations
  async getExpensesByTrip(tripId: string): Promise<Expense[]> {
    return await db.select().from(expenses).where(eq(expenses.tripId, tripId));
  }

  async getExpensesByTripIds(tripIds: string[]): Promise<Expense[]> {
    if (tripIds.length === 0) return [];
    return await db.select().from(expenses).where(inArray(expenses.tripId, tripIds));
  }

  async getExpense(id: string): Promise<Expense | undefined> {
    const [expense] = await db.select().from(expenses).where(eq(expenses.id, id));
    return expense;
  }

  async createExpense(insertExpense: InsertExpense): Promise<Expense> {
    const [expense] = await db
      .insert(expenses)
      .values(insertExpense)
      .returning();
    return expense;
  }

  async updateExpense(id: string, updates: Partial<InsertExpense>): Promise<Expense | undefined> {
    const [expense] = await db
      .update(expenses)
      .set(updates)
      .where(eq(expenses.id, id))
      .returning();
    return expense;
  }

  async deleteExpense(id: string): Promise<boolean> {
    const result = await db.delete(expenses).where(eq(expenses.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Day detail operations
  async getDayDetail(tripId: string, dayNumber: number): Promise<DayDetail | undefined> {
    const [dayDetail] = await db
      .select()
      .from(dayDetails)
      .where(and(eq(dayDetails.tripId, tripId), eq(dayDetails.dayNumber, dayNumber)));
    return dayDetail;
  }

  async upsertDayDetail(insertDayDetail: InsertDayDetail): Promise<DayDetail> {
    // Try to get existing day detail
    const existing = await this.getDayDetail(insertDayDetail.tripId, insertDayDetail.dayNumber);
    
    if (existing) {
      // Update existing
      const [updated] = await db
        .update(dayDetails)
        .set({
          destination: insertDayDetail.destination,
          localTransportNotes: insertDayDetail.localTransportNotes,
          foodBudgetAdjustment: insertDayDetail.foodBudgetAdjustment,
          stayingInSameCity: insertDayDetail.stayingInSameCity,
          intercityTransportType: insertDayDetail.intercityTransportType,
        })
        .where(and(eq(dayDetails.tripId, insertDayDetail.tripId), eq(dayDetails.dayNumber, insertDayDetail.dayNumber)))
        .returning();
      return updated;
    } else {
      // Insert new
      const [created] = await db
        .insert(dayDetails)
        .values(insertDayDetail)
        .returning();
      return created;
    }
  }
  
  async recalculateExpenseDayNumbers(tripId: string, newStartDate: string): Promise<void> {
    // Get all expenses for this trip that have a date set
    const tripExpenses = await this.getExpensesByTrip(tripId);
    const expensesWithDates = tripExpenses.filter(e => e.date);
    
    // Parse the new start date
    const [startYear, startMonth, startDay] = newStartDate.split('-').map(Number);
    const tripStart = new Date(startYear, startMonth - 1, startDay);
    
    // Recalculate dayNumber for each expense based on its date
    for (const expense of expensesWithDates) {
      if (expense.date) {
        const [expYear, expMonth, expDay] = expense.date.split('-').map(Number);
        const expenseDate = new Date(expYear, expMonth - 1, expDay);
        
        // Calculate days difference
        const daysDiff = Math.ceil((expenseDate.getTime() - tripStart.getTime()) / (1000 * 60 * 60 * 24));
        const newDayNumber = daysDiff + 1; // Day 1 is the first day
        
        // Update the expense with the new dayNumber
        await this.updateExpense(expense.id, { dayNumber: newDayNumber });
      }
    }
  }
}

export const storage = new DatabaseStorage();
