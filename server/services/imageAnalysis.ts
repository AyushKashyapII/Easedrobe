import { HfInference } from "@huggingface/inference";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { Document } from "@langchain/core/documents";
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import FormData from 'form-data';
// import { MemoryVectorStore } from "@langchain/community/vectorstores/memory";


// Define your clothing categories
export const ITEM_CATEGORIES = [
    "Tops",
    "Bottoms",
    "Dresses",
    "Outerwear",
    "Footwear",
    "Accessories"
];

// Define clothing item interface
export interface ClothingItem {
    id: string;
    name: string;
    category: string;
    imageUrl?: string;
    color?: string;
    material?: string;
    style?: string;
    tags?: string[];
    rating?: number;
    seasonalRating?: {
        spring: number;
        summer: number;
        fall: number;
        winter: number;
    };
    occasions?: string[];
}

interface ImageAnalysisResult {
    category: string;
    tags: string[];
    color: string;
    material: string;
    style: string;
    occasions: string[];
    rating: number;
    analysis: string;
}

export class ImageAnalysisService {
    private hf: HfInference;
    private embeddings: HuggingFaceInferenceEmbeddings;

    constructor(apiKey: string) {
        // Initialize Hugging Face client
        this.hf = new HfInference(apiKey);

        // Initialize LangChain embeddings
        this.embeddings = new HuggingFaceInferenceEmbeddings({
            apiKey: apiKey,
            model: "sentence-transformers/all-MiniLM-L6-v2"
        });
    }

    private async analyzeImageWithAI(imageData: string): Promise<ImageAnalysisResult> {
        try {
            // Convert base64 to Blob for Hugging Face API
            const imageBuffer = Buffer.from(imageData.replace(/^data:image\/\w+;base64,/, ''), 'base64');
            const imageBlob = new Blob([imageBuffer], { type: 'image/jpeg' });

            const imageClassification = await this.hf.imageClassification({
                model: "microsoft/resnet-50",
                data: imageBlob
            });

            // Use Hugging Face's image-to-text model for detailed description
            const imageToText = await this.hf.imageToText({
                model: "Salesforce/blip-image-captioning-large",
                data: imageBlob
            });

            // Extract category from classification results
            const category = this.determineCategory(imageClassification);

            // Extract attributes from the image caption
            const { tags, color, material, style, occasions } = this.extractAttributes(imageToText.generated_text || "");

            return {
                category,
                tags,
                color,
                material,
                style,
                occasions,
                rating: this.calculateRating(tags, style, occasions),
                analysis: imageToText.generated_text || "No description available"
            };
        } catch (error: any) {
            console.error("Hugging Face analysis error:", error);
            return {
                category: "Tops",
                tags: ["casual", "unknown"],
                color: "unknown",
                material: "unknown",
                style: "casual",
                occasions: ["casual"],
                rating: 5,
                analysis: "Unable to analyze image. Please try again."
            };
        }
    }

    private determineCategory(classification: any[]): string {
        // Map classification results to our categories
        const categoryMap: { [key: string]: string } = {
            "t-shirt": "Tops",
            "shirt": "Tops",
            "blouse": "Tops",
            "sweater": "Tops",
            "hoodie": "Tops",
            "pants": "Bottoms",
            "jeans": "Bottoms",
            "shorts": "Bottoms",
            "skirt": "Bottoms",
            "dress": "Dresses",
            "jacket": "Outerwear",
            "coat": "Outerwear",
            "cardigan": "Outerwear",
            "shoes": "Footwear",
            "sneakers": "Footwear",
            "boots": "Footwear",
            "sandals": "Footwear",
            "heels": "Footwear",
            "hat": "Accessories",
            "bag": "Accessories",
            "scarf": "Accessories",
            "jewelry": "Accessories",
            "belt": "Accessories"
        };

        // Get the highest confidence prediction
        const topPrediction = classification[0];
        return categoryMap[topPrediction.label.toLowerCase()] || "Tops";
    }

