import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, MapPin, Calendar, Trash2, Share2, Star, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import CreateTripDialog from "@/components/CreateTripDialog";
import Header from "@/components/Header";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { getOptimizedImageUrl } from "@/lib/imageOptimization";
import heroImage from "@assets/stock_images/world_map_travel_pin_4de3b461.jpg";

type Trip = {
  id: string;
  name: string;
  startDate?: string;
  endDate?: string;
  days?: number;
  totalCost: number;
  favorite?: number;
  headerImageUrl?: string;
  isPublic?: number;
  expenseCounts?: {
    flights: number;
    accommodation: number;
    activities: number;
  };
};

const DEFAULT_HERO_IMAGE = "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&h=600&fit=crop";

export default function TripsList() {
  const [, setLocation] = useLocation();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { toast } = useToast();
  
  const { data: trips = [], isLoading, error } = useQuery<Trip[]>({
    queryKey: ["/api/trips"],
  });

  useEffect(() => {
    if (error && isUnauthorizedError(error as Error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        // Sign in required - Clerk will handle authentication
      }, 500);
    }
  }, [error, toast]);

  const createTripMutation = useMutation({
    mutationFn: async (tripData: any) => {
      const response = await apiRequest("POST", "/api/trips", tripData);
      return await response.json();
    },
    onSuccess: (newTrip) => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      setLocation(`/trip/${newTrip.id}`);
    },
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async (tripId: string) => {
      const response = await apiRequest("PATCH", `/api/trips/${tripId}/favorite`, {});
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
    },
  });

  const deleteTripMutation = useMutation({
    mutationFn: async (tripId: string) => {
      const response = await apiRequest("DELETE", `/api/trips/${tripId}`, {});
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      toast({
        title: "Trip deleted",
        description: "Your trip has been deleted successfully.",
      });
    },
  });

  const shareTrip = async (tripId: string) => {
    try {
      const response = await apiRequest("POST", `/api/trips/${tripId}/share`, {});
      const { shareId } = await response.json();
      const shareUrl = `${window.location.origin}/share/${shareId}`;
      
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast({
          title: "Share link copied!",
          description: "The trip share link has been copied to your clipboard.",
        });
      } catch (clipboardError) {
        toast({
          title: "Share link ready",
          description: shareUrl,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate share link.",
        variant: "destructive",
      });
    }
  };

  const handleCreateTrip = (trip: any) => {
    createTripMutation.mutate(trip);
    setShowCreateDialog(false);
  };

  const handleToggleFavorite = (e: React.MouseEvent, tripId: string) => {
    e.stopPropagation();
    toggleFavoriteMutation.mutate(tripId);
  };

  const handleDeleteTrip = (e: React.MouseEvent, tripId: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this trip?")) {
      deleteTripMutation.mutate(tripId);
    }
  };

  const isUpcoming = (startDate?: string) => {
    if (!startDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tripDate = new Date(startDate);
    tripDate.setHours(0, 0, 0, 0);
    return tripDate >= today;
  };

  // Sort trips: favorites first, then by date
  const sortedTrips = [...trips].sort((a, b) => {
    if (a.favorite && !b.favorite) return -1;
    if (!a.favorite && b.favorite) return 1;
    if (a.startDate && b.startDate) {
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    }
    return 0;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading trips...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Immersive Hero Section */}
      <div 
        className="relative h-[350px] bg-cover bg-center flex items-center justify-center"
        style={{
          backgroundImage: `url(${heroImage})`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
        
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 leading-tight">
            My Trips
          </h1>
          
          <p className="text-lg text-gray-100 mb-6 max-w-2xl mx-auto">
            {trips.length === 0
              ? "Ready to plan your next adventure? Create your first trip budget."
              : `${trips.length} trip${trips.length === 1 ? "" : "s"} in your collection`}
          </p>
          
          <Button
            onClick={() => setShowCreateDialog(true)}
            size="lg"
            className="gap-2"
            data-testid="button-create-trip"
          >
            <Plus className="w-4 h-4" />
            Create New Trip
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {trips.length === 0 ? (
          <div className="text-center py-20">
            <div className="mb-8 flex items-center justify-center">
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                <MapPin className="h-12 w-12 text-primary" />
              </div>
            </div>
            <h3 className="text-3xl font-bold mb-4">
              No trips yet
            </h3>
            <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto">
              Start planning your adventure by creating your first trip budget
            </p>
            <Button 
              onClick={() => setShowCreateDialog(true)}
              size="lg"
              className="gap-2"
              data-testid="button-create-first-trip"
            >
              <Plus className="h-5 w-5" />
              Create Your First Trip
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {sortedTrips.map((trip) => (
              <Card
                key={trip.id}
                className="relative overflow-hidden h-[320px] hover-elevate transition-all cursor-pointer group"
                onClick={() => setLocation(`/trip/${trip.id}`)}
                data-testid={`card-trip-${trip.id}`}
              >
                {/* Hero Image Background */}
                <div 
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                  style={{
                    backgroundImage: `url(${getOptimizedImageUrl(trip.headerImageUrl || DEFAULT_HERO_IMAGE, 'card')})`,
                  }}
                />
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-black/30" />
                
                {/* Action Buttons - Top Left */}
                <div className="absolute top-3 left-3 flex gap-2 z-20">
                  <button
                    onClick={(e) => handleToggleFavorite(e, trip.id)}
                    className="w-8 h-8 rounded-full bg-white/90 dark:bg-gray-900/90 hover:bg-white dark:hover:bg-gray-900 flex items-center justify-center shadow-lg transition-all hover-elevate"
                    data-testid={`button-favorite-${trip.id}`}
                  >
                    <Star
                      className={`h-3.5 w-3.5 ${
                        trip.favorite
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-600 dark:text-gray-300"
                      }`}
                    />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      shareTrip(trip.id);
                    }}
                    className="w-8 h-8 rounded-full bg-white/90 dark:bg-gray-900/90 hover:bg-white dark:hover:bg-gray-900 flex items-center justify-center shadow-lg transition-all hover-elevate"
                    data-testid={`button-share-${trip.id}`}
                  >
                    <Share2 className="h-3.5 w-3.5 text-gray-600 dark:text-gray-300" />
                  </button>

                  <button
                    onClick={(e) => handleDeleteTrip(e, trip.id)}
                    className="w-8 h-8 rounded-full bg-white/90 dark:bg-gray-900/90 hover:bg-white dark:hover:bg-gray-900 flex items-center justify-center shadow-lg transition-all hover-elevate"
                    data-testid={`button-delete-${trip.id}`}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-500 dark:text-red-400" />
                  </button>
                </div>

                {/* Top Right Badges */}
                <div className="absolute top-3 right-3 flex gap-2 z-20">
                  {trip.isPublic === 1 && (
                    <Badge className="bg-green-500 text-white shadow-lg text-xs">
                      Public
                    </Badge>
                  )}
                  {isUpcoming(trip.startDate) && (
                    <Badge className="bg-blue-500 text-white shadow-lg text-xs">
                      Upcoming
                    </Badge>
                  )}
                </div>

                {/* Content - Bottom */}
                <div className="absolute bottom-0 left-0 right-0 p-5 text-white z-10">
                  <h4 className="text-xl font-bold mb-2 line-clamp-2" data-testid={`text-trip-name-${trip.id}`}>
                    {trip.name}
                  </h4>

                  <div className="flex items-center gap-3 text-sm text-gray-200 mb-3">
                    {trip.startDate && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        <span className="text-xs">{new Date(trip.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    )}
                    {trip.days && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        <span className="text-xs">{trip.days} days</span>
                      </div>
                    )}
                  </div>

                  {/* Total Budget */}
                  <div className="flex items-center justify-between pt-3 border-t border-white/20">
                    <span className="text-xs text-gray-300">Total Budget</span>
                    <span className="text-xl font-bold" data-testid={`text-total-cost-${trip.id}`}>
                      ${trip.totalCost.toFixed(0)}
                    </span>
                  </div>

                  {/* View Details Arrow (appears on hover) */}
                  <div className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="h-5 w-5" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <CreateTripDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreate={handleCreateTrip}
      />
    </div>
  );
}
