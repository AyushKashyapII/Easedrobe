import OpenAI from "openai";
import { ClothingItem } from "@shared/schema";


const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || "llama3-70b-8192";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

async function groqChatCompletion(messages: any[], response_format: any = { type: "json_object" }) {
  console.log("[Groq] Sending chat completion request:", JSON.stringify({ messages, response_format }, null, 2));
  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      response_format,
    }),
  });
  console.log("[Groq] Response status:", res.status);
  if (!res.ok) {
    const errorText = await res.text();
    console.error("[Groq] Error response:", errorText);
    throw new Error(`Groq API error: ${res.status}`);
  }
  const data = await res.json();
  console.log("[Groq] Response data:", JSON.stringify(data, null, 2));
  return data;
}

type ClothingAnalysisResult = {
  rating: number;
  analysis: string;
  category?: string;
  identifiedItems?: number[];
};

type ShoppingAnalysisResult = {
  rating: number;
  analysis: string;
  matchingItemIds: number[];
  potentialOutfits: number;
};

type OutfitSuggestion = {
  name: string;
  itemIds: number[];
  rating: number;
  rationale: string;
  aiGenerated: boolean;
  tags: string[];
};

/**
 * Analyzes a clothing image and returns rating, analysis, and other information
 */
export async function analyzeImage(caption: string, tags: string[]): Promise<ClothingAnalysisResult> {
  try {
    const messages = [
      {
        role: "system",
        content: `You are a fashion expert AI that analyzes clothing items and outfits.\nAnalyze the provided description and tags and return:\n1. A rating from 1-10 (where 10 is the highest quality/style)\n2. A brief analysis of the style, quality, and versatility\n3. The category of the clothing item if it's a single item (Tops, Bottoms, Outerwear, Dresses, Footwear, Accessories)\nReturn your analysis in JSON format with the following keys: rating, analysis, category (if applicable).`
      },
      {
        role: "user",
        content: `Description: ${caption}\nTags: [${tags.join(", ")}]`
      }
    ];
    const response = await groqChatCompletion(messages, { type: "json_object" });
    const result = JSON.parse(response.choices[0].message.content || "{}");
    return {
      rating: Math.min(10, Math.max(1, Math.round(result.rating || 5))),
      analysis: result.analysis || "No analysis provided",
      category: result.category,
      identifiedItems: result.identifiedItems || []
    };
  } catch (error: any) {
    console.error("Groq analysis error:", error);
    return {
      rating: 5,
      analysis: "Unable to analyze image. Please try again.",
      identifiedItems: []
    };
  }
}

export async function analyzeShoppingItem(
  caption: string,
  tags: string[],
  wardrobeItems: ClothingItem[]
): Promise<ShoppingAnalysisResult> {
  try {
    console.log("[analyzeShoppingItem] caption:", caption);
    console.log("[analyzeShoppingItem] tags:", tags);
    console.log("[analyzeShoppingItem] wardrobeItems:", wardrobeItems);
    const wardrobeDescription = wardrobeItems.map(item =>
      `ID: ${item.id}, Name: ${item.name}, Category: ${item.category}, Rating: ${item.rating || 'N/A'}`
    ).join('\n');
    const messages = [
      {
        role: "system",
        content: `You are a shopping assistant AI that helps users decide if a clothing item would be a good addition to their wardrobe.\nAnalyze the provided item description and tags and compare it with the user's existing wardrobe items.\n\nUser's existing wardrobe:\n${wardrobeDescription}\n\nBased on the description, tags, and the existing wardrobe, provide:\n1. A rating from 1-10 for how well this item would fit in their wardrobe\n2. An analysis explaining why this would be a good/bad purchase\n3. A list of item IDs from their wardrobe that would match well with this item\n4. An estimate of how many potential new outfits could be created\nReturn your analysis in JSON format with the following keys: rating, analysis, matchingItemIds (array of IDs), potentialOutfits (number).`
      },
      {
        role: "user",
        content: `Description: ${caption}\nTags: [${tags.join(", ")}]`
      }
    ];
    //console.log("[analyzeShoppingItem] messages:", JSON.stringify(messages, null, 2));
    const response = await groqChatCompletion(messages, { type: "json_object" });
    //console.log("[analyzeShoppingItem] Groq response:", response);
    const result = JSON.parse(response.choices[0].message.content || "{}");
    //console.log("[analyzeShoppingItem] Parsed result:", result);
    return {
      rating: Math.min(10, Math.max(1, Math.round(result.rating || 5))),
      analysis: result.analysis || "No analysis provided",
      matchingItemIds: result.matchingItemIds || [],
      potentialOutfits: result.potentialOutfits || 0
    };
  } catch (error: any) {
    console.error("Groq shopping analysis error:", error);
    return {
      rating: 5,
      analysis: "Unable to analyze this item against your wardrobe. Please try again.",
      matchingItemIds: [],
      potentialOutfits: 0
    };
  }
}

export async function suggestOutfits(wardrobeItems: ClothingItem[]): Promise<OutfitSuggestion[]> {
  try {
    if (wardrobeItems.length < 2) {
      return [];
    }
    const wardrobeDescription = wardrobeItems.map(item =>
      `ID: ${item.id}, Name: ${item.name}, Category: ${item.category}, Rating: ${item.rating || 'N/A'}`
    ).join('\n');
    const messages = [
      {
        role: "system",
        content: `You are a fashion stylist AI that suggests outfit combinations from a user's existing wardrobe.\nBased on the user's wardrobe items, suggest 3 different outfit combinations.\n\nUser's existing wardrobe:\n${wardrobeDescription}\n\nFor each suggestion, provide:\n1. A name for the outfit (e.g., "Casual Friday", "Summer Evening")\n2. The item IDs that make up the outfit (should be IDs from the user's wardrobe)`
      },
      {
        role: "user",
        content: [
          { type: "text", text: "Suggest 3 outfits from my wardrobe." }
        ]
      }
    ];
    const response = await groqChatCompletion(messages, { type: "json_object" });
    const result = JSON.parse(response.choices[0].message.content || "[]");
    return Array.isArray(result) ? result : [];
  } catch (error: any) {
    console.error("Groq outfit suggestion error:", error);
    return [];
  }
}
