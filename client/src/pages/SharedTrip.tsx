import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { Plane, Train, Bus, Utensils, Hotel, Ticket, CalendarDays, Link2, MapPin, DollarSign, ChevronDown, ChevronUp, Copy, PieChart as PieChartIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { JourneyMap } from "@/components/JourneyMap";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const CATEGORIES = [
  {
    id: "flights",
    title: "Flights",
    icon: Plane,
    color: "hsl(200, 85%, 55%)",
  },
  {
    id: "intercity",
    title: "City to City Transportation",
    icon: Train,
    color: "hsl(30, 90%, 60%)",
  },
  {
    id: "local",
    title: "Local Transportation",
    icon: Bus,
    color: "hsl(280, 70%, 65%)",
  },
  {
    id: "accommodation",
    title: "Lodging",
    icon: Hotel,
    color: "hsl(150, 60%, 50%)",
  },
  {
    id: "food",
    title: "Food",
    icon: Utensils,
    color: "hsl(330, 70%, 65%)",
  },
  {
    id: "activities",
    title: "Activities & Attractions",
    icon: Ticket,
    color: "hsl(50, 85%, 60%)",
  },
  {
    id: "other",
    title: "Other Costs",
    icon: DollarSign,
    color: "hsl(180, 60%, 55%)",
  },
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
  dayNumber?: number;
};

type DayDetail = {
  id: string;
  tripId: string;
  dayNumber: number;
  destination?: string;
  latitude?: string;
  longitude?: string;
  localTransportNotes?: string;
  notes?: string;
};

type SharedTripData = {
  trip: Trip;
  expenses: Expense[];
  dayDetails: DayDetail[];
};

export default function SharedTrip() {
  const [, params] = useRoute("/share/:shareId");
  const shareId = params?.shareId;
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [breakdownView, setBreakdownView] = useState<"list" | "chart">("list");

  const { data, isLoading } = useQuery<SharedTripData>({
    queryKey: ["/api/share", shareId],
    queryFn: async () => {
      const response = await fetch(`/api/share/${shareId}`);
      if (!response.ok) throw new Error("Failed to fetch shared trip");
      return response.json();
    },
    enabled: !!shareId,
  });

  const cloneTripMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/share/${shareId}/clone`);
      return await response.json();
    },
    onSuccess: (newTrip) => {
      toast({
        title: "Template Created!",
        description: `"${newTrip.name}" has been added to your trips. Let's customize it!`,
      });
      // Redirect to the new trip
      setLocation(`/trip/${newTrip.id}`);
    },
    onError: (error: any) => {
      if (error.message?.includes("401") || error.message?.includes("Unauthorized")) {
        toast({
          title: "Sign in required",
          description: "Please sign in to clone this trip as a template.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to create template. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  const trip = data?.trip;

  const expenses = data?.expenses || [];
  const dayDetails = data?.dayDetails || [];

  const expensesByCategory = expenses.reduce((acc, expense) => {
    const category = expense.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(expense);
    return acc;
  }, {} as Record<string, Expense[]>);

  const categoryTotals = CATEGORIES.map((category) => {
    const categoryExpenses = expensesByCategory[category.id] || [];
    const total = categoryExpenses.reduce((sum, e) => sum + parseFloat(e.cost), 0);
    return {
      name: category.title,
      value: total,
      color: category.color,
    };
  }).filter((cat) => cat.value > 0);

  // Prepare journey map locations
  const mapLocations = dayDetails
    .filter((day) => day.destination && day.latitude && day.longitude)
    .map((day) => ({
      dayNumber: day.dayNumber,
      destination: day.destination!,
      latitude: parseFloat(day.latitude!),
      longitude: parseFloat(day.longitude!),
      date: expenses.find(e => e.dayNumber === day.dayNumber)?.date,
    }));

  // Group expenses by day for itinerary
  const expensesByDay = expenses.reduce((acc, expense) => {
    if (expense.dayNumber) {
      if (!acc[expense.dayNumber]) {
        acc[expense.dayNumber] = [];
      }
      acc[expense.dayNumber].push(expense);
    }
    return acc;
  }, {} as Record<number, Expense[]>);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const getVisibleExpenses = (categoryId: string) => {
    const categoryExpenses = expensesByCategory[categoryId] || [];
    const isExpanded = expandedCategories.has(categoryId);
    return isExpanded ? categoryExpenses : categoryExpenses.slice(0, 1);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading shared trip...</div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-foreground mb-2">Trip Not Found</h3>
            <p className="text-muted-foreground">This shared trip link may be invalid or expired.</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <Link href="/" data-testid="link-tripfolio-home">
            <a className="flex items-center gap-2 hover-elevate transition-colors px-3 py-2 rounded-md w-fit">
              <MapPin className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">Tripfolio</h1>
            </a>
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Trip Header */}
        <div className="mb-8">
          <div className="text-center mb-4">
            <h1 className="text-4xl font-bold mb-3" data-testid="text-trip-name">
              {trip.name}
            </h1>
            {trip.startDate && (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <CalendarDays className="h-4 w-4" />
                <span>
                  {formatDate(trip.startDate)}
                  {trip.endDate && ` - ${formatDate(trip.endDate)}`}
                </span>
                {trip.days && <span className="ml-2">• {trip.days} days</span>}
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="default"
              className="gap-2"
              onClick={() => cloneTripMutation.mutate()}
              disabled={cloneTripMutation.isPending}
              data-testid="button-use-as-template"
            >
              <Copy className="h-4 w-4" />
              {cloneTripMutation.isPending ? "Creating..." : "Use as Template"}
            </Button>
            
            {trip.days && trip.days > 0 && (
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    className="gap-2"
                    data-testid="button-day-by-day-layout"
                  >
                    <CalendarDays className="h-4 w-4" />
                    Day-by-Day Layout
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
                  <SheetHeader className="mb-6">
                    <SheetTitle className="text-2xl">Daily Itinerary</SheetTitle>
                  </SheetHeader>
                  
                  <div className="space-y-4">
                    {Array.from({ length: trip.days }, (_, i) => i + 1).map((dayNumber) => {
                      const dayDetail = dayDetails.find(d => d.dayNumber === dayNumber);
                      const dayExpenses = expensesByDay[dayNumber] || [];
                      const dayDate = dayExpenses.find(e => e.date)?.date;

                      return (
                        <Card key={dayNumber} data-testid={`card-day-${dayNumber}`}>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <CalendarDays className="h-5 w-5" />
                              Day {dayNumber}
                              {dayDate && (
                                <span className="text-sm font-normal text-muted-foreground ml-2">
                                  • {formatDate(dayDate)}
                                </span>
                              )}
                            </CardTitle>
                            {dayDetail?.destination && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <MapPin className="h-4 w-4" />
                                {dayDetail.destination}
                              </div>
                            )}
                          </CardHeader>
                          <CardContent>
                            {dayExpenses.length > 0 ? (
                              <div className="space-y-2">
                                {dayExpenses.map((expense) => {
                                  const category = CATEGORIES.find(c => c.id === expense.category);
                                  const Icon = category?.icon || DollarSign;
                                  
                                  return (
                                    <div
                                      key={expense.id}
                                      className="flex items-start justify-between py-2 border-b last:border-0"
                                    >
                                      <div className="flex items-start gap-2 flex-1">
                                        <Icon className="h-4 w-4 mt-0.5" style={{ color: category?.color }} />
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2">
                                            <p className="text-sm font-medium">{expense.description}</p>
                                            {expense.url && (
                                              <a
                                                href={expense.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-primary hover:underline"
                                              >
                                                <Link2 className="h-3 w-3" />
                                              </a>
                                            )}
                                          </div>
                                          <p className="text-xs text-muted-foreground">{category?.title}</p>
                                        </div>
                                      </div>
                                      <span className="text-sm font-semibold ml-2">
                                        ${parseFloat(expense.cost).toFixed(2)}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">No expenses for this day</p>
                            )}
                            {dayDetail?.localTransportNotes && (
                              <div className="mt-3 pt-3 border-t">
                                <p className="text-xs text-muted-foreground mb-1">Local Transport Notes:</p>
                                <p className="text-sm">{dayDetail.localTransportNotes}</p>
                              </div>
                            )}
                            {dayDetail?.notes && (
                              <div className="mt-3 pt-3 border-t">
                                <p className="text-xs text-muted-foreground mb-1">Notes for the Day:</p>
                                <p className="text-sm whitespace-pre-wrap">{dayDetail.notes}</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </SheetContent>
              </Sheet>
            )}
          </div>
        </div>

        {/* Budget Overview */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Left: Total Trip Cost */}
          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-3">
              <CardTitle className="text-base">Budget Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Total Trip Cost */}
              <div className="text-center py-3">
                <div className="text-sm text-muted-foreground mb-2">Total Trip Cost</div>
                <div className="text-5xl font-bold" data-testid="text-total-cost">
                  ${trip.totalCost.toFixed(0)}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right: Budget Breakdown with Toggle */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base">Budget Breakdown</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setBreakdownView(breakdownView === "list" ? "chart" : "list")}
                data-testid="button-toggle-breakdown-view"
                className="gap-2"
              >
                <PieChartIcon className="h-4 w-4" />
                {breakdownView === "list" ? "Pie Chart" : "List View"}
              </Button>
            </CardHeader>
            <CardContent>
              {breakdownView === "list" ? (
                <div className="space-y-3">
                  {CATEGORIES.map((category) => {
                    const categoryExpenses = expensesByCategory[category.id] || [];
                    const total = categoryExpenses.reduce((sum, e) => sum + parseFloat(e.cost), 0);
                    if (total === 0) return null;
                    const Icon = category.icon;
                    return (
                      <div key={category.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" style={{ color: category.color }} />
                          <span className="text-sm">{category.title}</span>
                        </div>
                        <span className="text-sm font-medium" data-testid={`text-category-total-${category.id}`}>
                          ${total.toFixed(0)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : categoryTotals.length > 0 ? (
                <div className="h-[280px]">
                  <div className="flex items-center gap-6 h-full">
                    <div className="flex-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryTotals}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {categoryTotals.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const item = payload[0].payload;
                                const percentage = ((item.value / trip.totalCost) * 100).toFixed(1);
                                return (
                                  <div className="bg-card border border-border rounded-md p-2 shadow-lg">
                                    <p className="font-semibold text-foreground text-xs">{item.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      ${item.value.toLocaleString()} ({percentage}%)
                                    </p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2">
                      {categoryTotals.map((entry, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-sm"
                            style={{ backgroundColor: entry.color }}
                          />
                          <span className="text-xs">{entry.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                  No expenses added yet
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detailed Category Breakdown */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {CATEGORIES.map((category) => {
            const categoryExpenses = expensesByCategory[category.id] || [];
            const total = categoryExpenses.reduce((sum, e) => sum + parseFloat(e.cost), 0);
            if (total === 0) return null;

            const Icon = category.icon;
            const visibleExpenses = getVisibleExpenses(category.id);
            const hasMore = categoryExpenses.length > 1;
            const isExpanded = expandedCategories.has(category.id);

            return (
              <Card key={category.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Icon className="h-4 w-4" style={{ color: category.color }} />
                    {category.title}
                  </CardTitle>
                  <span className="font-semibold text-lg" data-testid={`text-category-detail-total-${category.id}`}>
                    ${total.toFixed(0)}
                  </span>
                </CardHeader>
                <CardContent>
                  {categoryExpenses.length > 0 ? (
                    <>
                      <div className="space-y-2">
                        {visibleExpenses.map((expense) => (
                          <div
                            key={expense.id}
                            className="flex items-start justify-between py-2 border-b last:border-0"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium">{expense.description}</p>
                                {expense.url && (
                                  <a
                                    href={expense.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                    data-testid={`link-expense-url-${expense.id}`}
                                  >
                                    <Link2 className="h-3.5 w-3.5" />
                                  </a>
                                )}
                              </div>
                              {expense.date && (
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(expense.date)}
                                </p>
                              )}
                            </div>
                            <span className="text-sm font-medium ml-2">
                              ${parseFloat(expense.cost).toFixed(0)}
                            </span>
                          </div>
                        ))}
                      </div>
                      {hasMore && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2 gap-1 w-full"
                          onClick={() => toggleCategory(category.id)}
                          data-testid={`button-toggle-${category.id}`}
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-3 w-3" />
                              Show Less
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3 w-3" />
                              Show More ({categoryExpenses.length - 1} more)
                            </>
                          )}
                        </Button>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">No expenses added</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Journey Map */}
        {mapLocations.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Journey Map
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[600px]">
                <JourneyMap locations={mapLocations} />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
