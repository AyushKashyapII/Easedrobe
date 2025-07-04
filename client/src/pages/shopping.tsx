import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { UploadModal } from "@/components/wardrobe/UploadModal";
import { Camera, ShoppingBag, Check } from "lucide-react";
import { RatingBadge } from "@/components/shared/RatingBadge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ApiErrorMessage } from "@/components/shared/ApiErrorMessage";

export default function Shopping() {
  const { toast } = useToast();
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  
  // Fetch shopping analysis items
  const { 
    data: shoppingItems = [], 
    isLoading: shoppingLoading,
    error: shoppingError
  } = useQuery({
    queryKey: ['/api/shopping'],
  });
  
  // Fetch wardrobe items to show matching items
  const { 
    data: wardrobeItems = [], 
    isLoading: itemsLoading 
  } = useQuery({
    queryKey: ['/api/clothing-items'],
  });
  
  // Normalize shopping items to ensure imageUrl is always available
  const normalizedShoppingItems = shoppingItems.map(item => ({
    ...item,
    imageUrl: item.imageUrl || item.image_url 
      ? item.imageUrl || item.image_url 
      : item.image_data 
        ? `data:image/png;base64,${item.image_data}` 
        : undefined,
  }));
  
  // Delete a shopping analysis
  const handleDelete = async (id: number) => {
    try {
      await apiRequest('DELETE', `/api/shopping/${id}`);
      queryClient.invalidateQueries({ queryKey: ['/api/shopping'] });
      toast({
        title: "Analysis deleted",
        description: "The shopping analysis has been removed.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete analysis. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <>
      <section>
        <h1 className="font-poppins font-bold text-2xl md:text-3xl mb-6">Shopping Assistant</h1>
        
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
          <div className="p-5">
            <p className="text-neutral-600 mb-4">
              Upload a photo of a clothing item you're considering buying. 
              Our AI will provide a comprehensive analysis including style compatibility, 
              color harmony, uniqueness, and outfit potential. For items scoring 7+ out of 10, 
              we'll also show you recommended outfits using your existing wardrobe.
            </p>
            
            <div className="border-2 border-dashed border-neutral-200 rounded-lg p-6 text-center">
              <div className="mx-auto mb-4 w-16 h-16 flex items-center justify-center bg-secondary/10 text-secondary rounded-full">
                <ShoppingBag className="h-8 w-8" />
              </div>
              <h3 className="font-medium text-neutral-800 mb-2">Upload a clothing item</h3>
              <p className="text-sm text-neutral-500 mb-4">
                Take a photo or upload an image of a clothing item you want to buy
              </p>
              <div className="flex justify-center gap-3">
                <Button 
                  className="bg-secondary hover:bg-secondary/90 text-white"
                  onClick={() => setUploadModalOpen(true)}
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Take Photo
                </Button>
                <Button 
                  variant="outline"
                  className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
                  onClick={() => setUploadModalOpen(true)}
                >
                  <ShoppingBag className="mr-2 h-4 w-4" />
                  Upload Image
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Recent Analysis */}
        <div className="mb-6">
          <h2 className="font-medium text-xl mb-4">Recent Analysis</h2>
          
          {shoppingLoading || itemsLoading ? (
            // Skeleton loading state
            <div className="bg-white rounded-xl shadow-sm overflow-hidden animate-pulse">
              <div className="p-5">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="w-full md:w-1/4 bg-gray-200 h-60 md:h-auto rounded-lg"></div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-3">
                      <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                      <div className="h-6 bg-gray-200 rounded w-1/6"></div>
                    </div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
                    <div className="h-20 bg-gray-200 rounded mb-4"></div>
                    <div className="flex flex-wrap gap-2">
                      <div className="h-8 bg-gray-200 rounded-full w-24"></div>
                      <div className="h-8 bg-gray-200 rounded-full w-24"></div>
                      <div className="h-8 bg-gray-200 rounded-full w-24"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : shoppingError ? (
            <div className="mb-4">
              <ApiErrorMessage 
                title="Shopping Analysis Unavailable" 
                message="We're having trouble with our AI shopping analysis service. This might be due to service limits or API key issues."
              />
            </div>
          ) : shoppingItems.length > 0 ? (
            normalizedShoppingItems.map(item => {
              // Find matching wardrobe items
              const matchingItems = item.matchingItemIds
                ?.map(id => wardrobeItems.find(wardrobeItem => wardrobeItem.id === id))
                .filter(Boolean) || [];
              
              return (
                <div key={item.id} className="bg-white rounded-lg p-4 mb-4 flex flex-col md:flex-row gap-4 items-start">
                  <div className="w-full md:w-1/4">
                    <img 
                      src={item.imageUrl} 
                      alt={item.name} 
                      className="w-full h-auto rounded-lg"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">{item.name}</h4>
                      <div className={`text-white rounded-md px-2 py-0.5 text-xs font-medium ${
                        item.rating >= 8 ? 'bg-green-500' : 
                        item.rating >= 5 ? 'bg-amber-500' : 
                        'bg-red-500'
                      }`}>
                        {item.rating >= 8 ? 'Great Match' : 
                         item.rating >= 5 ? 'Good Match' : 
                         'Poor Match'}
                      </div>
                    </div>
                    <div className="mb-3">
                      <div className="text-sm font-medium text-neutral-700 mb-1">AI Rating</div>
                      <div className="flex items-center">
                        <RatingBadge rating={item.rating || 0} type="block" />
                        <div className="ml-2 text-sm text-neutral-600">
                          {item.rating >= 8 ? 'Good investment for your wardrobe' : 
                           item.rating >= 5 ? 'Consider this purchase' : 
                           'May not fit well with your wardrobe'}
                        </div>
                      </div>
                    </div>
                    <div className="mb-3">
                      <div className="text-sm font-medium text-neutral-700 mb-1">Analysis</div>
                      <p className="text-sm text-neutral-600">{item.analysis}</p>
                    </div>

                    {/* Scoring Breakdown */}
                    {(item.styleCompatibility || item.colorHarmony || item.uniquenessOfType || item.fitMaterialDiversity || item.outfitCombinationPotential) && (
                      <div className="mb-4">
                        <div className="text-sm font-medium text-neutral-700 mb-2">Scoring Breakdown</div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {item.styleCompatibility && (
                            <div className="bg-blue-50 rounded-lg p-2">
                              <div className="text-xs text-blue-700 font-medium">Style Compatibility</div>
                              <div className="text-sm font-bold text-blue-800">{(item.styleCompatibility / 10).toFixed(1)}/2.5</div>
                            </div>
                          )}
                          {item.colorHarmony && (
                            <div className="bg-green-50 rounded-lg p-2">
                              <div className="text-xs text-green-700 font-medium">Color Harmony</div>
                              <div className="text-sm font-bold text-green-800">{(item.colorHarmony / 10).toFixed(1)}/2.0</div>
                            </div>
                          )}
                          {item.uniquenessOfType && (
                            <div className="bg-purple-50 rounded-lg p-2">
                              <div className="text-xs text-purple-700 font-medium">Type Uniqueness</div>
                              <div className="text-sm font-bold text-purple-800">{(item.uniquenessOfType / 10).toFixed(1)}/1.5</div>
                            </div>
                          )}
                          {item.fitMaterialDiversity && (
                            <div className="bg-orange-50 rounded-lg p-2">
                              <div className="text-xs text-orange-700 font-medium">Fit/Material Diversity</div>
                              <div className="text-sm font-bold text-orange-800">{(item.fitMaterialDiversity / 10).toFixed(1)}/1.5</div>
                            </div>
                          )}
                          {item.outfitCombinationPotential && (
                            <div className="bg-pink-50 rounded-lg p-2">
                              <div className="text-xs text-pink-700 font-medium">Outfit Potential</div>
                              <div className="text-sm font-bold text-pink-800">{(item.outfitCombinationPotential / 10).toFixed(1)}/2.5</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Item Attributes */}
                    {(item.type || item.color || item.material || item.style || item.fit || item.pattern || item.targetAudience) && (
                      <div className="mb-4">
                        <div className="text-sm font-medium text-neutral-700 mb-2">Item Attributes</div>
                        <div className="flex flex-wrap gap-2">
                          {item.type && (
                            <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">Type: {item.type}</span>
                          )}
                          {item.color && Array.isArray(item.color) && item.color.map((color, idx) => (
                            <span key={idx} className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">Color: {color}</span>
                          ))}
                          {item.material && Array.isArray(item.material) && item.material.map((material, idx) => (
                            <span key={idx} className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">Material: {material}</span>
                          ))}
                          {item.style && Array.isArray(item.style) && item.style.map((style, idx) => (
                            <span key={idx} className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">Style: {style}</span>
                          ))}
                          {item.fit && (
                            <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">Fit: {item.fit}</span>
                          )}
                          {item.pattern && Array.isArray(item.pattern) && item.pattern.map((pattern, idx) => (
                            <span key={idx} className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">Pattern: {pattern}</span>
                          ))}
                          {item.targetAudience && (
                            <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">Target: {item.targetAudience}</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Recommendations (if score >= 7) */}
                    {item.recommendations && item.recommendations.length > 0 && (
                      <div className="mb-4">
                        <div className="text-sm font-medium text-neutral-700 mb-2">Recommended Outfits</div>
                        <div className="space-y-3">
                          {item.recommendations.map((rec, idx) => (
                            <div key={idx} className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3 border border-blue-200">
                              <div className="flex items-center justify-between mb-2">
                                <div className="text-sm font-medium text-blue-800">Outfit {idx + 1}</div>
                                <div className="text-xs text-blue-600">Score: {rec.compatibilityScore?.toFixed(1)}/10</div>
                              </div>
                              <div className="flex flex-wrap gap-2 mb-2">
                                {rec.top && (
                                  <div className="flex items-center gap-1 bg-white rounded-full px-2 py-1 text-xs">
                                    <img 
                                      src={rec.top.imageUrl} 
                                      alt={rec.top.name} 
                                      className="w-4 h-4 rounded-full object-cover"
                                    />
                                    <span className="text-blue-700">{rec.top.name}</span>
                                  </div>
                                )}
                                {rec.bottom && (
                                  <div className="flex items-center gap-1 bg-white rounded-full px-2 py-1 text-xs">
                                    <img 
                                      src={rec.bottom.imageUrl} 
                                      alt={rec.bottom.name} 
                                      className="w-4 h-4 rounded-full object-cover"
                                    />
                                    <span className="text-blue-700">{rec.bottom.name}</span>
                                  </div>
                                )}
                                {rec.footwear && (
                                  <div className="flex items-center gap-1 bg-white rounded-full px-2 py-1 text-xs">
                                    <img 
                                      src={rec.footwear.imageUrl} 
                                      alt={rec.footwear.name} 
                                      className="w-4 h-4 rounded-full object-cover"
                                    />
                                    <span className="text-blue-700">{rec.footwear.name}</span>
                                  </div>
                                )}
                              </div>
                              {rec.reasoning && (
                                <div className="text-xs text-blue-600 italic">{rec.reasoning}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {matchingItems.length > 0 && (
                      <div>
                        <div className="text-sm font-medium text-neutral-700 mb-1">Matching Items</div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {matchingItems.slice(0, 3).map(matchingItem => (
                            <div key={matchingItem.id} className="flex items-center gap-1 bg-neutral-100 rounded-full px-2 py-1 text-xs">
                              <img 
                                src={matchingItem.imageUrl} 
                                alt={matchingItem.name} 
                                className="w-4 h-4 rounded-full object-cover"
                              />
                              <span>{matchingItem.name}</span>
                            </div>
                          ))}
                          {matchingItems.length > 3 && (
                            <div className="bg-neutral-100 rounded-full px-2 py-1 text-xs">
                              +{matchingItems.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex justify-end mt-4">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDelete(item.id)}
                      >
                        Delete Analysis
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-neutral-100 rounded-xl p-8 text-center">
              <h3 className="font-medium text-lg mb-2">No shopping analysis yet</h3>
              <p className="text-neutral-600 mb-4">
                Analyze your potential purchases to see how they'll fit with your existing wardrobe.
              </p>
              <Button onClick={() => setUploadModalOpen(true)}>Analyze an Item</Button>
            </div>
          )}
        </div>
      </section>
      
      {/* Upload Modal */}
      <UploadModal 
        open={uploadModalOpen} 
        onClose={() => setUploadModalOpen(false)} 
        type="shopping" 
      />
    </>
  );
}
