import { type Trip, type InsertTrip, type Expense, type InsertExpense, type User, type UpsertUser, type DayDetail, type InsertDayDetail, type Like, type InsertLike, type Comment, type InsertComment, type TravelPin, type InsertTravelPin, trips, expenses, users, dayDetails, likes, comments, travelPins } from "@shared/schema";
import { db } from "./db";
import { eq, inArray, and, or, ilike, sql as sqlOperator } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserProfile(userId: string, updates: { displayName?: string; bio?: string; profileImageUrl?: string }): Promise<User | undefined>;
  
  // Trip operations
  getAllTrips(userId: string): Promise<Trip[]>;
  getTrip(id: string): Promise<Trip | undefined>;
  getTripByShareId(shareId: string): Promise<Trip | undefined>;
  createTrip(trip: InsertTrip, userId: string): Promise<Trip>;
  updateTrip(id: string, trip: Partial<InsertTrip> & { shareId?: string | null }): Promise<Trip | undefined>;
  deleteTrip(id: string): Promise<boolean>;
  getPublicTrips(searchQuery?: string): Promise<Array<Trip & { user: User }>>;
  cloneTripStructure(originalTripId: string, newUserId: string): Promise<Trip>;
  
  // Expense operations
  getExpensesByTrip(tripId: string): Promise<Expense[]>;
  getExpensesByTripIds(tripIds: string[]): Promise<Expense[]>;
  getExpense(id: string): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: string, expense: Partial<InsertExpense>): Promise<Expense | undefined>;
  deleteExpense(id: string): Promise<boolean>;
  
  // Day detail operations
  getAllDayDetails(tripId: string): Promise<DayDetail[]>;
  getDayDetail(tripId: string, dayNumber: number): Promise<DayDetail | undefined>;
  upsertDayDetail(dayDetail: InsertDayDetail): Promise<DayDetail>;
  
  // Recalculate dayNumbers for expenses based on their dates when trip dates change
  recalculateExpenseDayNumbers(tripId: string, newStartDate: string): Promise<void>;
  
  // Like operations
  addLike(tripId: string, userId: string): Promise<Like>;
  removeLike(tripId: string, userId: string): Promise<boolean>;
  getLikeCount(tripId: string): Promise<number>;
  hasUserLiked(tripId: string, userId: string): Promise<boolean>;
  getLikesByTripIds(tripIds: string[]): Promise<Record<string, number>>;
  
  // Comment operations
  getCommentsByTrip(tripId: string): Promise<Array<Comment & { user: User }>>;
  addComment(comment: InsertComment): Promise<Comment & { user: User }>;
  deleteComment(id: string): Promise<boolean>;
  getCommentCount(tripId: string): Promise<number>;
  getCommentCountsByTripIds(tripIds: string[]): Promise<Record<string, number>>;
  
  // Travel pin operations
  getTravelPinsByUser(userId: string): Promise<TravelPin[]>;
  addTravelPin(pin: InsertTravelPin): Promise<TravelPin>;
  deleteTravelPin(id: string): Promise<boolean>;
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

  async updateUserProfile(userId: string, updates: { displayName?: string; bio?: string; profileImageUrl?: string }): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, userId))
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

  async getPublicTrips(searchQuery?: string): Promise<Array<Trip & { user: User }>> {
    if (searchQuery && searchQuery.trim()) {
      // Search in trip names and day detail destinations
      const searchPattern = `%${searchQuery.trim()}%`;
      
      // Get trip IDs that match destinations
      const matchingDayDetails = await db
        .select({ tripId: dayDetails.tripId })
        .from(dayDetails)
        .where(ilike(dayDetails.destination, searchPattern));
      
      const matchingTripIds = matchingDayDetails.map(d => d.tripId);
      
      // Build query with trip name OR trip ID in matching destinations
      let results;
      if (matchingTripIds.length > 0) {
        results = await db
          .select()
          .from(trips)
          .innerJoin(users, eq(trips.userId, users.id))
          .where(
            and(
              eq(trips.isPublic, 1),
              or(
                ilike(trips.name, searchPattern),
                inArray(trips.id, matchingTripIds)
              )
            )
          );
      } else {
        // Only search in trip names if no destinations match
        results = await db
          .select()
          .from(trips)
          .innerJoin(users, eq(trips.userId, users.id))
          .where(
            and(
              eq(trips.isPublic, 1),
              ilike(trips.name, searchPattern)
            )
          );
      }
      
      // Transform results to include user data with trip
      return results.map(result => ({
        ...result.trips,
        user: result.users,
      }));
    }

    // No search query - return all public trips
    const results = await db
      .select()
      .from(trips)
      .innerJoin(users, eq(trips.userId, users.id))
      .where(eq(trips.isPublic, 1));
    
    // Transform results to include user data with trip
    return results.map(result => ({
      ...result.trips,
      user: result.users,
    }));
  }

  async cloneTripStructure(originalTripId: string, newUserId: string): Promise<Trip> {
    // Get original trip
    const originalTrip = await this.getTrip(originalTripId);
    if (!originalTrip) {
      throw new Error("Original trip not found");
    }

    // Create new trip with same structure but new user
    const newTrip = await this.createTrip(
      {
        name: `${originalTrip.name} (Copy)`,
        startDate: originalTrip.startDate,
        endDate: originalTrip.endDate,
        days: originalTrip.days,
        description: originalTrip.description,
        headerImageUrl: originalTrip.headerImageUrl,
        tags: originalTrip.tags,
        photos: originalTrip.photos,
      },
      newUserId
    );

    // Clone all expenses
    const originalExpenses = await this.getExpensesByTrip(originalTripId);
    for (const expense of originalExpenses) {
      await this.createExpense({
        tripId: newTrip.id,
        category: expense.category,
        description: expense.description,
        cost: expense.cost,
        url: expense.url,
        date: expense.date,
        dayNumber: expense.dayNumber,
        purchased: 0, // Reset purchased status
      });
    }

    // Clone all day details
    const originalDayDetails = await this.getAllDayDetails(originalTripId);
    for (const dayDetail of originalDayDetails) {
      await this.upsertDayDetail({
        tripId: newTrip.id,
        dayNumber: dayDetail.dayNumber,
        destination: dayDetail.destination,
        latitude: dayDetail.latitude,
        longitude: dayDetail.longitude,
        localTransportNotes: dayDetail.localTransportNotes,
        foodBudgetAdjustment: dayDetail.foodBudgetAdjustment,
        stayingInSameCity: dayDetail.stayingInSameCity,
        intercityTransportType: dayDetail.intercityTransportType,
      });
    }

    return newTrip;
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
  async getAllDayDetails(tripId: string): Promise<DayDetail[]> {
    const allDayDetails = await db
      .select()
      .from(dayDetails)
      .where(eq(dayDetails.tripId, tripId))
      .orderBy(dayDetails.dayNumber);
    return allDayDetails;
  }

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
          latitude: insertDayDetail.latitude,
          longitude: insertDayDetail.longitude,
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
        const daysDiff = Math.floor((expenseDate.getTime() - tripStart.getTime()) / (1000 * 60 * 60 * 24));
        // Clamp to minimum of 1 to ensure expenses always appear on valid days
        // If expense is before trip start, it appears on Day 1
        const newDayNumber = Math.max(1, daysDiff + 1);
        
        // Update the expense with the new dayNumber
        await this.updateExpense(expense.id, { dayNumber: newDayNumber });
      }
    }
  }

  // Like operations
  async addLike(tripId: string, userId: string): Promise<Like> {
    const [like] = await db
      .insert(likes)
      .values({ tripId, userId })
      .onConflictDoNothing()
      .returning();
    return like;
  }

  async removeLike(tripId: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(likes)
      .where(and(eq(likes.tripId, tripId), eq(likes.userId, userId)));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getLikeCount(tripId: string): Promise<number> {
    const result = await db
      .select({ count: sqlOperator<number>`count(*)::int` })
      .from(likes)
      .where(eq(likes.tripId, tripId));
    return result[0]?.count || 0;
  }

  async hasUserLiked(tripId: string, userId: string): Promise<boolean> {
    const [like] = await db
      .select()
      .from(likes)
      .where(and(eq(likes.tripId, tripId), eq(likes.userId, userId)));
    return !!like;
  }

  async getLikesByTripIds(tripIds: string[]): Promise<Record<string, number>> {
    if (tripIds.length === 0) return {};
    
    const results = await db
      .select({ tripId: likes.tripId, count: sqlOperator<number>`count(*)::int` })
      .from(likes)
      .where(inArray(likes.tripId, tripIds))
      .groupBy(likes.tripId);
    
    return results.reduce((acc, r) => {
      acc[r.tripId] = r.count;
      return acc;
    }, {} as Record<string, number>);
  }

  // Comment operations
  async getCommentsByTrip(tripId: string): Promise<Array<Comment & { user: User }>> {
    const results = await db
      .select()
      .from(comments)
      .leftJoin(users, eq(comments.userId, users.id))
      .where(eq(comments.tripId, tripId))
      .orderBy(comments.createdAt);
    
    return results.map(r => ({
      ...r.comments,
      user: r.users!,
    }));
  }

  async addComment(insertComment: InsertComment): Promise<Comment & { user: User }> {
    const [comment] = await db
      .insert(comments)
      .values(insertComment)
      .returning();
    
    const user = await this.getUser(insertComment.userId);
    return { ...comment, user: user! };
  }

  async deleteComment(id: string): Promise<boolean> {
    const result = await db.delete(comments).where(eq(comments.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getCommentCount(tripId: string): Promise<number> {
    const result = await db
      .select({ count: sqlOperator<number>`count(*)::int` })
      .from(comments)
      .where(eq(comments.tripId, tripId));
    return result[0]?.count || 0;
  }

  async getCommentCountsByTripIds(tripIds: string[]): Promise<Record<string, number>> {
    if (tripIds.length === 0) return {};
    
    const results = await db
      .select({ tripId: comments.tripId, count: sqlOperator<number>`count(*)::int` })
      .from(comments)
      .where(inArray(comments.tripId, tripIds))
      .groupBy(comments.tripId);
    
    return results.reduce((acc, r) => {
      acc[r.tripId] = r.count;
      return acc;
    }, {} as Record<string, number>);
  }

  // Travel pin operations
  async getTravelPinsByUser(userId: string): Promise<TravelPin[]> {
    return await db
      .select()
      .from(travelPins)
      .where(eq(travelPins.userId, userId))
      .orderBy(travelPins.createdAt);
  }

  async addTravelPin(insertPin: InsertTravelPin): Promise<TravelPin> {
    const [pin] = await db
      .insert(travelPins)
      .values(insertPin)
      .returning();
    return pin;
  }

  async deleteTravelPin(id: string): Promise<boolean> {
    const result = await db.delete(travelPins).where(eq(travelPins.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }
}

export const storage = new DatabaseStorage();
