import { ClothingItem, Outfit } from "@shared/schema";
import { IStorage } from "../storage";

// Style matching table
const STYLE_MATCHES: { [key: string]: string[] } = {
    casual: ["casual", "smart casual"],
    formal: ["formal", "business"],
    streetwear: ["streetwear", "grunge", "punk"],
    ethnic: ["ethnic", "fusion"],
    party: ["party", "glam"],
    athleisure: ["sporty", "joggers"],
    boho: ["boho", "relaxed", "flowy"],
    preppy: ["preppy", "smart casual"],
    vintage: ["vintage", "retro"],
    "smart casual": ["casual", "smart casual", "preppy"]
};

// Fit matching table
const FIT_MATCHES: { [key: string]: string[] } = {
    "slim fit": ["slim", "straight cut"],
    oversized: ["slim", "tapered"],
    crop: ["high waist", "straight"],
    relaxed: ["tapered", "regular"],
    bodycon: ["flare", "slim"],
    regular: ["tapered", "regular", "straight cut"]
};

// Color compatibility rules
const COLOR_COMPATIBILITY: { [key: string]: string[] } = {
    white: ["*"], // white goes with everything
    black: ["*"], // black goes with everything
    beige: ["olive", "brown", "navy", "black", "white"],
    grey: ["navy", "black", "white", "pink", "red"],
    navy: ["white", "beige", "grey", "pink", "red"],
    pastel: ["pastel", "white", "beige"],
    neutral: ["*"] // neutral colors go with everything
};

// Material harmony rules
const MATERIAL_HARMONY: { [key: string]: string[] } = {
    cotton: ["cotton", "denim", "linen"],
    silk: ["chiffon", "lace", "satin"],
    wool: ["corduroy", "tweed"],
    denim: ["cotton", "denim"],
    linen: ["cotton", "linen"],
    leather: ["cotton", "denim", "wool"]
};

// Footwear style matching
const FOOTWEAR_STYLE_MATCHES: { [key: string]: string[] } = {
    sneakers: ["casual", "streetwear", "athleisure"],
    loafers: ["formal", "smart casual", "preppy"],
    oxfords: ["formal", "business"],
    boots: ["vintage", "grunge", "casual"],
    heels: ["formal", "party", "glam"],
    sandals: ["summer", "resort", "boho", "casual"]
};

interface OutfitRecommendation {
    top: ClothingItem;
    bottom: ClothingItem;
    footwear?: ClothingItem;
    reasoning: string;
    compatibilityScore: number;
}

export class RecommendationService {
    private storage: IStorage;

    constructor(storage: IStorage) {
        this.storage = storage;
    }

    /**
     * Check if two items have matching target audience
     */
    private hasMatchingTargetAudience(item1: ClothingItem, item2: ClothingItem): boolean {
        if (!item1.targetAudience || !item2.targetAudience) return true; // Allow if not specified
        return item1.targetAudience === item2.targetAudience;
    }

