import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { OutfitCard } from "@/components/outfits/OutfitCard";
import { UploadModal } from "@/components/wardrobe/UploadModal";
import { Camera, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ApiErrorMessage } from "@/components/shared/ApiErrorMessage";
import { ClothingItem, Outfit } from "@shared/schema";
import { RecommendationCard } from "@/components/outfits/RecommendationCard";

// Helper to convert a recommended clothing item array into an Outfit object
function recommendationToOutfit(items: ClothingItem[]): Outfit {
  // Combine tags and captions from all items
  const allTags = items.flatMap(item => item.tags || []);
  const uniqueTags = [...new Set(allTags)];
  const analysis = items.map(item => item.caption).filter(Boolean).join(' | ');

  return {
    id: items.map(i => i.id).join('-'), // Create a unique ID for the key
    name: "Recommended Outfit",
    imageUrl: items[0]?.imageUrl || "", // Use the top's image as the main image
    rating: items.reduce((acc, item) => acc + (item.rating || 0), 0) / items.length,
    tags: uniqueTags,
    analysis: analysis,
    // Fill in other required Outfit properties
    userId: items[0]?.userId || 0,
    imageData: items[0]?.imageData || "",
    aiGenerated: true,
    createdAt: new Date().toISOString(),
    itemIds: items.map(i => i.id),
  };
}

// Define the type for a recommendation object
type Recommendation = {
  id: number;
  items: ClothingItem[];
};

export default function Outfits() {
  const { toast } = useToast();
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Fetch user's saved outfits
  const { 
    data: outfits = [], 
    isLoading: outfitsLoading 
  } = useQuery({
    queryKey: ['/api/outfits'],
    enabled: !showSuggestions, // Only fetch when showing user's outfits
  });
  
  const queryClient = useQueryClient();

  const { data: recommendations, isLoading: recommendationsLoading, isError: recommendationsError } = useQuery<Recommendation[]>({
    queryKey: ["recommendations"],
    queryFn: async () => {
      const res = await fetch("/api/recommendations");
      if (!res.ok) {
        throw new Error("Network response was not ok");
      }
      return res.json();
    },
  });
  
  // Handle refreshing AI suggestions
  const handleRefreshSuggestions = () => {
    queryClient.fetchQuery({
      queryKey: ["recommendations"],
      queryFn: async () => {
        const res = await fetch("/api/recommendations?force=true");
        if (!res.ok) {
          throw new Error("Network response was not ok");
        }
        const data = await res.json();
        // Manually update the query cache
        queryClient.setQueryData(["recommendations"], data);
        return data;
      },
    });
  };
  
  return (
    <>
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h1 className="font-poppins font-bold text-2xl md:text-3xl">Outfits</h1>
          
          <div className="flex gap-3">
            <Button 
              variant={showSuggestions ? "outline" : "default"}
              onClick={() => setShowSuggestions(false)}
              disabled={!showSuggestions}
            >
              My Outfits
            </Button>
            <Button 
              variant={showSuggestions ? "default" : "outline"}
              onClick={() => setShowSuggestions(true)}
              disabled={showSuggestions}
            >
              AI Suggestions
            </Button>
          </div>
        </div>
        
        {/* Action Button */}
        <div className="flex justify-end mb-6">
          {showSuggestions ? (
            <Button 
              variant="outline"
              className="bg-neutral-100 hover:bg-neutral-200"
              onClick={handleRefreshSuggestions}
              disabled={recommendationsLoading}
            >
              <RefreshCw className={`mr-1 h-4 w-4 ${recommendationsLoading ? 'animate-spin' : ''}`} />
              Refresh Suggestions
            </Button>
          ) : (
            <Button onClick={() => setUploadModalOpen(true)}>
              <Camera className="mr-2 h-4 w-4" />
              Add New Outfit
            </Button>
          )}
        </div>
        
        {/* Outfits Grid */}
        {!showSuggestions && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {outfitsLoading ? (
              // Skeleton loading state
              Array(6).fill(0).map((_, i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden animate-pulse">
                  <div className="w-full h-64 bg-gray-200"></div>
                  <div className="p-4">
                    <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
                    <div className="flex gap-2">
                      <div className="h-6 bg-gray-200 rounded w-16"></div>
                      <div className="h-6 bg-gray-200 rounded w-16"></div>
                    </div>
                  </div>
                </div>
              ))
            ) : outfits.length > 0 ? (
              outfits.map(outfit => (
                <OutfitCard key={outfit.id} outfit={outfit} />
              ))
            ) : (
              <div className="col-span-full bg-white rounded-xl p-8 text-center">
                <h3 className="font-medium text-lg mb-2">No outfits yet</h3>
                <p className="text-neutral-600 mb-4">
                  Start by adding your first outfit or checking AI suggestions.
                </p>
                <div className="flex justify-center gap-3">
                  <Button onClick={() => setUploadModalOpen(true)}>
                    <Camera className="mr-2 h-4 w-4" />
                    Add New Outfit
                  </Button>
                  <Button variant="outline" onClick={() => setShowSuggestions(true)}>
                    View AI Suggestions
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Suggestions Grid */}
        {showSuggestions && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendationsLoading ? (
              // Skeleton loading state
              Array(3).fill(0).map((_, i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden animate-pulse">
                  <div className="w-full h-64 bg-gray-200"></div>
                  <div className="p-4">
                    <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
                  </div>
                </div>
              ))
            ) : recommendationsError ? (
              <div className="col-span-full">
                <ApiErrorMessage 
                  title="Recommendations Unavailable" 
                  message="We're having trouble generating recommendations right now. Please try again later."
                  onRetry={handleRefreshSuggestions}
                />
              </div>
            ) : recommendations.length > 0 ? (
              recommendations.map((rec) => (
                <RecommendationCard key={rec.id} recommendation={rec} />
              ))
            ) : (
              <div className="col-span-full bg-white rounded-xl p-6 text-center">
                <p className="text-neutral-600 mb-3">No outfit recommendations available. Add more items to your wardrobe to get started.</p>
                <Button onClick={handleRefreshSuggestions}>Generate Suggestions</Button>
              </div>
            )}
          </div>
        )}
      </section>
      
      {/* Upload Modal */}
      <UploadModal 
        open={uploadModalOpen} 
        onClose={() => setUploadModalOpen(false)} 
        type="outfit" 
      />
    </>
  );
}