    private extractAttributes(caption: string): {
        tags: string[],
        color: string,
        material: string,
        style: string,
        occasions: string[]
    } {
        const tags: string[] = [];
        let color = "unknown";
        let material = "unknown";
        let style = "casual";
        const occasions: string[] = ["casual"];

        // Extract color
        const colors = ["red", "blue", "green", "black", "white", "yellow", "purple",
            "pink", "brown", "gray", "beige", "navy", "turquoise", "orange"];
        for (const c of colors) {
            if (caption.toLowerCase().includes(c)) {
                color = c;
                tags.push(c);
                break;
            }
        }

        // Extract material
        const materials = ["cotton", "silk", "wool", "leather", "denim", "linen",
            "polyester", "velvet", "suede", "satin", "nylon", "canvas"];
        for (const m of materials) {
            if (caption.toLowerCase().includes(m)) {
                material = m;
                tags.push(m);
                break;
            }
        }

        // Extract style
        const styles = ["casual", "formal", "sporty", "elegant", "vintage", "modern",
            "bohemian", "minimalist", "streetwear", "business", "party"];
        for (const s of styles) {
            if (caption.toLowerCase().includes(s)) {
                style = s;
                tags.push(s);
                break;
            }
        }

        // Extract occasions
        const occasionTypes = ["casual", "office", "formal", "party", "sports",
            "beach", "outdoors", "date", "wedding", "interview"];
        for (const o of occasionTypes) {
            if (caption.toLowerCase().includes(o)) {
                occasions.push(o);
                tags.push(o);
            }
        }

        // Add some basic pattern detection
        const patterns = ["striped", "checked", "plaid", "floral", "polka dot", "solid"];
        for (const p of patterns) {
            if (caption.toLowerCase().includes(p)) {
                tags.push(p);
            }
        }

        return { tags, color, material, style, occasions };
    }

    private calculateRating(tags: string[], style: string, occasions: string[]): number {
        // More sophisticated rating calculation
        const uniqueFeatures = new Set([...tags, style, ...occasions]);
        const baseRating = Math.min(10, Math.max(5, uniqueFeatures.size + 3));
        return baseRating;
    }

    async analyzeClothingItem(imageData: string): Promise<any> {
        try {
            // Convert base64 to buffer for sending to Python backend
            const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');

            // Create a form and append the image buffer
            const form = new FormData();
            form.append('file', buffer, {
                filename: 'clothing_item.jpg',
                contentType: 'image/jpeg',
            });

            console.log('Sending request to Python backend...');

            // Send request to Python backend using axios
            const response = await axios.post('http://localhost:10000/predict', form, {
                headers: {
                    ...form.getHeaders(),
                },
            });

            // Log the raw response
            console.log('Raw response from Python backend:', JSON.stringify(response.data, null, 2));

            // Extract caption and attributes from the new structured format
            const { caption, attributes } = response.data;
            console.log('Extracted data:', {
                caption,
                attributes
            });

            // Parse the structured attributes
            const {
                type,
                color,
                material,
                pattern,
                style,
                fit,
                features,
                target_audience
            } = attributes || {};

            // Return the structured analysis result
            return {
                caption,
                // Structured attributes
                type,
                color,
                material,
                pattern,
                style,
                fit,
                features,
                targetAudience: target_audience,
                rating: 7,  // You can calculate this based on attributes if needed
                analysis: caption || "No caption available"
            };

        } catch (error: any) {
            console.error("Error calling Python backend:", error.message);
            if (error.response) {
                console.error("Response data:", error.response.data);
                console.error("Response status:", error.response.status);
            }
            // Return a default/error structure if the call fails
            return {
                caption: "Failed to analyze image",
                type: "unknown",
                color: [],
                material: [],
                pattern: [],
                style: [],
                fit: "unknown",
                features: [],
                targetAudience: "unknown",
                rating: 0,
                analysis: "Failed to get analysis from Python backend."
            };
        }
    }

    private calculateSeasonalRating(analysis: any): { spring: number; summer: number; fall: number; winter: number } {
        // Logic to determine seasonal ratings based on material, color, and style
        let spring = 5;
        let summer = 5;
        let fall = 5;
        let winter = 5;

        // Material-based adjustments
        if (analysis.material === "cotton" || analysis.material === "linen") {
            summer += 2;
            spring += 1;
            winter -= 1;
        } else if (analysis.material === "wool") {
            winter += 2;
            fall += 1;
            summer -= 2;
        } else if (analysis.material === "leather") {
            fall += 2;
            winter += 1;
            summer -= 1;
        }

        // Color-based adjustments
        if (["yellow", "pink", "turquoise", "light blue"].includes(analysis.color)) {
            spring += 1;
            summer += 1;
        } else if (["orange", "brown", "burgundy"].includes(analysis.color)) {
            fall += 2;
        } else if (["dark blue", "black", "gray"].includes(analysis.color)) {
            winter += 1;
        }

        // Style-based adjustments
        if (analysis.style === "beachy" || analysis.style === "tropical") {
            summer += 2;
            winter -= 2;
        } else if (analysis.style === "cozy" || analysis.style === "warm") {
            winter += 2;
            summer -= 1;
        }

        // Normalize ratings to 1-10 range
        return {
            spring: Math.max(1, Math.min(10, spring)),
            summer: Math.max(1, Math.min(10, summer)),
            fall: Math.max(1, Math.min(10, fall)),
            winter: Math.max(1, Math.min(10, winter))
        };
    }

