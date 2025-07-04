import OpenAI from "openai";
import { ClothingItem } from "@shared/schema";


const GROQ_API_KEY = process.env.GROQ_API_KEY ;
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
        content: `Description: ${caption}\nTags: [${Array.isArray(tags) ? tags.join(", ") : tags || ""}]`
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

type ComprehensiveShoppingAnalysisResult = {
  rating: number;
  analysis: string;
  matchingItemIds: number[];
  potentialOutfits: number;
  // New structured attributes
  type: string;
  color: string[];
  material: string[];
  style: string[];
  fit: string;
  pattern: string[];
  targetAudience: string;
  // Detailed scoring breakdown
  stylecompatibility: number;
  colorharmony: number;
  uniquenessoftype: number;
  fitmaterialdiversity: number;
  outfitcombinationpotential: number;
  // Recommendations if score > 7
  recommendations?: any[];
};

interface StructuredAttributes {
  type?: string;
  color?: string[];
  material?: string[];
  pattern?: string[];
  style?: string[];
  fit?: string;
  features?: string[];
  targetAudience?: string;
}

export async function analyzeShoppingItem(
  caption: string,
  attributes: StructuredAttributes,
  wardrobeItems: ClothingItem[]
): Promise<ComprehensiveShoppingAnalysisResult> {
  try {
    console.log("[analyzeShoppingItem] caption:", caption);
    console.log("[analyzeShoppingItem] attributes:", attributes);
    console.log("[analyzeShoppingItem] wardrobeItems:", wardrobeItems);

    // Create a comprehensive description from structured attributes
    const attributeDescription = [
      attributes.type && `Type: ${attributes.type}`,
      attributes.color && `Color: ${Array.isArray(attributes.color) ? attributes.color.join(', ') : attributes.color}`,
      attributes.material && `Material: ${Array.isArray(attributes.material) ? attributes.material.join(', ') : attributes.material}`,
      attributes.style && `Style: ${Array.isArray(attributes.style) ? attributes.style.join(', ') : attributes.style}`,
      attributes.fit && `Fit: ${attributes.fit}`,
      attributes.pattern && `Pattern: ${Array.isArray(attributes.pattern) ? attributes.pattern.join(', ') : attributes.pattern}`,
      attributes.targetAudience && `Target Audience: ${attributes.targetAudience}`,
      attributes.features && `Features: ${Array.isArray(attributes.features) ? attributes.features.join(', ') : attributes.features}`
    ].filter(Boolean).join(' | ');

    const wardrobeDescription = wardrobeItems.map(item =>
      `ID: ${item.id}, Name: ${item.name}, Category: ${item.category}, Type: ${item.type || 'N/A'}, Color: ${Array.isArray(item.color) ? item.color.join(', ') : item.color || 'N/A'}, Style: ${Array.isArray(item.style) ? item.style.join(', ') : item.style || 'N/A'}, Material: ${Array.isArray(item.material) ? item.material.join(', ') : item.material || 'N/A'}, Fit: ${item.fit || 'N/A'}, Pattern: ${Array.isArray(item.pattern) ? item.pattern.join(', ') : item.pattern || 'N/A'}, Target Audience: ${item.targetAudience || 'N/A'}`
    ).join('\n');

    const messages = [
      {
        role: "system",
        content: `You are a comprehensive fashion analysis AI that evaluates shopping items against a user's existing wardrobe.

ANALYSIS CRITERIA:
1. Style Compatibility (2.5 pts): Is it compatible with user's dominant style (e.g., streetwear, formal)?
2. Color Harmony (2.0 pts): Does it complement or contrast user's commonly used colors?
3. Uniqueness of Type (1.5 pts): Is this type missing or overrepresented in wardrobe?
4. Fit/Material Diversity (1.5 pts): Is this adding a new fit or texture variety?
5. Outfit Combination Potential (2.5 pts): Can this item form complete outfits with other wardrobe pieces?

SCORING BREAKDOWN:
- Style Compatibility: 2.5 pts
- Color Harmony: 2.0 pts  
- Uniqueness of Type: 1.5 pts
- Fit/Material Diversity: 1.5 pts
- Outfit Combination Potential: 2.5 pts
Total: 10 pts

User's existing wardrobe:
${wardrobeDescription}

Based on the description, attributes, and existing wardrobe, provide a comprehensive analysis in JSON format with these keys:
- rating: Overall score (1-10)
- analysis: Detailed explanation of the analysis
- matchingItemIds: Array of wardrobe item IDs that would work well with this item
- potentialOutfits: Number of potential new outfits
- type: The type of clothing item
- color: Array of colors
- material: Array of materials
- style: Array of styles
- fit: The fit type
- pattern: Array of patterns
- targetAudience: Target audience
- stylecompatibility: Score for style compatibility (0-2.5)
- colorharmony: Score for color harmony (0-2.0)
- uniquenessoftype: Score for uniqueness (0-1.5)
- fitmaterialdiversity: Score for diversity (0-1.5)
- outfitcombinationpotential: Score for outfit potential (0-2.5)

If the overall rating is 7 or higher, also include:
- recommendations: Array of outfit recommendations using existing wardrobe items`
      },
      {
        role: "user",
        content: `Description: ${caption}\nItem Attributes: ${attributeDescription}`
      }
    ];

    const response = await groqChatCompletion(messages, { type: "json_object" });
    const result = JSON.parse(response.choices[0].message.content || "{}");

    return {
      rating: Math.min(10, Math.max(1, Math.round(result.rating || 5))),
      analysis: result.analysis || "No analysis provided",
      matchingItemIds: result.matchingItemIds || [],
      potentialOutfits: result.potentialOutfits || 0,
      type: result.type || "Unknown",
      color: Array.isArray(result.color) ? result.color : [result.color || "Unknown"],
      material: Array.isArray(result.material) ? result.material : [result.material || "Unknown"],
      style: Array.isArray(result.style) ? result.style : [result.style || "Unknown"],
      fit: result.fit || "Unknown",
      pattern: Array.isArray(result.pattern) ? result.pattern : [result.pattern || "Unknown"],
      targetAudience: result.targetAudience || "Unknown",
      stylecompatibility: Math.round(result.stylecompatibility * 10),
      colorharmony: Math.round(result.colorharmony * 10),
      uniquenessoftype: Math.round(result.uniquenessoftype * 10),
      fitmaterialdiversity: Math.round(result.fitmaterialdiversity * 10),
      outfitcombinationpotential: Math.round(result.outfitcombinationpotential * 10),
      recommendations: result.recommendations || []
    };
  } catch (error: any) {
    console.error("Groq shopping analysis error:", error);
    return {
      rating: 5,
      analysis: "Unable to analyze this item against your wardrobe. Please try again.",
      matchingItemIds: [],
      potentialOutfits: 0,
      type: "Unknown",
      color: ["Unknown"],
      material: ["Unknown"],
      style: ["Unknown"],
      fit: "Unknown",
      pattern: ["Unknown"],
      targetAudience: "Unknown",
      stylecompatibility: 0,
      colorharmony: 0,
      uniquenessoftype: 0,
      fitmaterialdiversity: 0,
      outfitcombinationpotential: 0
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
