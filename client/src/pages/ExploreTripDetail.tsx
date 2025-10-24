import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, Calendar, MapPin, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/components/Header";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = [
  { id: "flights", title: "Flights", color: "hsl(200, 85%, 55%)" },
  { id: "intercity", title: "City to City Transportation", color: "hsl(30, 90%, 60%)" },
  { id: "local", title: "Local Transportation", color: "hsl(280, 70%, 65%)" },
  { id: "accommodation", title: "Lodging", color: "hsl(150, 60%, 50%)" },
  { id: "food", title: "Food", color: "hsl(330, 70%, 65%)" },
  { id: "activities", title: "Activities & Attractions", color: "hsl(50, 85%, 60%)" },
  { id: "other", title: "Other Costs", color: "hsl(180, 60%, 55%)" },
];

type Trip = {
  id: string;
  name: string;
  startDate?: string;
  endDate?: string;
  days?: number;
  totalCost: number;
};

type Expense = {
  id: string;
  tripId: string;
  category: string;
  description: string;
  cost: string;
  url?: string;
  date?: string;
};

type DayDetail = {
  id: string;
  tripId: string;
  dayNumber: number;
  destination?: string;
};

type User = {
  id: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
};

type TripDetailResponse = {
  trip: Trip;
  expenses: Expense[];
  dayDetails: DayDetail[];
  owner: User;
};

export default function ExploreTripDetail() {
  const [, params] = useRoute("/explore/:id");
  const [, setLocation] = useLocation();
  const tripId = params?.id;
  const { toast } = useToast();

  const { data, isLoading } = useQuery<TripDetailResponse>({
    queryKey: ["/api/explore/trips", tripId],
    queryFn: async () => {
      const response = await fetch(`/api/explore/trips/${tripId}`);
      if (!response.ok) throw new Error("Failed to fetch trip");
      return response.json();
    },
    enabled: !!tripId,
  });

  const cloneTripMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/explore/trips/${tripId}/clone`, {});
      return await response.json();
    },
    onSuccess: (newTrip) => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      toast({
        title: "Success",
        description: "Trip copied to your account! Redirecting...",
      });
      setTimeout(() => {
        setLocation(`/trip/${newTrip.id}`);
      }, 1000);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to copy trip. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getExpensesByCategory = (categoryId: string) => {
    if (!data) return [];
    return data.expenses
      .filter((e) => e.category === categoryId)
      .sort((a, b) => {
        if (a.date && b.date) {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        }
        if (a.date && !b.date) return -1;
        if (!a.date && b.date) return 1;
        return 0;
      });
  };

  const getCategoryTotal = (categoryId: string) => {
    return getExpensesByCategory(categoryId).reduce(
      (sum, e) => sum + parseFloat(e.cost),
      0
    );
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const getUserDisplayName = (user: User) => {
    if (user.displayName) return user.displayName;
    if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
    if (user.firstName) return user.firstName;
    return user.email || "Anonymous";
  };

  const getUniqueDestinations = () => {
    if (!data) return [];
    return Array.from(
      new Set(
        data.dayDetails
          .filter(d => d.destination)
          .map(d => d.destination as string)
      )
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading trip...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Trip not found</h2>
          <Button onClick={() => setLocation("/explore")} data-testid="button-back-explore">
            Back to Explore
          </Button>
        </div>
      </div>
    );
  }

  const { trip, owner } = data;
  const destinations = getUniqueDestinations();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Back Button and Actions */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <Button
            variant="ghost"
            className="gap-2"
            onClick={() => setLocation("/explore")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Explore
          </Button>
          <Button
            variant="default"
            className="gap-2"
            onClick={() => cloneTripMutation.mutate()}
            disabled={cloneTripMutation.isPending}
            data-testid="button-clone-trip"
          >
            <Copy className="h-4 w-4" />
            {cloneTripMutation.isPending ? "Copying..." : "Use as Template"}
          </Button>
        </div>

        {/* Trip Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2" data-testid="text-trip-name">{trip.name}</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span data-testid="text-trip-dates">
                {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
              </span>
            </div>
            {trip.days && (
              <div className="flex items-center gap-1">
                <span data-testid="text-trip-days">{trip.days} days</span>
              </div>
            )}
            {destinations.length > 0 && (
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>{destinations.join(", ")}</span>
              </div>
            )}
            <div className="text-sm">
              by <span className="font-medium">{getUserDisplayName(owner)}</span>
            </div>
          </div>
        </div>

        {/* Total Cost Card */}
        <Card className="mb-8 bg-muted/30">
          <CardContent className="py-6 text-center">
            <div className="text-sm text-muted-foreground mb-1">Total Trip Cost</div>
            <div className="text-4xl font-bold" data-testid="text-total-cost">
              ${trip.totalCost.toFixed(0)}
            </div>
            {trip.days && trip.days > 0 && (
              <div className="text-sm text-muted-foreground mt-2">
                ${(trip.totalCost / trip.days).toFixed(0)} per day
              </div>
            )}
          </CardContent>
        </Card>

        {/* Budget Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Budget Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {CATEGORIES.map((category) => {
                const categoryExpenses = getExpensesByCategory(category.id);
                const categoryTotal = getCategoryTotal(category.id);
                
                if (categoryTotal === 0) return null;

                return (
                  <div key={category.id}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">{category.title}</h3>
                      <span className="font-bold text-lg" style={{ color: category.color }}>
                        ${categoryTotal.toFixed(0)}
                      </span>
                    </div>
                    <div className="space-y-2 ml-4">
                      {categoryExpenses.map((expense) => (
                        <div
                          key={expense.id}
                          className="flex items-center justify-between text-sm py-2 border-b last:border-0"
                        >
                          <div className="flex-1">
                            <div className="font-medium">{expense.description}</div>
                            {expense.date && (
                              <div className="text-xs text-muted-foreground">
                                {formatDate(expense.date)}
                              </div>
                            )}
                          </div>
                          <span className="font-medium">${parseFloat(expense.cost).toFixed(0)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Clone CTA */}
        <div className="mt-8 text-center p-6 bg-muted/30 rounded-lg">
          <p className="text-sm text-muted-foreground mb-3">
            Like this trip plan? Copy it to your account as a starting point for your own adventure.
          </p>
          <Button
            variant="default"
            onClick={() => cloneTripMutation.mutate()}
            disabled={cloneTripMutation.isPending}
            data-testid="button-clone-bottom"
          >
            <Copy className="h-4 w-4 mr-2" />
            {cloneTripMutation.isPending ? "Copying..." : "Use as Template"}
          </Button>
        </div>
      </div>
    </div>
  );
}