    async generateOutfitSuggestions(
        items: ClothingItem[],
        occasion?: string,
        season?: string
    ): Promise<{ outfits: ClothingItem[][], reasons: string[] }> {
        try {
            // Handle the case with too few items
            if (items.length < 3) {
                return { outfits: [], reasons: [] };
            }

            // Simple outfit suggestion logic without vector store
            const tops = items.filter(item => item.category === "Tops").slice(0, 3);
            const bottoms = items.filter(item => item.category === "Bottoms").slice(0, 3);
            const footwear = items.filter(item => item.category === "Footwear").slice(0, 2);

            const suggestions: ClothingItem[][] = [];
            const reasons: string[] = [];

            // Generate simple combinations
            for (const top of tops) {
                for (const bottom of bottoms) {
                    for (const shoe of footwear) {
                        suggestions.push([top, bottom, shoe]);
                        reasons.push(`A stylish combination of ${top.name} with ${bottom.name} and ${shoe.name}`);
                    }
                }
            }

            return {
                outfits: suggestions.slice(0, 5),
                reasons: reasons.slice(0, 5)
            };
        } catch (error) {
            console.error("Error generating outfit suggestions:", error);
            return { outfits: [], reasons: [] };
        }
    }

    private getMostFrequent(arr: (string | undefined)[]): string | undefined {
        const filtered = arr.filter(Boolean) as string[];
        if (filtered.length === 0) return undefined;

        const counts = filtered.reduce((acc, value) => {
            acc[value] = (acc[value] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
    }

    private determineCategoryFromAttributes(attributes: string[]): string {
        const categoryMap: { [key: string]: string } = {
            "t-shirt": "Tops",
            "hoodie": "Tops",
            "jacket": "Outerwear",
            "jeans": "Bottoms",
            "skirt": "Bottoms",
            "dress": "Dresses",
            "suit": "Outerwear"
        };

        for (const attr of attributes) {
            if (categoryMap[attr]) {
                return categoryMap[attr];
            }
        }
        return "Tops"; // Default category
    }

    private extractColorFromCaption(caption: string): string {
        const colors = ["red", "blue", "green", "black", "white", "yellow", "purple",
            "pink", "brown", "gray", "beige", "navy", "turquoise", "orange"];

        for (const color of colors) {
            if (caption.toLowerCase().includes(color)) {
                return color;
            }
        }
        return "unknown";
    }

    private extractMaterialFromAttributes(attributes: string[]): string {
        const materials = ["cotton", "denim", "silk", "leather", "wool"];

        for (const attr of attributes) {
            if (materials.includes(attr)) {
                return attr;
            }
        }
        return "unknown";
    }

    private extractStyleFromAttributes(attributes: string[]): string {
        const styles = ["formal", "casual", "sporty", "vintage"];

        for (const attr of attributes) {
            if (styles.includes(attr)) {
                return attr;
            }
        }
        return "casual";
    }

    private extractAdditionalTags(caption: string): string[] {
        const additionalTags: string[] = [];

        // Extract sleeve type
        if (caption.toLowerCase().includes("long sleeve")) {
            additionalTags.push("long sleeve");
        } else if (caption.toLowerCase().includes("sleeveless")) {
            additionalTags.push("sleeveless");
        } else if (caption.toLowerCase().includes("short sleeve")) {
            additionalTags.push("short sleeve");
        }

        // Extract patterns
        const patterns = ["striped", "floral", "plain", "checkered", "graphic"];
        for (const pattern of patterns) {
            if (caption.toLowerCase().includes(pattern)) {
                additionalTags.push(pattern);
            }
        }

        return additionalTags;
    }

    private determineOccasions(style: string, attributes: string[]): string[] {
        const occasions: string[] = ["casual"];

        if (style === "formal" || attributes.includes("suit")) {
            occasions.push("formal", "office");
        } else if (style === "sporty") {
            occasions.push("sports", "outdoors");
        } else if (style === "vintage") {
            occasions.push("party", "date");
        }

        return occasions;
    }

    private async createVectorStore(items: ClothingItem[]): Promise<any> {
        // This would create a vector store from your items for similarity search
        // For example, using MemoryVectorStore from LangChain
        const documents = items.map(item => new Document({
            pageContent: JSON.stringify(item),
            metadata: {
                id: item.id,
                name: item.name,
                category: item.category,
                imageUrl: item.imageUrl,
                color: item.color,
                material: item.material,
                style: item.style,
                tags: item.tags,
                rating: item.rating,
                seasonalRating: item.seasonalRating,
                occasions: item.occasions
            }
        }));

        // Implementation of createVectorStore method
    }
}

// Create and export a singleton instance
export const imageAnalysis = new ImageAnalysisService(process.env.HUGGINGFACE_API_KEY || "");
