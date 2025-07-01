import { useState, useRef } from "react";
import { Link } from "wouter";
import { Camera, Shirt, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { OutfitCard } from "@/components/outfits/OutfitCard";
import { WardrobeItemCard, AddWardrobeItemCard } from "@/components/wardrobe/ItemCard";
import { UploadModal } from "@/components/wardrobe/UploadModal";
import { useToast } from "@/hooks/use-toast";
import { ApiErrorMessage } from "@/components/shared/ApiErrorMessage";
import { ClothingItem, Outfit } from "@shared/schema";
import { RecommendationCard } from "@/components/outfits/RecommendationCard";

// Backend recommendation structure
interface BackendRecommendation {
  id: number;
  user_id: number;
  item_ids: number[];
  created_at: string;
  feedback: string | null;
  rating: number;
  items: ClothingItem[]; // This is empty from backend
}

// Frontend recommendation structure (what RecommendationCard expects)
interface FrontendRecommendation {
  id: number;
  items: ClothingItem[];
  rating?: number;
}

// Helper to convert a recommended clothing item array into an Outfit object
function recommendationToOutfit(items: ClothingItem[]): Outfit {
  // Combine tags and captions from all items
  const allTags = items.flatMap(item => item.tags || []);
  const uniqueTags = [...new Set(allTags)];
  const analysis = items.map(item => item.caption).filter(Boolean).join(' | ');

  return {
    id: 0, // Placeholder ID, since this is a transient object
    name: "Recommended Outfit",
    imageUrl: items[0]?.imageUrl || "", // Use the top's image as the main image
    rating: items.reduce((acc, item) => acc + (item.rating || 0), 0) / items.length,
    tags: uniqueTags,
    analysis: analysis,
    // Fill in other required Outfit properties
    userId: items[0]?.userId || 0,
    imageData: items[0]?.imageData || "",
    aiGenerated: true,
    createdAt: new Date(),
    itemIds: items.map(i => i.id),
  };
}

export default function Home() {
  const { toast } = useToast();
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadType, setUploadType] = useState<"outfit" | "item" | "shopping">("outfit");
  const [recommendationsEnabled, setRecommendationsEnabled] = useState(false);
  const recommendationsQueryRef = useRef<any>(null);
  
  // Get recent outfits
  const { 
    data: outfits = [], 
    isLoading: outfitsLoading 
  } = useQuery<Outfit[]>({
    queryKey: ['/api/outfits'],
  });
  
  // Get wardrobe items
  const { 
    data: wardrobeItems = [], 
    isLoading: itemsLoading 
  } = useQuery<ClothingItem[]>({
    queryKey: ['/api/clothing-items'],
  });
  
  // Get AI outfit recommendations (disabled by default)
  const {
    data: backendRecommendations = [],
    isLoading: recommendationsLoading,
    error: recommendationsError,
    refetch: refetchRecommendations,
    isFetching: recommendationsFetching,
  } = useQuery<BackendRecommendation[]>({
    queryKey: ['/api/recommendations'],
    queryFn: async () => {
      const res = await fetch('/api/recommendations?force=true');
      if (!res.ok) throw new Error('Network response was not ok');
      return res.json();
    },
    enabled: recommendationsEnabled, // Only fetch when enabled
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 0,
  });
  
  // Transform backend recommendations to frontend format
  const recommendations: FrontendRecommendation[] = backendRecommendations.map(rec => {
    // Find the actual clothing items based on item_ids
    const items = rec.item_ids
      .map(id => wardrobeItems.find(item => item.id === id))
      .filter((item): item is ClothingItem => item !== undefined);
    
    return {
      id: rec.id,
      items: items,
      rating: rec.rating,
    };
  }).filter(rec => rec.items.length > 0); // Only include recommendations with valid items
  
  // Debug: Log recommendations data
  console.log('Backend Recommendations:', backendRecommendations);
  console.log('Transformed Frontend Recommendations:', recommendations);
  console.log('Available Wardrobe Items:', wardrobeItems);
  
  // Open upload modal with the correct type
  const handleOpenUploadModal = (type: "outfit" | "item" | "shopping") => {
    setUploadType(type);
    setUploadModalOpen(true);
  };
  
  // Handler to enable and fetch recommendations
  const handleGetRecommendations = async () => {
    setRecommendationsEnabled(true);
    // Optionally, you can call refetchRecommendations() here if you want immediate fetch
    // await refetchRecommendations();
  };
  
  // Handle refreshing AI suggestions
  const handleRefreshSuggestions = async () => {
    try {
      await refetchRecommendations();
      toast({
        title: "Suggestions refreshed",
        description: "New outfit recommendations have been generated.",
      });
    } catch (error) {
      console.error("Failed to refresh recommendations:", error);
      toast({
        title: "Error",
        description: "Failed to refresh recommendations. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Get limited items for display
  const recentOutfits = outfits.slice(0, 3);
  const recentItems = wardrobeItems.slice(0, 5);
  
  return (
    <>
      {/* Welcome Section */}
      <section className="mb-8">
        <div className="bg-gradient-to-r from-primary/90 to-primary rounded-2xl p-6 md:p-8 text-white">
          <h2 className="font-poppins font-bold text-2xl md:text-3xl mb-2">Welcome to Your Digital Wardrobe</h2>
          <p className="text-white/90 max-w-2xl mb-4">
            Upload your outfits and individual clothing items to get AI-powered ratings and suggestions.
            Create stunning combinations from your existing wardrobe.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button 
              variant="secondary"
              className="bg-white text-primary hover:bg-primary/10 hover:text-white"
              onClick={() => handleOpenUploadModal("outfit")}
            >
              <Camera className="mr-2 h-4 w-4" />
              Add New Outfit
            </Button>
            <Button 
              variant="outline"
              className="bg-white/20 hover:bg-white/30 text-white"
              onClick={() => handleOpenUploadModal("item")}
            >
              <Shirt className="mr-2 h-4 w-4" />
              Add Clothing Item
            </Button>
          </div>
        </div>
      </section>
      
      {/* Recent Outfits Section */}
      <section className="mb-10">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-poppins font-semibold text-xl text-neutral-700">Recent Outfits</h2>
          <Link href="/outfits" className="text-primary font-medium flex items-center hover:underline">
            View All <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 ml-1">
              <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
            </svg>
          </Link>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {outfitsLoading ? (
            // Skeleton loading state
            Array(3).fill(0).map((_, i) => (
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
          ) : recentOutfits.length > 0 ? (
            recentOutfits.map((outfit: Outfit) => (
              <OutfitCard key={outfit.id} outfit={outfit} />
            ))
          ) : (
            <div className="col-span-full bg-white rounded-xl p-6 text-center">
              <p className="text-neutral-600 mb-3">You haven't added any outfits yet.</p>
              <Button onClick={() => handleOpenUploadModal("outfit")}>Add Your First Outfit</Button>
            </div>
          )}
        </div>
      </section>
      
      {/* My Wardrobe Section */}
      <section className="mb-10">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-poppins font-semibold text-xl text-neutral-700">My Wardrobe</h2>
          <Link href="/wardrobe" className="text-primary font-medium flex items-center hover:underline">
            View All <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 ml-1">
              <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
            </svg>
          </Link>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {itemsLoading ? (
            // Skeleton loading state
            Array(5).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden animate-pulse">
                <div className="w-full h-40 bg-gray-200"></div>
                <div className="p-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))
          ) : (
            <>
              {recentItems.map((item: ClothingItem) => (
                <WardrobeItemCard key={item.id} item={item} />
              ))}
              <AddWardrobeItemCard onClick={() => handleOpenUploadModal("item")} />
            </>
          )}
        </div>
      </section>
      
      {/* AI Suggested Outfits Section */}
      <section className="mb-10">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-poppins font-semibold text-xl text-neutral-700">AI Suggested Outfits</h2>
          <Button
            variant="outline"
            className="text-neutral-600 bg-neutral-100 hover:bg-neutral-200"
            onClick={handleRefreshSuggestions}
            disabled={recommendationsLoading || !recommendationsEnabled}
          >
            <RefreshCw className={`mr-1 h-4 w-4 ${recommendationsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        {!recommendationsEnabled ? (
          <div className="col-span-full bg-white rounded-xl p-6 text-center">
            <Button onClick={handleGetRecommendations} className="text-lg font-semibold">Get AI Outfits</Button>
          </div>
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {recommendationsLoading || itemsLoading ? (
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
                message="We're having trouble connecting to our AI service. Please try again later."
                onRetry={handleRefreshSuggestions}
              />
            </div>
          ) : recommendations.length > 0 ? (
            recommendations.slice(0, 3).map((rec) => (
              <RecommendationCard key={rec.id} recommendation={rec} />
            ))
          ) : backendRecommendations.length > 0 && wardrobeItems.length === 0 ? (
            <div className="col-span-full bg-white rounded-xl p-6 text-center">
              <p className="text-neutral-600 mb-3">Your wardrobe items are still loading. Please wait...</p>
            </div>
          ) : backendRecommendations.length > 0 ? (
            <div className="col-span-full bg-white rounded-xl p-6 text-center">
              <p className="text-neutral-600 mb-3">Recommendations found, but some items may have been removed from your wardrobe.</p>
              <Button onClick={handleRefreshSuggestions}>Refresh Recommendations</Button>
            </div>
          ) : (
            <div className="col-span-full bg-white rounded-xl p-6 text-center">
              <p className="text-neutral-600 mb-3">No outfit suggestions available. Add more items to your wardrobe to get started.</p>
              <Button onClick={() => handleOpenUploadModal("item")}>Add Clothing Items</Button>
            </div>
          )}
        </div>
        )}
      </section>
      
      {/* Upload Modal */}
      <UploadModal 
        open={uploadModalOpen} 
        onClose={() => setUploadModalOpen(false)} 
        type={uploadType} 
      />
    </>
  );
}