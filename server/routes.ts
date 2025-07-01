import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import * as z from "zod";
import { storage } from "./storage";
import { imageAnalysis } from "./services/imageAnalysis";
import {
  insertClothingItemSchema,
  insertOutfitSchema,
  insertShoppingItemSchema,
  ITEM_CATEGORIES
} from "@shared/schema";
import multer from "multer";
import fs from "fs";
import path from "path";
import authRoutes from "./routes/auth";
import { setupAuth, isAuthenticated } from "./auth";
import { pool } from "./db";
import { RecommendationService } from "./services/recommendation";

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Helper to convert buffer to base64
function bufferToBase64(buffer: Buffer) {
  return buffer.toString('base64');
}

// Helper function to suggest outfits
async function suggestOutfits(items: any[]) {
  try {
    // Simple outfit suggestion logic
    const tops = items.filter(item => item.category === 'Tops').slice(0, 3);
    const bottoms = items.filter(item => item.category === 'Bottoms').slice(0, 3);
    const footwear = items.filter(item => item.category === 'Footwear').slice(0, 2);

    const suggestions = [];

    for (const top of tops) {
      for (const bottom of bottoms) {
        for (const shoe of footwear) {
          suggestions.push({
            items: [top, bottom, shoe],
            reason: `A stylish combination of ${top.name} with ${bottom.name} and ${shoe.name}`
          });
        }
      }
    }

    return suggestions.slice(0, 5); // Limit to 5 suggestions
  } catch (error) {
    console.error("Error generating outfit suggestions:", error);
    return [];
  }
}

