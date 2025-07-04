import { ClothingItem } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface RecommendationCardProps {
  recommendation: {
    id: number;
    items: ClothingItem[];
    rating?: number;
    feedback?: string | null;
    reasoning?: string;
  };
}

const feedbackOptions = [
  { value: "Bad", emoji: '😞', label: 'Bad' },
  { value: "Satisfactory", emoji: '😐', label: 'Satisfactory' },
  { value: "Happy", emoji: '😍', label: 'Happy' },
];

export function RecommendationCard({ recommendation }: RecommendationCardProps) {
  const { toast } = useToast();
  const [submittedFeedback, setSubmittedFeedback] = useState<string | null>(recommendation.feedback ?? null);
  
  // Defensive: ensure recommendation and items are defined and items is an array
  if (!recommendation || !Array.isArray(recommendation.items) || recommendation.items.length < 2) {
    return (
      <div className="bg-white rounded-xl p-4 text-center text-neutral-500">
        Not enough items to display this recommendation.
      </div>
    );
  }
  const items = recommendation.items;

  const handleFeedback = async (feedback: string) => {
    try {
      await apiRequest(`/api/recommendations/${recommendation.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ feedback }),
      });

      setSubmittedFeedback(feedback);
      toast({
        title: "Feedback taken!",
        description: `Your feedback has been recorded.`,
      });
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast({
        title: "Error",
        description: "Could not submit feedback.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center transition hover:shadow-xl">
      <div className="font-semibold text-lg text-center mb-4 text-primary">Suggested Outfit</div>
      <div className="flex flex-row justify-center gap-6 w-full mb-4 flex-wrap">
        {items.map(item => (
          <div key={item.id} className="flex flex-col items-center w-28">
            <div className="w-20 h-20 rounded-xl overflow-hidden shadow border mb-2 bg-gray-100 flex items-center justify-center">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs text-gray-400">No Image</span>
              )}
            </div>
            <div className="text-xs font-medium text-center truncate w-full">{item.name}</div>
            <div className="text-xs text-gray-500 text-center">{item.category}</div>
          </div>
        ))}
      </div>
      <div className="w-full flex flex-col items-center">
        {submittedFeedback !== null ? (
          <div className="text-green-600 font-medium mt-2">
            Feedback: {submittedFeedback} {feedbackOptions.find(opt => opt.value === submittedFeedback)?.emoji}
          </div>
        ) : (
          <div className="flex gap-6 mt-2">
            {feedbackOptions.map(opt => (
              <button
                key={opt.value}
                className="flex flex-col items-center px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none transition"
                onClick={() => handleFeedback(opt.value)}
                aria-label={opt.label}
              >
                <span className="text-3xl mb-1">{opt.emoji}</span>
                <span className="text-xs">{opt.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 
