import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import TripCard from "@/components/TripCard";
import CreateTripDialog from "@/components/CreateTripDialog";
import ThemeToggle from "@/components/ThemeToggle";
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

  const handleCreateTrip = (trip: any) => {
    createTripMutation.mutate(trip);
    setShowCreateDialog(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading trips...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">TripBudget</h1>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowCreateDialog(true)}
                className="gap-2"
                data-testid="button-new-trip"
              >
                <Plus className="h-4 w-4" />
                New Trip
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.location.href = "/api/logout"}
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">My Trips</h2>
          <p className="text-muted-foreground">
            Plan and track your backpacking adventures
          </p>
        </div>

        {trips.length === 0 ? (
          <div className="text-center py-16">
            <div className="mb-4">
              <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                <Plus className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              No trips yet
            </h3>
            <p className="text-muted-foreground mb-6">
              Create your first trip to start planning
            </p>
            <Button onClick={() => setShowCreateDialog(true)} data-testid="button-create-first-trip">
              Create Your First Trip
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip) => (
              <TripCard
                key={trip.id}
                name={trip.name}
                startDate={trip.startDate}
                endDate={trip.endDate}
                days={trip.days}
                totalCost={trip.totalCost}
                onClick={() => setLocation(`/trip/${trip.id}`)}
              />
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