// Helper function to analyze shopping items
async function analyzeShoppingItem(imageData: string, wardrobeItems: any[]) {
  try {
    // Simple analysis - you can enhance this later
    return {
      rating: 7,
      analysis: "This item would work well with your existing wardrobe",
      matchingItemIds: wardrobeItems.slice(0, 3).map(item => item.id)
    };
  } catch (error) {
    console.error("Error analyzing shopping item:", error);
    return {
      rating: 5,
      analysis: "Unable to analyze this item",
      matchingItemIds: []
    };
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);

  // Auth routes
  app.use('/api/auth', authRoutes);

  // Clothing Items API
  app.get("/api/clothing-items", async (req: any, res) => {
    try {
      const user = req.user;
      if (!user || !user.id) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const category = req.query.category as string;

      if (category && ITEM_CATEGORIES.includes(category as any)) {
        const items = await storage.getClothingItemsByCategory(category, user.id);
        res.json(items);
      } else {
        const items = await storage.getClothingItems(user.id);
        res.json(items);
      }
    } catch (error) {
      console.error("Error getting clothing items:", error);
      res.status(500).json({ message: "Error fetching clothing items" });
    }
  });

  app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Error logging out:", err);
        return res.status(500).json({ message: "Error logging out" });
      }
      res.status(204).send();
    });
  });

  app.get("/api/clothing-items/:id", async (req: any, res) => {
    try {
      const user = req.user;
      if (!user || !user.id) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const id = parseInt(req.params.id);
      const item = await storage.getClothingItem(id);

      if (!item) {
        return res.status(404).json({ message: "Clothing item not found" });
      }

      res.json(item);
    } catch (error) {
      console.error("Error getting clothing item:", error);
      res.status(500).json({ message: "Error fetching clothing item" });
    }
  });

  app.post("/api/clothing-items", upload.single('file'), async (req: any, res) => {
    try {
      const user = req.user;
      if (!user || !user.id) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      // Extract and validate the text data from the request
      const { name, category, tags } = req.body;

      if (!name || !category || !req.file) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Convert file to base64
      const imageData = bufferToBase64(req.file.buffer);

      // Process tags (convert from string to array if needed)
      const parsedTags = tags ?
        (typeof tags === 'string' ? tags.split(',').map(tag => tag.trim()) : tags) :
        [];

      console.log('Creating clothing item with data:', {
        name,
        category,
        imageDataLength: imageData.length,
        tagsCount: parsedTags.length,
        userId: user.id
      });

      // Create the clothing item with the analysis results
      const clothingItem = await storage.createClothingItem({
        name,
        category,
        imageUrl: `data:${req.file.mimetype};base64,${imageData}`,
        imageData,
        tags: parsedTags,
        userId: user.id,
      });

      console.log('Clothing item created successfully:', {
        id: clothingItem.id,
        name: clothingItem.name,
        category: clothingItem.category
      });

      res.status(201).json(clothingItem);
    } catch (error) {
      console.error("Error creating clothing item:", error);
      res.status(500).json({ message: "Error creating clothing item", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.delete("/api/clothing-items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteClothingItem(id);

      if (!success) {
        return res.status(404).json({ message: "Clothing item not found" });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting clothing item:", error);
      res.status(500).json({ message: "Error deleting clothing item" });
    }
  });

  // Outfit API
  app.get("/api/outfits", async (req: any, res) => {
    try {
      const user = req.user;
      if (!user || !user.id) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const outfits = await storage.getOutfits(user.id);
      res.json(outfits);
    } catch (error) {
      console.error("Error getting outfits:", error);
      res.status(500).json({ message: "Error fetching outfits" });
    }
  });

  app.get("/api/outfits/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const outfit = await storage.getOutfit(id);

      if (!outfit) {
        return res.status(404).json({ message: "Outfit not found" });
      }

      res.json(outfit);
    } catch (error) {
      console.error("Error getting outfit:", error);
      res.status(500).json({ message: "Error fetching outfit" });
    }
  });

  app.post("/api/outfits", upload.single('file'), async (req: any, res) => {
    try {
      const user = req.user;
      if (!user || !user.id) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      // Extract and validate the text data from the request
      const { name, tags, aiGenerated } = req.body;

      if (!name || !req.file) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Convert file to base64
      const imageData = bufferToBase64(req.file.buffer);

      // Process tags (convert from string to array if needed)
      const parsedTags = tags ?
        (typeof tags === 'string' ? tags.split(',').map(tag => tag.trim()) : tags) :
        [];

      // Get all clothing items to identify items in the outfit
      const allItems = await storage.getClothingItems(user.id);

      // Create the outfit with the analysis results
      const outfit = await storage.createOutfit({
        name,
        imageUrl: `data:${req.file.mimetype};base64,${imageData}`,
        imageData,
        aiGenerated: aiGenerated === 'true',
        tags: parsedTags,
        itemIds: [], // Will be populated by the image analysis service
        userId: user.id,
      });

      res.status(201).json(outfit);
    } catch (error) {
      console.error("Error creating outfit:", error);
      res.status(500).json({ message: "Error creating outfit" });
    }
  });

  app.delete("/api/outfits/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteOutfit(id);

      if (!success) {
        return res.status(404).json({ message: "Outfit not found" });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting outfit:", error);
      res.status(500).json({ message: "Error deleting outfit" });
    }
  });

  // Get AI outfit suggestions
  app.get("/api/suggestions", async (req: any, res) => {
    try {
      const user = req.user;
      if (!user || !user.id) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      // Get all clothing items to use for suggestions
      const items = await storage.getClothingItems(user.id);

      // If no items exist, return empty array
      if (items.length === 0) {
        return res.json([]);
      }

      // Get AI suggestions
      const suggestions = await suggestOutfits(items);

      res.json(suggestions);
    } catch (error) {
      console.error("Error getting outfit suggestions:", error);
      res.status(500).json({ message: "Error fetching outfit suggestions" });
    }
  });

  // Shopping Assistant API
  app.get("/api/shopping", async (req: any, res) => {
    try {
      const user = req.user;
      if (!user || !user.id) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const items = await storage.getShoppingItems(user.id);
      res.json(items);
    } catch (error) {
      console.error("Error getting shopping items:", error);
      res.status(500).json({ message: "Error fetching shopping items" });
    }
  });

  app.post("/api/shopping", upload.single('file'), async (req: any, res) => {
    try {
      const user = req.user;
      if (!user || !user.id) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const { name } = req.body;
      if (!name || !req.file) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Convert file to base64
      const imageData = bufferToBase64(req.file.buffer);

      // 1. Analyze image using imageAnalysis service (calls localhost:10000/predict internally)
      const analysisResult = await imageAnalysis.analyzeClothingItem(imageData);
      const { caption, tags } = analysisResult;

      // 2. Get all wardrobe items
      const wardrobeItems = await storage.getClothingItems(user.id);

      // 3. Score similarity with wardrobe items
      function tagSimilarity(tagsA: string[] = [], tagsB: string[] = []): number {
        if (!tagsA || !tagsB) return 0;
        const setA = new Set(tagsA);
        const setB = new Set(tagsB);
        const intersection = new Set([...setA].filter(x => setB.has(x)));
        return intersection.size / Math.max(setA.size, setB.size, 1);
      }
      const matchingScores = wardrobeItems.map(item => ({
        id: item.id,
        score: tagSimilarity(tags, item.tags || [])
      }));
      const matchingItemIds = matchingScores.filter(ms => ms.score > 0.2).map(ms => ms.id); // threshold can be tuned
      const bestScore = matchingScores.length ? Math.max(...matchingScores.map(ms => ms.score)) : 0;
      const rating = Math.round(3 + bestScore * 7); // scale: 3-10

      // 4. Generate analysis using Groq (caption/tags only)
      const { analyzeShoppingItem } = await import("./utils/openai");
      const openaiResult = await analyzeShoppingItem(caption, tags, wardrobeItems);
      const analysis = openaiResult.analysis;

      // 5. Store the shopping item
      const shoppingItem = await storage.createShoppingItem({
        name,
        imageUrl: `data:${req.file.mimetype};base64,${imageData}`,
        imageData,
        rating,
        analysis,
        matchingItemIds,
        userId: user.id,
      });

      res.status(201).json(shoppingItem);
    } catch (error) {
      console.error("Error analyzing shopping item:", error);
      res.status(500).json({ message: "Error analyzing shopping item" });
    }
  });

  app.delete("/api/shopping/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteShoppingItem(id);

      if (!success) {
        return res.status(404).json({ message: "Shopping item not found" });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting shopping item:", error);
      res.status(500).json({ message: "Error deleting shopping item" });
    }
  });

  // Recommendations API
  app.get("/api/recommendations", async (req: any, res) => {
    try {
      const forceRefresh = req.query.force === 'true';
      const user = req.user;
      console.log('[RECOMMENDATIONS] Request by user:', user);
      if (!user || !user.id) {
        console.log('[RECOMMENDATIONS] Not authenticated');
        return res.status(401).json({ message: "Not authenticated" });
      }
      const userId = user.id;

      // Fetch user from DB (optional, for recommendationAvailable)
      const dbUser = await storage.getUser(userId);
      console.log('[RECOMMENDATIONS] DB user:', dbUser);
      if (!dbUser) {
        console.log('[RECOMMENDATIONS] User not found in DB');
        return res.status(404).json({ message: "User not found" });
      }

      // If recommendations are available and we're not forcing a refresh, return saved ones.
      if (dbUser.recommendationAvailable && !forceRefresh) {
        const savedRecs = await storage.getRecommendations(userId);
        console.log('[RECOMMENDATIONS] Saved recommendations:', savedRecs);
        // Sort by rating descending and take top 3
        const topRecs = savedRecs.sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 3);
        const outfits = await Promise.all(topRecs.map(async (rec, idx) => {
          console.log(`[RECOMMENDATIONS] Fetching items for recommendation #${idx} with itemIds:`, rec.itemIds);
          const items = await storage.getClothingItemsByIds(rec.itemIds || []);
          console.log(`[RECOMMENDATIONS] Items fetched:`, items);
          console.log('Recommendation:', rec, 'Items:', items);
          return { ...rec, items };
        }));
        console.log('[RECOMMENDATIONS] Returning saved outfits:', outfits);
        return res.json(outfits);
      }

      // Otherwise, delete old recommendations and generate new ones.
      console.log('[RECOMMENDATIONS] Deleting old recommendations and generating new ones...');
      await storage.deleteRecommendations(userId);
      const recommendationService = new RecommendationService(storage);
      const newRecommendations = await recommendationService.generateRecommendations(userId);
      console.log('[RECOMMENDATIONS] New recommendations:', newRecommendations);

      await storage.setUserRecommendationsAvailable(userId, true);

      // Sort by rating descending and take top 3
      const topNewRecs = newRecommendations.sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 3);
      const outfits = await Promise.all(topNewRecs.map(async (rec, idx) => {
        console.log(`[RECOMMENDATIONS] Fetching items for new recommendation #${idx} with itemIds:`, rec.itemIds);
        const items = await storage.getClothingItemsByIds(rec.itemIds || []);
        console.log(`[RECOMMENDATIONS] Items fetched:`, items);
        console.log('Recommendation:', rec, 'Items:', items);
        return { ...rec, items };
      }));
      console.log('[RECOMMENDATIONS] Returning new outfits count:', outfits.length);
      console.log('[RECOMMENDATIONS] Returning new outfits:', outfits);

      res.json(outfits);
    } catch (error) {
      console.error("[RECOMMENDATIONS] Error in recommendations endpoint:", error);
      res.status(500).json({ message: "Error generating recommendations" });
    }
  });

  // Update a recommendation with feedback
  app.put("/api/recommendations/:id", async (req, res) => {
    try {
      const recommendationId = parseInt(req.params.id);
      const { feedback } = req.body;
      const updated = await storage.updateRecommendationFeedback(recommendationId, feedback);

      if (!updated) {
        return res.status(404).json({ message: "Recommendation not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating recommendation:", error);
      res.status(500).json({ message: "Error updating recommendation" });
    }
  });

  // Save a recommendation with feedback (This can be deprecated or used for other purposes)
  app.post("/api/recommendations", async (req, res) => {
    try {
      const { itemIds, feedback } = req.body;
      // For now, use userId = 1
      const saved = await storage.createRecommendation({
        userId: 1,
        itemIds,
        feedback,
      });
      res.status(201).json(saved);
    } catch (error) {
      console.error("Error saving recommendation:", error);
      res.status(500).json({ message: "Error saving recommendation" });
    }
  });

  // Fetch saved recommendations
  app.get("/api/saved-recommendations", async (req, res) => {
    try {
      // For now, use userId = 1
      const recs = await storage.getRecommendations(4);
      res.json(recs);
    } catch (error) {
      console.error("Error fetching saved recommendations:", error);
      res.status(500).json({ message: "Error fetching saved recommendations" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
