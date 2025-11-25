import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User storage table for Clerk Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clerkId: varchar("clerk_id").unique(),
  email: varchar("email"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  displayName: varchar("display_name"),
  bio: text("bio"),
  isAdmin: integer("is_admin").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const trips = pgTable("trips", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  startDate: text("start_date"),
  endDate: text("end_date"),
  days: integer("days"),
  shareId: varchar("share_id").unique(),
  favorite: integer("favorite").default(0).notNull(),
  isPublic: integer("is_public").default(0).notNull(),
  tripType: text("trip_type").default("plan").notNull(),
  description: text("description"),
  headerImageUrl: text("header_image_url"),
  tags: text("tags").array(),
  photos: text("photos").array(),
  budget: decimal("budget", { precision: 10, scale: 2 }).default("0"),
  privateNotes: text("private_notes"),
}, (table) => ({
  userIdIdx: index("trips_user_id_idx").on(table.userId),
  isPublicIdx: index("trips_is_public_idx").on(table.isPublic),
}));

export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tripId: varchar("trip_id").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  cost: decimal("cost", { precision: 10, scale: 2 }).notNull(),
  url: text("url"),
  date: text("date"),
  dayNumber: integer("day_number"),
  purchased: integer("purchased").default(0).notNull(),
}, (table) => ({
  tripIdIdx: index("expenses_trip_id_idx").on(table.tripId),
}));

export const dayDetails = pgTable("day_details", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tripId: varchar("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
  dayNumber: integer("day_number").notNull(),
  destination: text("destination"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  localTransportNotes: text("local_transport_notes"),
  foodBudgetAdjustment: decimal("food_budget_adjustment", { precision: 10, scale: 2 }).default("0"),
  stayingInSameCity: integer("staying_in_same_city").default(0),
  intercityTransportType: text("intercity_transport_type"),
  notes: text("notes"),
}, (table) => ({
  uniqueTripDay: index("unique_trip_day_idx").on(table.tripId, table.dayNumber),
}));

export const likes = pgTable("likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tripId: varchar("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueLike: uniqueIndex("unique_like_idx").on(table.tripId, table.userId),
}));

export const comments = pgTable("comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tripId: varchar("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  tripIdIdx: index("comments_trip_id_idx").on(table.tripId),
}));

export const travelPins = pgTable("travel_pins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  locationName: text("location_name"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTripSchema = createInsertSchema(trips).omit({
  id: true,
  shareId: true,
  userId: true,
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
});

export const insertDayDetailSchema = createInsertSchema(dayDetails).omit({
  id: true,
});

export const insertLikeSchema = createInsertSchema(likes).omit({
  id: true,
  createdAt: true,
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
});

export const insertTravelPinSchema = createInsertSchema(travelPins).omit({
  id: true,
  createdAt: true,
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertTrip = z.infer<typeof insertTripSchema>;
export type Trip = typeof trips.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;
export type InsertDayDetail = z.infer<typeof insertDayDetailSchema>;
export type DayDetail = typeof dayDetails.$inferSelect;
export type InsertLike = z.infer<typeof insertLikeSchema>;
export type Like = typeof likes.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;
export type InsertTravelPin = z.infer<typeof insertTravelPinSchema>;
export type TravelPin = typeof travelPins.$inferSelect;
