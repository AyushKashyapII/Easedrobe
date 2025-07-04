import {
  users, type User, type InsertUser,
  clothingItems, type ClothingItem, type InsertClothingItem,
  outfits, type Outfit, type InsertOutfit,
  shoppingItems, type ShoppingItem, type InsertShoppingItem,
  recommendations, type Recommendation, type InsertRecommendation
} from "@shared/schema";
import { pool } from "./db";
import { hashPassword } from "./auth";
import { imageAnalysis } from "./services/imageAnalysis";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Clothing Item operations
  getClothingItems(userId?: number): Promise<ClothingItem[]>;
  getClothingItemsByCategory(category: string, userId?: number): Promise<ClothingItem[]>;
  getClothingItem(id: number): Promise<ClothingItem | undefined>;
  createClothingItem(item: InsertClothingItem): Promise<ClothingItem>;
  updateClothingItem(id: number, item: Partial<ClothingItem>): Promise<ClothingItem | undefined>;
  deleteClothingItem(id: number): Promise<boolean>;

  // Outfit operations
  getOutfits(userId?: number): Promise<Outfit[]>;
  getOutfit(id: number): Promise<Outfit | undefined>;
  createOutfit(outfit: InsertOutfit): Promise<Outfit>;
  updateOutfit(id: number, outfit: Partial<InsertOutfit>): Promise<Outfit | undefined>;
  deleteOutfit(id: number): Promise<boolean>;

  // Shopping operations
  getShoppingItems(userId?: number): Promise<ShoppingItem[]>;
  getShoppingItem(id: number): Promise<ShoppingItem | undefined>;
  createShoppingItem(item: InsertShoppingItem): Promise<ShoppingItem>;
  deleteShoppingItem(id: number): Promise<boolean>;

  // Recommendation operations
  createRecommendation(data: InsertRecommendation): Promise<Recommendation>;
  getRecommendations(userId: number): Promise<Recommendation[]>;
  updateRecommendationFeedback(recommendationId: number, feedback: string): Promise<Recommendation | undefined>;
  getClothingItemsByIds(itemIds: number[]): Promise<ClothingItem[]>;
  setUserRecommendationsAvailable(userId: number, available: boolean): Promise<void>;
  deleteRecommendations(userId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations

  async getUser(id: number): Promise<User | undefined> {
    try {
      const result = await pool.query(`SELECT * FROM users WHERE id = $1`, [id]);
      return result.rows[0] as User | undefined;
    } catch (error) {
      console.error("Error getting user:", error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const result = await pool.query(`SELECT * FROM users WHERE username = $1`, [username]);
      return result.rows[0] as User | undefined;
    } catch (error) {
      console.error("Error getting user by username:", error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Hash the password before storing
    const hashedPassword = await hashPassword(insertUser.password);

    try {
      const result = await pool.query(`
        INSERT INTO users (email, username, password, first_name, last_name, profile_image_url)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        insertUser.email,
        insertUser.username,
        hashedPassword,
        insertUser.firstName,
        insertUser.lastName,
        insertUser.profileImageUrl
      ]);

      if (!result.rows[0]) {
        throw new Error("User not created");
      }

      return result.rows[0] as User;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  // Clothing Item operations

  async getClothingItems(userId: number): Promise<ClothingItem[]> {
    const result = await pool.query(
      `SELECT * FROM clothing_items WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows.map(row => {
      let imageUrl = row.image_url;
      if (imageUrl && !imageUrl.startsWith('data:') && !imageUrl.startsWith('http')) {
        const firstChar = imageUrl.charAt(0);
        let mimeType = 'image/jpeg';
        if (firstChar === 'i') mimeType = 'image/png';
        else if (firstChar === 'R') mimeType = 'image/gif';
        else if (firstChar === 'U') mimeType = 'image/webp';
        imageUrl = `data:${mimeType};base64,${imageUrl}`;
      }
      return {
        id: row.id,
        userId: row.user_id,
        name: row.name,
        category: row.category,
        imageUrl,
        imageData: row.image_data,
        rating: row.rating,
        caption: row.caption,
        type: row.type,
        color: row.color,
        material: row.material,
        pattern: row.pattern,
        style: row.style,
        fit: row.fit,
        features: row.features,
        targetAudience: row.target_audience,
        createdAt: row.created_at
      } as ClothingItem;
    });
  }

  async getClothingItemsByCategory(category: string, userId: number = 1): Promise<ClothingItem[]> {
    try {
      const result = await pool.query(
        `SELECT * FROM clothing_items WHERE category = $1 AND user_id = $2`,
        [category, userId]
      );
      return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        name: row.name,
        category: row.category,
        imageUrl: row.image_url,
        imageData: row.image_data,
        rating: row.rating,
        caption: row.caption,
        type: row.type,
        color: row.color,
        material: row.material,
        pattern: row.pattern,
        style: row.style,
        fit: row.fit,
        features: row.features,
        targetAudience: row.target_audience,
        createdAt: row.created_at
      })) as ClothingItem[];
    } catch (error) {
      console.error("Error getting clothing items by category:", error);
      return [];
    }
  }

  async getClothingItem(id: number): Promise<ClothingItem | undefined> {
    try {
      const result = await pool.query(`SELECT * FROM clothing_items WHERE id = $1`, [id]);
      if (!result.rows[0]) return undefined;
      const row = result.rows[0];
      let imageUrl = row.image_url;
      if (imageUrl && !imageUrl.startsWith('data:') && !imageUrl.startsWith('http')) {
        const firstChar = imageUrl.charAt(0);
        let mimeType = 'image/jpeg';
        if (firstChar === 'i') mimeType = 'image/png';
        else if (firstChar === 'R') mimeType = 'image/gif';
        else if (firstChar === 'U') mimeType = 'image/webp';
        imageUrl = `data:${mimeType};base64,${imageUrl}`;
      }
      return {
        id: row.id,
        userId: row.user_id,
        name: row.name,
        category: row.category,
        imageUrl,
        imageData: row.image_data,
        rating: row.rating,
        caption: row.caption,
        type: row.type,
        color: row.color,
        material: row.material,
        pattern: row.pattern,
        style: row.style,
        fit: row.fit,
        features: row.features,
        targetAudience: row.target_audience,
        createdAt: row.created_at
      } as ClothingItem;
    } catch (error) {
      console.error("Error getting clothing item:", error);
      return undefined;
    }
  }

  async createClothingItem(insertItem: InsertClothingItem): Promise<ClothingItem> {
    try {
      // Analyze the image using the Python backend
      const analysis = await imageAnalysis.analyzeClothingItem(insertItem.imageData);
      console.log('Received analysis in createClothingItem:', analysis);

      const result = await pool.query(`
        INSERT INTO clothing_items (
          name, category, image_url, image_data, rating, user_id, caption,
          type, color, material, pattern, style, fit, features, target_audience
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
      `, [
        insertItem.name,
        insertItem.category,
        insertItem.imageUrl,
        insertItem.imageData,
        analysis.rating,
        insertItem.userId,
        analysis.caption,
        analysis.type,
        analysis.color,
        analysis.material,
        analysis.pattern,
        analysis.style,
        analysis.fit,
        analysis.features,
        analysis.targetAudience
      ]);

      if (!result.rows[0]) {
        throw new Error("Clothing item not created");
      }

      const row = result.rows[0];
      // Set recommendationAvailable to false for the user
      await this.setUserRecommendationsAvailable(row.user_id, false);
      return {
        id: row.id,
        userId: row.user_id,
        name: row.name,
        category: row.category,
        imageUrl: row.image_url,
        imageData: row.image_data,
        rating: row.rating,
        caption: row.caption,
        type: row.type,
        color: row.color,
        material: row.material,
        pattern: row.pattern,
        style: row.style,
        fit: row.fit,
        features: row.features,
        targetAudience: row.target_audience,
        createdAt: row.created_at
      } as ClothingItem;
    } catch (error) {
      console.error("Error creating clothing item:", error);
      throw error;
    }
  }

  async updateClothingItem(id: number, data: Partial<ClothingItem>): Promise<ClothingItem | undefined> {
    let { category, imageUrl, caption, type, color, material, pattern, style, fit, features, targetAudience } = data;
    const columns = [];
    const values = [];

    if (category !== undefined) {
      columns.push("category");
      values.push(category);
    }

    if (imageUrl !== undefined) {
      // If not a data URL and not an http URL, wrap as data URL with detected mime type
      if (!imageUrl.startsWith('data:') && !imageUrl.startsWith('http')) {
        const firstChar = imageUrl.charAt(0);
        let mimeType = 'image/jpeg'; // default
        if (firstChar === 'i') mimeType = 'image/png';
        else if (firstChar === 'R') mimeType = 'image/gif';
        else if (firstChar === 'U') mimeType = 'image/webp';
        imageUrl = `data:${mimeType};base64,${imageUrl}`;
      }
      columns.push("image_url");
      values.push(imageUrl);
    }

    if (caption !== undefined) {
      columns.push("caption");
      values.push(caption);
    }

    if (type !== undefined) {
      columns.push("type");
      values.push(type);
    }

    if (color !== undefined) {
      columns.push("color");
      values.push(color);
    }

    if (material !== undefined) {
      columns.push("material");
      values.push(material);
    }

    if (pattern !== undefined) {
      columns.push("pattern");
      values.push(pattern);
    }

    if (style !== undefined) {
      columns.push("style");
      values.push(style);
    }

    if (fit !== undefined) {
      columns.push("fit");
      values.push(fit);
    }

    if (features !== undefined) {
      columns.push("features");
      values.push(features);
    }

    if (targetAudience !== undefined) {
      columns.push("target_audience");
      values.push(targetAudience);
    }

    if (columns.length === 0) {
      return this.getClothingItem(id); // Nothing to update
    }

    const setClause = columns.map((col, i) => `${col} = $${i + 2}`).join(", ");
    values.unshift(id);

    const result = await pool.query(
      `UPDATE clothing_items SET ${setClause} WHERE id = $1 RETURNING *`,
      values
    );

    return result.rows[0] as ClothingItem | undefined;
  }

  async deleteClothingItem(id: number): Promise<boolean> {
    try {
      await pool.query(`DELETE FROM clothing_items WHERE id = $1`, [id]);
      return true;
    } catch (error) {
      console.error("Error deleting clothing item:", error);
      return false;
    }
  }

  // Outfit operations

  async getOutfits(userId?: number): Promise<Outfit[]> {
    try {
      if (userId) {
        const result = await pool.query(`SELECT * FROM outfits WHERE user_id = $1`, [userId]);
        return result.rows.map(row => ({
          id: row.id,
          userId: row.user_id,
          name: row.name,
          imageUrl: row.image_url,
          imageData: row.image_data,
          rating: row.rating,
          aiGenerated: row.ai_generated,
          tags: row.tags,
          createdAt: row.created_at,
          itemIds: row.item_ids,
          analysis: row.analysis
        })) as Outfit[];
      }
      const result = await pool.query(`SELECT * FROM outfits`);

      return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        name: row.name,
        imageUrl: row.image_url,
        imageData: row.image_data,
        rating: row.rating,
        aiGenerated: row.ai_generated,
        tags: row.tags,
        createdAt: row.created_at,
        itemIds: row.item_ids,
        analysis: row.analysis
      })) as Outfit[];
    } catch (error) {
      console.error("Error getting outfits:", error);
      return [];
    }
  }

  async getOutfit(id: number): Promise<Outfit | undefined> {
    try {
      const result = await pool.query(`SELECT * FROM outfits WHERE id = $1`, [id]);
      if (!result.rows[0]) return undefined;

      const row = result.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        name: row.name,
        imageUrl: row.image_url,
        imageData: row.image_data,
        rating: row.rating,
        aiGenerated: row.ai_generated,
        tags: row.tags,
        createdAt: row.created_at,
        itemIds: row.item_ids,
        analysis: row.analysis
      } as Outfit;
    } catch (error) {
      console.error("Error getting outfit:", error);
      return undefined;
    }
  }

  async createOutfit(insertOutfit: InsertOutfit): Promise<Outfit> {
    try {
      // Analyze the image using the Python backend
      const analysis = await imageAnalysis.analyzeClothingItem(insertOutfit.imageData);
      console.log('Received analysis in createOutfit:', analysis);

      const result = await pool.query(`
        INSERT INTO outfits (
          name, image_url, image_data, tags, rating, analysis, ai_generated, item_ids, user_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
        insertOutfit.name,
        insertOutfit.imageUrl,
        insertOutfit.imageData,
        analysis.tags || [],
        analysis.rating || 5,
        analysis.caption || "Analysis not available",
        insertOutfit.aiGenerated,
        insertOutfit.itemIds,
        insertOutfit.userId
      ]);

      if (!result.rows[0]) {
        throw new Error("Outfit not created");
      }

      const row = result.rows[0];
      // Set recommendationAvailable to false for the user
      await this.setUserRecommendationsAvailable(row.user_id, false);
      return {
        id: row.id,
        userId: row.user_id,
        name: row.name,
        imageUrl: row.image_url,
        imageData: row.image_data,
        rating: row.rating,
        aiGenerated: row.ai_generated,
        tags: row.tags,
        createdAt: row.created_at,
        itemIds: row.item_ids,
        analysis: row.analysis
      } as Outfit;
    } catch (error) {
      console.error("Error creating outfit:", error);
      throw error;
    }
  }

  async updateOutfit(id: number, updateData: Partial<InsertOutfit>): Promise<Outfit | undefined> {
    try {
      const fields = Object.keys(updateData).map((key, index) => `${key} = $${index + 2}`).join(', ');
      const values = Object.values(updateData);

      const result = await pool.query(`
        UPDATE outfits 
        SET ${fields}
        WHERE id = $1
        RETURNING *
      `, [id, ...values]);

      return result.rows[0] as Outfit | undefined;
    } catch (error) {
      console.error("Error updating outfit:", error);
      return undefined;
    }
  }

  async deleteOutfit(id: number): Promise<boolean> {
    try {
      await pool.query(`DELETE FROM outfits WHERE id = $1`, [id]);
      return true;
    } catch (error) {
      console.error("Error deleting outfit:", error);
      return false;
    }
  }

  // Shopping operations

  async getShoppingItems(userId?: number): Promise<ShoppingItem[]> {
    try {
      if (userId) {
        const result = await pool.query(`SELECT * FROM shopping_items WHERE user_id = $1`, [userId]);
        return result.rows as ShoppingItem[];
      }
      const result = await pool.query(`SELECT * FROM shopping_items`);
      return result.rows as ShoppingItem[];
    } catch (error) {
      console.error("Error getting shopping items:", error);
      return [];
    }
  }

  async getShoppingItem(id: number): Promise<ShoppingItem | undefined> {
    try {
      const result = await pool.query(`SELECT * FROM shopping_items WHERE id = $1`, [id]);
      return result.rows[0] as ShoppingItem | undefined;
    } catch (error) {
      console.error("Error getting shopping item:", error);
      return undefined;
    }
  }

  async createShoppingItem(insertItem: InsertShoppingItem): Promise<ShoppingItem> {
    try {
      const result = await pool.query(`
        INSERT INTO shopping_items (
          name, image_url, image_data, rating, analysis, matching_item_ids, user_id,
          type, color, material, pattern, style, fit, target_audience,
          styleCompatibility, colorHarmony, uniquenessOfType, 
          fitMaterialDiversity, outfitCombinationPotential
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING *
      `, [
        insertItem.name,
        insertItem.imageUrl,
        insertItem.imageData,
        insertItem.rating,
        insertItem.analysis,
        insertItem.matchingItemIds,
        insertItem.userId,
        insertItem.type,
        insertItem.color,
        insertItem.material,
        insertItem.pattern,
        insertItem.style,
        insertItem.fit,
        insertItem.targetAudience,
        insertItem.styleCompatibility,
        insertItem.colorHarmony,
        insertItem.uniquenessOfType,
        insertItem.fitMaterialDiversity,
        insertItem.outfitCombinationPotential
      ]);

      if (!result.rows[0]) {
        throw new Error("Shopping item not created");
      }

      return result.rows[0] as ShoppingItem;
    } catch (error) {
      console.error("Error creating shopping item:", error);
      throw error;
    }
  }

  async deleteShoppingItem(id: number): Promise<boolean> {
    try {
      await pool.query(`DELETE FROM shopping_items WHERE id = $1`, [id]);
      return true;
    } catch (error) {
      console.error("Error deleting shopping item:", error);
      return false;
    }
  }

  // Recommendation operations

  async createRecommendation(data: InsertRecommendation): Promise<Recommendation> {
    const result = await pool.query(
      `INSERT INTO recommendations (user_id, item_ids, feedback, rating) VALUES ($1, $2, $3, $4) RETURNING *`,
      [data.userId, data.itemIds, data.feedback, data.rating]
    );
    if (typeof data.userId !== "number") {
      throw new Error("userId is required to set recommendations available flag");
    }
    await this.setUserRecommendationsAvailable(data.userId as number, true);
    return result.rows[0] as Recommendation;
  }

  async getRecommendations(userId: number): Promise<Recommendation[]> {
    const result = await pool.query(
      `SELECT * FROM recommendations WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows as Recommendation[];
  }

  async updateRecommendationFeedback(recommendationId: number, feedback: string): Promise<Recommendation | undefined> {
    const result = await pool.query(
      `UPDATE recommendations SET feedback = $1 WHERE id = $2 RETURNING *`,
      [feedback, recommendationId]
    );
    return result.rows[0] as Recommendation | undefined;
  }

  async getClothingItemsByIds(itemIds: number[]): Promise<ClothingItem[]> {
    console.log('getClothingItemsByIds called with:', itemIds, 'type:', typeof itemIds, 'isArray:', Array.isArray(itemIds));
    // Flatten in case of nested array
    const flatIds = Array.isArray(itemIds[0]) ? itemIds[0] : itemIds;
    if (flatIds.length === 0) return [];
    const result = await pool.query(`SELECT * FROM clothing_items WHERE id = ANY($1::int[])`, [flatIds]);
    return result.rows as ClothingItem[];
  }

  async setUserRecommendationsAvailable(userId: number, available: boolean): Promise<void> {
    await pool.query(`UPDATE users SET recommendation_available = $1 WHERE id = $2`, [available, userId]);
  }

  async deleteRecommendations(userId: number): Promise<void> {
    await pool.query(`DELETE FROM recommendations WHERE user_id = $1`, [userId]);
  }
}

export const storage = new DatabaseStorage();
