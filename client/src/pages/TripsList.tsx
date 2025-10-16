import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, MapPin, Plane, Hotel, Ticket, Star, Calendar, MoreVertical, Trash2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import CreateTripDialog from "@/components/CreateTripDialog";
import Header from "@/components/Header";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

type Trip = {
  id: string;
  name: string;
  startDate?: string;
  endDate?: string;
  days?: number;
  totalCost: number;
  favorite?: number;
  expenseCounts?: {
    flights: number;
    accommodation: number;
    activities: number;
  };
};

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
        window.location.href = "/api/login";
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
    deleteTripMutation.mutate(tripId);
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

      {/* Gradient Hero Section */}
      <div className="relative bg-gradient-to-r from-blue-600 via-blue-400 to-cyan-400 overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxkZWZzPjxwYXR0ZXJuIGlkPSJhIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiPjxwYXRoIGQ9Ik0wIDQwTDQwIDBIMzBMMCAxMFptNDAgMEw0MCAzMEwzMCA0MHoiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNhKSIvPjwvc3ZnPg==')] opacity-30"></div>
        <div className="relative max-w-6xl mx-auto px-6 py-12">
          <div className="flex items-start justify-between">
            <div className="text-white">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-5 w-5" />
                <h1 className="text-lg font-medium">Your Travel Journey</h1>
              </div>
              <h2 className="text-2xl font-bold mb-1">My Trip Budgets</h2>
              <p className="text-white/90">
                {trips.length === 0
                  ? "Start planning your next adventure"
                  : `${trips.length} trip${trips.length === 1 ? "" : "s"} planned`}
              </p>
            </div>
            <Button
              onClick={() => setShowCreateDialog(true)}
              variant="secondary"
              className="gap-2 bg-white hover:bg-white/90 text-primary shadow-md"
              data-testid="button-create-new-trip"
            >
              <Plus className="h-4 w-4" />
              Create New Trip
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {trips.length === 0 ? (
          <Card className="p-16">
            <div className="text-center">
              <div className="mb-6 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <MapPin className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">
                No trips yet
              </h3>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Start planning your adventure by creating your first trip budget
              </p>
              <Button 
                onClick={() => setShowCreateDialog(true)}
                size="lg"
                className="gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600"
                data-testid="button-create-first-trip"
              >
                <Plus className="h-4 w-4" />
                Create Your First Trip
              </Button>
            </div>
          </Card>
        ) : (
          <>
            <h3 className="text-xl font-bold mb-6">All Trips</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedTrips.map((trip) => (
                <Card
                  key={trip.id}
                  className="overflow-hidden cursor-pointer hover-elevate active-elevate-2 transition-all"
                  onClick={() => setLocation(`/trip/${trip.id}`)}
                  data-testid={`card-trip-${trip.id}`}
                >
                  {/* Gradient Header */}
                  <div className="relative h-32 bg-gradient-to-br from-blue-500 via-blue-300 to-cyan-300">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxkZWZzPjxwYXR0ZXJuIGlkPSJiIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiPjxwYXRoIGQ9Ik0wIDQwTDQwIDBIMzBMMCAxMFptNDAgMEw0MCAzMEwzMCA0MHoiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2IpIi8+PC9zdmc+')] opacity-40"></div>
                    
                    {/* Star Button */}
                    <button
                      onClick={(e) => handleToggleFavorite(e, trip.id)}
                      className="absolute top-3 left-3 w-8 h-8 rounded-lg bg-white/90 hover:bg-white flex items-center justify-center shadow-sm transition-colors z-10"
                      data-testid={`button-favorite-${trip.id}`}
                    >
                      <Star
                        className={`h-4 w-4 ${
                          trip.favorite
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-600"
                        }`}
                      />
                    </button>

                    {/* Menu Dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="absolute top-3 left-14 w-8 h-8 rounded-lg bg-white/90 hover:bg-white flex items-center justify-center shadow-sm transition-colors z-10"
                          data-testid={`button-menu-${trip.id}`}
                        >
                          <MoreVertical className="h-4 w-4 text-gray-600" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" data-testid={`menu-content-${trip.id}`}>
                        <DropdownMenuItem
                          onClick={(e) => handleDeleteTrip(e, trip.id)}
                          className="text-destructive focus:text-destructive cursor-pointer"
                          data-testid={`menu-delete-${trip.id}`}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Trip
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Upcoming Badge */}
                    {isUpcoming(trip.startDate) && (
                      <div className="absolute top-3 right-3">
                        <Badge className="bg-green-500 hover:bg-green-500 text-white shadow-sm">
                          Upcoming
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Card Content */}
                  <div className="p-5">
                    <h4 className="text-lg font-bold mb-3" data-testid={`text-trip-name-${trip.id}`}>
                      {trip.name}
                    </h4>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                      {trip.startDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{new Date(trip.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                      )}
                      {trip.days && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          <span>{trip.days} days</span>
                        </div>
                      )}
                    </div>

                    {/* Expense Category Counts */}
                    <div className="flex items-center gap-4 mb-4 pb-4 border-b">
                      <div className="flex items-center gap-1 text-sm">
                        <Plane className="h-4 w-4 text-blue-500" />
                        <span className="text-muted-foreground">{trip.expenseCounts?.flights || 0}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        <Hotel className="h-4 w-4 text-purple-500" />
                        <span className="text-muted-foreground">{trip.expenseCounts?.accommodation || 0}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        <Ticket className="h-4 w-4 text-orange-500" />
                        <span className="text-muted-foreground">{trip.expenseCounts?.activities || 0}</span>
                      </div>
                    </div>

                    {/* Total Budget */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total Budget</span>
                      <span className="text-lg font-bold text-primary" data-testid={`text-total-cost-${trip.id}`}>
                        ${trip.totalCost.toFixed(0)}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </>
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
