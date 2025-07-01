import { pgTable, text, serial, integer, boolean, timestamp, varchar, json, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: json("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Enhanced user table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email").unique(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  recommendationAvailable: boolean("recommendation_available"),
});

// User relations
export const usersRelations = relations(users, ({ many }) => ({
  clothingItems: many(clothingItems),
  outfits: many(outfits),
  shoppingItems: many(shoppingItems),
}));

// Auth schemas
export const registerUserSchema = createInsertSchema(users)
  .pick({
    username: true,
    email: true,
    password: true,
    firstName: true,
    lastName: true,
  })
  .extend({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type RegisterUser = z.infer<typeof registerUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Clothing item categories
export const ITEM_CATEGORIES = [
  "Tops",
  "Bottoms",
  "Outerwear",
  "Dresses",
  "Footwear",
  "Accessories",
] as const;

export const clothingItems = pgTable("clothing_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  category: text("category").notNull(),
  imageUrl: text("image_url").notNull(),
  imageData: text("image_data").notNull(),
  rating: integer("rating"),
  tags: text("tags").array(),
  caption: text("caption"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Clothing items relations
export const clothingItemsRelations = relations(clothingItems, ({ one }) => ({
  user: one(users, {
    fields: [clothingItems.userId],
    references: [users.id],
  }),
}));

export const insertClothingItemSchema = createInsertSchema(clothingItems).omit({
  id: true,
  createdAt: true,
});

export type InsertClothingItem = z.infer<typeof insertClothingItemSchema>;
export type ClothingItem = typeof clothingItems.$inferSelect;

export const outfits = pgTable("outfits", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id), // Foreign key reference to users
  name: text("name").notNull(),
  imageUrl: text("image_url").notNull(),
  imageData: text("image_data").notNull(), // Base64 encoded image data
  rating: integer("rating"), // AI-generated rating out of 10
  aiGenerated: boolean("ai_generated").default(false),
  tags: text("tags").array(), // Array of tags for the outfit
  createdAt: timestamp("created_at").defaultNow(),
  itemIds: integer("item_ids").array(), // Array of clothing item IDs in this outfit
  analysis: text("analysis"), // AI analysis of the outfit
});

// Outfits relations
export const outfitsRelations = relations(outfits, ({ one }) => ({
  user: one(users, {
    fields: [outfits.userId],
    references: [users.id],
  }),
}));

export const insertOutfitSchema = createInsertSchema(outfits).omit({
  id: true,
  createdAt: true,
});

export type InsertOutfit = z.infer<typeof insertOutfitSchema>;
export type Outfit = typeof outfits.$inferSelect;

export const shoppingItems = pgTable("shopping_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id), // Foreign key reference to users
  name: text("name").notNull(),
  imageUrl: text("image_url").notNull(),
  imageData: text("image_data").notNull(), // Base64 encoded image data
  rating: integer("rating"), // AI-generated rating out of 10
  analysis: text("analysis").notNull(), // AI analysis of how it fits with existing wardrobe
  matchingItemIds: integer("matching_item_ids").array(), // Array of matching clothing item IDs
  createdAt: timestamp("created_at").defaultNow(),
});

// Shopping items relations
export const shoppingItemsRelations = relations(shoppingItems, ({ one }) => ({
  user: one(users, {
    fields: [shoppingItems.userId],
    references: [users.id],
  }),
}));

export const insertShoppingItemSchema = createInsertSchema(shoppingItems).omit({
  id: true,
  createdAt: true,
});

export type InsertShoppingItem = z.infer<typeof insertShoppingItemSchema>;
export type ShoppingItem = typeof shoppingItems.$inferSelect;

// Extended schemas for validation
export const uploadClothingItemSchema = insertClothingItemSchema.extend({
  file: z.any(),
});

export const uploadOutfitSchema = insertOutfitSchema.extend({
  file: z.any(),
});

export const uploadShoppingItemSchema = insertShoppingItemSchema.extend({
  file: z.any(),
});

export const recommendations = pgTable("recommendations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  itemIds: integer("item_ids").array().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  feedback: text("feedback"),
  rating: integer("rating"), // AI-generated rating out of 10
});

export type Recommendation = typeof recommendations.$inferSelect;
export type InsertRecommendation = typeof recommendations.$inferInsert;
