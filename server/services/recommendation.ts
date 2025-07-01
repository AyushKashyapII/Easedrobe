import { ClothingItem, Outfit } from "@shared/schema";
import { IStorage } from "../storage";

/**
 * Calculates a similarity score between two sets of tags.
 * The score is the number of common tags.
 */
function getTagSimilarity(tagsA: string[] | null, tagsB: string[] | null): number {
    if (!tagsA || !tagsB) {
        return 0;
    }
    const setA = new Set(tagsA);
    const setB = new Set(tagsB);
    let commonCount = 0;
    for (const tag of setA) {
        if (setB.has(tag)) {
            commonCount++;
        }
    }
    return commonCount;
}

/**
 * Calculates a similarity score between two captions based on shared keywords.
 * Ignores common "stop words" to focus on meaningful terms.
 */
function getCaptionSimilarity(captionA: string | null, captionB: string | null): number {
    if (!captionA || !captionB) {
        return 0;
    }

    // A simple list of common English stop words.
    const stopWords = new Set(['a', 'an', 'the', 'in', 'on', 'of', 'with', 'for', 'and', 'is', 'are', 'it']);

    const wordsA = new Set(captionA.toLowerCase().split(' ').filter(word => !stopWords.has(word)));
    const wordsB = new Set(captionB.toLowerCase().split(' ').filter(word => !stopWords.has(word)));

    let commonCount = 0;
    for (const word of wordsA) {
        if (wordsB.has(word)) {
            commonCount++;
        }
    }
    return commonCount;
}

export class RecommendationService {
    private storage: IStorage;

    constructor(storage: IStorage) {
        this.storage = storage;
    }

    async generateRecommendations(userId: number): Promise<any[]> {
        const allItems = await this.storage.getClothingItems(userId);
        if (allItems.length < 2) {
            return []; // Not enough items to generate recommendations
        }

        const existingRecs = await this.storage.getRecommendations(userId);
        const existingRecsSet = new Set(
            existingRecs.map(rec => JSON.stringify((rec.itemIds || []).sort()))
        );

        const newRecommendations = [];
        const maxRecommendations = 5; // Limit the number of recommendations

        // Simple combination logic
        for (let i = 0; i < allItems.length; i++) {
            for (let j = i + 1; j < allItems.length; j++) {
                const item1 = allItems[i];
                const item2 = allItems[j];

                // Basic compatibility check (e.g., top and bottom)
                if (
                    (item1.category === "Tops" && item2.category === "Bottoms") ||
                    (item1.category === "Bottoms" && item2.category === "Tops")
                ) {
                    const itemIds = [item1.id, item2.id].sort();
                    const recKey = JSON.stringify(itemIds);

                    if (!existingRecsSet.has(recKey)) {
                        // Compute rating as average of item ratings (default to 5 if missing)
                        const rating = Math.round(((item1.rating || 5) + (item2.rating || 5)) / 2);
                        const recommendation = {
                            userId: userId, // Placeholder
                            itemIds: itemIds,
                            feedback: null,
                            rating: rating,
                        };
                        const savedRec = await this.storage.createRecommendation(recommendation);
                        newRecommendations.push(savedRec);
                        existingRecsSet.add(recKey); // Add to set to prevent duplicates in this run
                    }
                }

                if (newRecommendations.length >= maxRecommendations) {
                    break;
                }
            }
            if (newRecommendations.length >= maxRecommendations) {
                break;
            }
        }

        // Return all recommendations (old and new) for the user
        return this.storage.getRecommendations(userId);
    }
} 