    /**
     * Check style compatibility between items
     */
    private hasCompatibleStyles(item1: ClothingItem, item2: ClothingItem): boolean {
        if (!item1.style || !item2.style) return true; // Allow if not specified

        const styles1 = Array.isArray(item1.style) ? item1.style : [item1.style];
        const styles2 = Array.isArray(item2.style) ? item2.style : [item2.style];

        for (const style1 of styles1) {
            for (const style2 of styles2) {
                if (STYLE_MATCHES[style1]?.includes(style2) || STYLE_MATCHES[style2]?.includes(style1)) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Check color compatibility between items
     */
    private hasCompatibleColors(item1: ClothingItem, item2: ClothingItem): boolean {
        if (!item1.color || !item2.color) return true; // Allow if not specified

        const colors1 = Array.isArray(item1.color) ? item1.color : [item1.color];
        const colors2 = Array.isArray(item2.color) ? item2.color : [item2.color];

        for (const color1 of colors1) {
            for (const color2 of colors2) {
                // Check if colors are compatible
                if (COLOR_COMPATIBILITY[color1]?.includes(color2) ||
                    COLOR_COMPATIBILITY[color2]?.includes(color1) ||
                    COLOR_COMPATIBILITY[color1]?.includes("*") ||
                    COLOR_COMPATIBILITY[color2]?.includes("*")) {
                    return true;
                }
                // Check if both are neutral colors
                if (color1 === color2 && ["white", "black", "beige", "grey", "navy"].includes(color1)) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Check pattern compatibility (one patterned, one plain)
     */
    private hasCompatiblePatterns(item1: ClothingItem, item2: ClothingItem): boolean {
        if (!item1.pattern || !item2.pattern) return true; // Allow if not specified

        const patterns1 = Array.isArray(item1.pattern) ? item1.pattern : [item1.pattern];
        const patterns2 = Array.isArray(item2.pattern) ? item2.pattern : [item2.pattern];

        // If one is plain and one is patterned, it's good
        const hasPlain1 = patterns1.some(p => p === "plain" || p === "solid");
        const hasPlain2 = patterns2.some(p => p === "plain" || p === "solid");
        const hasPattern1 = patterns1.some(p => p !== "plain" && p !== "solid");
        const hasPattern2 = patterns2.some(p => p !== "plain" && p !== "solid");

        return (hasPlain1 && hasPattern2) || (hasPlain2 && hasPattern1) || (hasPlain1 && hasPlain2);
    }

    /**
     * Check fit compatibility between items
     */
    private hasCompatibleFits(item1: ClothingItem, item2: ClothingItem): boolean {
        if (!item1.fit || !item2.fit) return true; // Allow if not specified

        return FIT_MATCHES[item1.fit]?.includes(item2.fit) ||
            FIT_MATCHES[item2.fit]?.includes(item1.fit) ||
            item1.fit === item2.fit;
    }

    /**
     * Check material compatibility between items
     */
    private hasCompatibleMaterials(item1: ClothingItem, item2: ClothingItem): boolean {
        if (!item1.material || !item2.material) return true; // Allow if not specified

        const materials1 = Array.isArray(item1.material) ? item1.material : [item1.material];
        const materials2 = Array.isArray(item2.material) ? item2.material : [item2.material];

        for (const material1 of materials1) {
            for (const material2 of materials2) {
                if (MATERIAL_HARMONY[material1]?.includes(material2) ||
                    MATERIAL_HARMONY[material2]?.includes(material1)) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Check if footwear matches the outfit style
     */
    private hasCompatibleFootwear(footwear: ClothingItem, top: ClothingItem, bottom: ClothingItem): boolean {
        if (!footwear.style || (!top.style && !bottom.style)) return true;

        const outfitStyles = [
            ...(Array.isArray(top.style) ? top.style : [top.style]),
            ...(Array.isArray(bottom.style) ? bottom.style : [bottom.style])
        ].filter(Boolean);

        const footwearStyles = Array.isArray(footwear.style) ? footwear.style : [footwear.style];

        for (const outfitStyle of outfitStyles) {
            for (const footwearStyle of footwearStyles) {
                if (FOOTWEAR_STYLE_MATCHES[footwearStyle]?.includes(outfitStyle)) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Calculate compatibility score between items
     */
    private calculateCompatibilityScore(item1: ClothingItem, item2: ClothingItem): number {
        let score = 0;
        let totalChecks = 0;

        // Target audience match (critical)
        if (this.hasMatchingTargetAudience(item1, item2)) {
            score += 2;
        }
        totalChecks += 2;

        // Style compatibility
        if (this.hasCompatibleStyles(item1, item2)) {
            score += 2;
        }
        totalChecks += 2;

        // Color compatibility
        if (this.hasCompatibleColors(item1, item2)) {
            score += 1.5;
        }
        totalChecks += 1.5;

        // Pattern compatibility
        if (this.hasCompatiblePatterns(item1, item2)) {
            score += 1;
        }
        totalChecks += 1;

        // Fit compatibility
        if (this.hasCompatibleFits(item1, item2)) {
            score += 1;
        }
        totalChecks += 1;

        // Material compatibility
        if (this.hasCompatibleMaterials(item1, item2)) {
            score += 0.5;
        }
        totalChecks += 0.5;

        return (score / totalChecks) * 10; // Convert to 0-10 scale
    }

    /**
     * Generate reasoning for outfit recommendation
     */
    private generateReasoning(top: ClothingItem, bottom: ClothingItem, footwear?: ClothingItem): string {
        const reasons: string[] = [];

        // Style reasoning
        if (top.style && bottom.style) {
            const topStyles = Array.isArray(top.style) ? top.style : [top.style];
            const bottomStyles = Array.isArray(bottom.style) ? bottom.style : [bottom.style];
            const commonStyles = topStyles.filter(s => bottomStyles.includes(s));
            if (commonStyles.length > 0) {
                reasons.push(`Matched on ${commonStyles.join(", ")} style`);
            }
        }

        // Color reasoning
        if (top.color && bottom.color) {
            const topColors = Array.isArray(top.color) ? top.color : [top.color];
            const bottomColors = Array.isArray(bottom.color) ? bottom.color : [bottom.color];
            const commonColors = topColors.filter(c => bottomColors.includes(c));
            if (commonColors.length > 0) {
                reasons.push(`Color harmony with ${commonColors.join(", ")}`);
            } else {
                reasons.push("Good color contrast");
            }
        }

        // Fit reasoning
        if (top.fit && bottom.fit) {
            reasons.push(`${top.fit} top paired with ${bottom.fit} bottom`);
        }

        // Material reasoning
        if (top.material && bottom.material) {
            const topMaterials = Array.isArray(top.material) ? top.material : [top.material];
            const bottomMaterials = Array.isArray(bottom.material) ? bottom.material : [bottom.material];
            const commonMaterials = topMaterials.filter(m => bottomMaterials.includes(m));
            if (commonMaterials.length > 0) {
                reasons.push(`Material harmony with ${commonMaterials.join(", ")}`);
            }
        }

        // Footwear reasoning
        if (footwear) {
            reasons.push(`Completes the look with ${footwear.name}`);
        }

        return reasons.join(". ") + ".";
    }

    /**
     * Generate outfit recommendations for a user
     */
    async generateRecommendations(userId: number): Promise<OutfitRecommendation[]> {
        const allItems = await this.storage.getClothingItems(userId);
        if (allItems.length < 2) {
            return []; // Not enough items to generate recommendations
        }

        const tops = allItems.filter(item => item.category === "Tops");
        const bottoms = allItems.filter(item => item.category === "Bottoms");
        const footwear = allItems.filter(item => item.category === "Footwear");

        const recommendations: OutfitRecommendation[] = [];

        // Generate top + bottom combinations
        for (const top of tops) {
            for (const bottom of bottoms) {
                // Check basic compatibility
                if (!this.hasMatchingTargetAudience(top, bottom)) continue;

                const compatibilityScore = this.calculateCompatibilityScore(top, bottom);

                // Only include if score is above threshold
                if (compatibilityScore >= 6) {
                    let bestFootwear: ClothingItem | undefined;
                    let bestFootwearScore = 0;

                    // Find best matching footwear
                    for (const shoe of footwear) {
                        if (this.hasCompatibleFootwear(shoe, top, bottom)) {
                            const footwearScore = this.calculateCompatibilityScore(top, shoe) +
                                this.calculateCompatibilityScore(bottom, shoe);
                            if (footwearScore > bestFootwearScore) {
                                bestFootwear = shoe;
                                bestFootwearScore = footwearScore;
                            }
                        }
                    }

                    const reasoning = this.generateReasoning(top, bottom, bestFootwear);

                    recommendations.push({
                        top,
                        bottom,
                        footwear: bestFootwear,
                        reasoning,
                        compatibilityScore
                    });
                }
            }
        }

        // Sort by compatibility score and return top recommendations
        return recommendations
            .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
            .slice(0, 10);
    }

    /**
     * Generate recommendations for a specific occasion
     */
    async generateRecommendationsForOccasion(userId: number, occasion: string): Promise<OutfitRecommendation[]> {
        const allRecommendations = await this.generateRecommendations(userId);

        return allRecommendations.filter(rec => {
            const topStyles = Array.isArray(rec.top.style) ? rec.top.style : [rec.top.style];
            const bottomStyles = Array.isArray(rec.bottom.style) ? rec.bottom.style : [rec.bottom.style];
            const allStyles = [...topStyles, ...bottomStyles].filter(Boolean);

            // Map occasion to appropriate styles
            const occasionStyles: { [key: string]: string[] } = {
                casual: ["casual", "smart casual"],
                formal: ["formal", "business"],
                party: ["party", "glam"],
                work: ["formal", "business", "smart casual"],
                date: ["smart casual", "casual", "formal"],
                sport: ["athleisure", "sporty"]
            };

            const targetStyles = occasionStyles[occasion] || ["casual"];
            return allStyles.some(style => targetStyles.includes(style));
        });
    }
} 
