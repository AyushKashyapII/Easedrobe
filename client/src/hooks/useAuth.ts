import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "./use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

export type User = {
  id: number;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
};

export function useAuth() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Fetch current user
  const { 
    data: user, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['/api/auth/me'],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Logout function
  const logout = async () => {
    try {
      await apiRequest('/api/auth/logout', {
        method: 'POST',
      });
      
      // Clear user from cache
      queryClient.invalidateQueries();
      
      toast({
        title: 'Logged out',
        description: 'You have been logged out successfully',
      });
      
      // Redirect to login page
      setLocation('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: 'Logout failed',
        description: 'An error occurred while logging out',
        variant: 'destructive',
      });
    }
  };

  return {
    user,
    isLoading,
    error,
    isAuthenticated: !!user,
    logout,
  };
}