import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, Calendar, MapPin, Copy, ChevronDown, ChevronUp, Plane, Train, Bus, Utensils, Hotel, Ticket, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";
import Header from "@/components/Header";
import { JourneyMap } from "@/components/JourneyMap";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = [
  { id: "flights", title: "Flights", icon: Plane, color: "hsl(200, 85%, 55%)" },
  { id: "intercity", title: "City to City Transportation", icon: Train, color: "hsl(30, 90%, 60%)" },
  { id: "local", title: "Local Transportation", icon: Bus, color: "hsl(280, 70%, 65%)" },
  { id: "accommodation", title: "Lodging", icon: Hotel, color: "hsl(150, 60%, 50%)" },
  { id: "food", title: "Food", icon: Utensils, color: "hsl(330, 70%, 65%)" },
  { id: "activities", title: "Activities & Attractions", icon: Ticket, color: "hsl(50, 85%, 60%)" },
  { id: "other", title: "Other Costs", icon: DollarSign, color: "hsl(180, 60%, 55%)" },
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
  notes?: string;
  latitude?: string;
  longitude?: string;
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
  const [isExpanded, setIsExpanded] = useState(false);

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

  const chartData = CATEGORIES.map((cat) => ({
    name: cat.title,
    value: getCategoryTotal(cat.id),
    color: cat.color,
  })).filter((item) => item.value > 0);

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

  const locations = data.dayDetails
    .filter(detail => detail.destination && detail.latitude && detail.longitude)
    .map(detail => {
      let date: string | undefined;
      if (trip.startDate) {
        const [year, month, day] = trip.startDate.split('-').map(Number);
        const calculatedDate = new Date(year, month - 1, day + detail.dayNumber - 1);
        date = calculatedDate.toISOString().split('T')[0];
      }
      return {
        dayNumber: detail.dayNumber,
        destination: detail.destination!,
        latitude: parseFloat(detail.latitude!),
        longitude: parseFloat(detail.longitude!),
        date,
      };
    });

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
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setIsExpanded(!isExpanded)}
              data-testid="button-expand-trip"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Collapse Trip
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Expand Trip
                </>
              )}
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

        {/* Budget Breakdown and Visual Breakdown */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Budget Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Budget Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {CATEGORIES.map((category) => {
                const IconComponent = category.icon;
                const total = getCategoryTotal(category.id);
                return (
                  <div key={category.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <IconComponent className="h-4 w-4" style={{ color: category.color }} />
                      <span className="text-sm">{category.title}</span>
                    </div>
                    <span className="text-sm font-medium" data-testid={`text-category-total-${category.id}`}>
                      ${total.toFixed(0)}
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Visual Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Visual Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ percent }) => 
                        percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''
                      }
                      outerRadius={90}
                      fill="#8884d8"
                      dataKey="value"
                      style={{ fontSize: '14px', fontWeight: 'bold' }}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend 
                      wrapperStyle={{ fontSize: '12px' }}
                      iconSize={10}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No expenses added yet
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Expandable Day-by-Day Section */}
        {isExpanded && (
          <div className="space-y-6">
            {/* Journey Map */}
            {locations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Journey Map</CardTitle>
                </CardHeader>
                <CardContent>
                  <JourneyMap locations={locations} />
                </CardContent>
              </Card>
            )}

            {/* Day-by-Day Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Day-by-Day Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {Array.from({ length: trip.days || 0 }, (_, i) => {
                    const dayNumber = i + 1;
                    const dayDetail = data.dayDetails.find(d => d.dayNumber === dayNumber);
                    const dayExpenses = data.expenses.filter(e => {
                      if (!e.date || !trip.startDate) return false;
                      const expenseDate = new Date(e.date);
                      const [year, month, day] = trip.startDate.split('-').map(Number);
                      const tripStartDate = new Date(year, month - 1, day);
                      const dayDate = new Date(tripStartDate);
                      dayDate.setDate(tripStartDate.getDate() + i);
                      return expenseDate.toDateString() === dayDate.toDateString();
                    });
                    const dayTotal = dayExpenses.reduce((sum, e) => sum + parseFloat(e.cost), 0);

                    let dayDate: string | undefined = undefined;
                    if (trip.startDate) {
                      const [year, month, day] = trip.startDate.split('-').map(Number);
                      const calculatedDate = new Date(year, month - 1, day + i);
                      dayDate = calculatedDate.toISOString().split('T')[0];
                    }

                    return (
                      <div key={dayNumber} className="border-b last:border-0 pb-4 last:pb-0">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="font-semibold">Day {dayNumber}</h3>
                            {dayDate && (
                              <p className="text-xs text-muted-foreground">{formatDate(dayDate)}</p>
                            )}
                            {dayDetail?.destination && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                <MapPin className="h-3 w-3" />
                                {dayDetail.destination}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-bold">${dayTotal.toFixed(0)}</p>
                          </div>
                        </div>
                        {dayDetail?.notes && (
                          <p className="text-sm text-muted-foreground mb-2">{dayDetail.notes}</p>
                        )}
                        {dayExpenses.length > 0 && (
                          <div className="space-y-1 ml-4">
                            {dayExpenses.map(expense => {
                              const category = CATEGORIES.find(c => c.id === expense.category);
                              return (
                                <div key={expense.id} className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-2">
                                    {category && <category.icon className="h-3 w-3" style={{ color: category.color }} />}
                                    <span>{expense.description}</span>
                                  </div>
                                  <span className="font-medium">${parseFloat(expense.cost).toFixed(0)}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

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
