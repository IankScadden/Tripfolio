import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, Plane, Train, Bus, Utensils, Hotel, Ticket, CalendarDays, ExternalLink, DollarSign, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import Header from "@/components/Header";
import AddExpenseDialog from "@/components/AddExpenseDialog";
import FoodBudgetDialog from "@/components/FoodBudgetDialog";
import TripCalendar from "@/components/TripCalendar";
import DayDetail from "@/components/DayDetail";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTripSchema } from "@shared/schema";
import { z } from "zod";

const CATEGORIES = [
  {
    id: "flights",
    title: "Flights",
    icon: Plane,
    color: "hsl(200, 85%, 55%)",
    addLabel: "Add Flight",
    emptyLabel: "No flights added",
  },
  {
    id: "intercity",
    title: "City to City Transportation",
    icon: Train,
    color: "hsl(30, 90%, 60%)",
    addLabel: "Add Route",
    emptyLabel: "No transportation added",
  },
  {
    id: "local",
    title: "Local Transportation",
    icon: Bus,
    color: "hsl(280, 70%, 65%)",
    addLabel: "Add Transport",
    emptyLabel: "No local transport added",
  },
  {
    id: "accommodation",
    title: "Lodging",
    icon: Hotel,
    color: "hsl(150, 60%, 50%)",
    addLabel: "Add Lodging",
    emptyLabel: "No lodging added",
  },
  {
    id: "food",
    title: "Food",
    icon: Utensils,
    color: "hsl(330, 70%, 65%)",
    addLabel: "Edit Budget",
    emptyLabel: "No food budget set",
  },
  {
    id: "activities",
    title: "Activities & Attractions",
    icon: Ticket,
    color: "hsl(50, 85%, 60%)",
    addLabel: "Add Activity",
    emptyLabel: "No activities added",
  },
  {
    id: "other",
    title: "Other Costs",
    icon: DollarSign,
    color: "hsl(180, 60%, 55%)",
    addLabel: "Add Cost",
    emptyLabel: "No other costs added",
  },
];

type Trip = {
  id: string;
  name: string;
  startDate?: string;
  endDate?: string;
  days?: number;
  totalCost: number;
  shareId?: string;
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

export default function TripDetail() {
  const [, params] = useRoute("/trip/:id");
  const [, setLocation] = useLocation();
  const tripId = params?.id;
  const { toast } = useToast();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showFoodBudgetDialog, setShowFoodBudgetDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showEditTripDialog, setShowEditTripDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showDayDetail, setShowDayDetail] = useState(false);
  const [selectedDay, setSelectedDay] = useState<{ dayNumber: number; date?: string } | null>(null);

  const { data: trip, isLoading: tripLoading, error: tripError } = useQuery<Trip>({
    queryKey: ["/api/trips", tripId],
    queryFn: async () => {
      const response = await fetch(`/api/trips/${tripId}`);
      if (!response.ok) throw new Error("Failed to fetch trip");
      return response.json();
    },
    enabled: !!tripId,
  });

  const { data: expenses = [], isLoading: expensesLoading, error: expensesError } = useQuery<Expense[]>({
    queryKey: ["/api/trips", tripId, "expenses"],
    queryFn: async () => {
      const response = await fetch(`/api/trips/${tripId}/expenses`);
      if (!response.ok) throw new Error("Failed to fetch expenses");
      return response.json();
    },
    enabled: !!tripId,
  });

  useEffect(() => {
    const error = tripError || expensesError;
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
  }, [tripError, expensesError, toast]);

  const createExpenseMutation = useMutation({
    mutationFn: async (expenseData: any) => {
      const response = await apiRequest("POST", "/api/expenses", { ...expenseData, tripId });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId, "expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId] });
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] }); // Invalidate trips list
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      } else {
        toast({
          title: "Error",
          description: "Failed to add expense. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (expenseId: string) => {
      const response = await apiRequest("DELETE", `/api/expenses/${expenseId}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId, "expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId] });
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] }); // Invalidate trips list
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      } else {
        toast({
          title: "Error",
          description: "Failed to delete expense. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  const updateTripMutation = useMutation({
    mutationFn: async (data: { name: string; startDate?: string | null; endDate?: string | null; days?: number | null }) => {
      const response = await apiRequest("PATCH", `/api/trips/${tripId}`, data);
      return await response.json();
    },
    onSuccess: async () => {
      // Force fresh fetch by removing cached queries
      queryClient.removeQueries({ queryKey: ["/api/trips", tripId] });
      queryClient.removeQueries({ queryKey: ["/api/trips", tripId, "expenses"] });
      queryClient.removeQueries({ queryKey: ["/api/trips"] });
      
      // Wait a moment for cache to clear
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Refetch trip data
      await queryClient.refetchQueries({ queryKey: ["/api/trips", tripId] });
      
      toast({
        title: "Success",
        description: "Trip updated successfully",
      });
      setShowEditTripDialog(false);
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      } else {
        toast({
          title: "Error",
          description: "Failed to update trip. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  const handleAddExpense = (category: string) => {
    if (category === "food") {
      setShowFoodBudgetDialog(true);
    } else {
      setSelectedCategory(category);
      setShowAddDialog(true);
    }
  };

  const handleSaveExpense = (expense: any) => {
    createExpenseMutation.mutate({ ...expense, category: selectedCategory });
  };

  const handleSaveFoodBudget = async (dailyBudget: number) => {
    const totalCost = dailyBudget * (trip?.days || 1);
    
    // Delete existing food expenses first
    const existingFoodExpenses = getExpensesByCategory("food");
    for (const expense of existingFoodExpenses) {
      await deleteExpenseMutation.mutateAsync(expense.id);
    }
    
    // Create new food budget expense
    createExpenseMutation.mutate({
      description: "Food Budget",
      cost: totalCost.toString(),
      category: "food",
    });
  };

  const handleDeleteExpense = (expenseId: string) => {
    deleteExpenseMutation.mutate(expenseId);
  };

  const handleDayClick = (dayNumber: number, date?: string) => {
    setSelectedDay({ dayNumber, date });
    setShowCalendar(false);
    setShowDayDetail(true);
  };

  const handleSaveDayDetail = async (data: any) => {
    // Clear cache and force fresh fetch
    queryClient.removeQueries({ queryKey: ["/api/trips", tripId, "expenses"] });
    queryClient.removeQueries({ queryKey: ["/api/trips", tripId] });
    // Wait a moment for cache to clear
    await new Promise(resolve => setTimeout(resolve, 100));
    setShowDayDetail(false);
    setShowCalendar(true);
  };

  const handlePreviousDay = () => {
    if (selectedDay && selectedDay.dayNumber > 1) {
      const newDayNumber = selectedDay.dayNumber - 1;
      let newDate: string | undefined = undefined;
      
      if (trip?.startDate) {
        // Parse date in local timezone to avoid timezone offset issues
        const [year, month, day] = trip.startDate.split('-').map(Number);
        const calculatedDate = new Date(year, month - 1, day + newDayNumber - 1);
        newDate = calculatedDate.toISOString().split('T')[0];
      }
      
      setSelectedDay({ dayNumber: newDayNumber, date: newDate });
    }
  };

  const handleNextDay = () => {
    if (selectedDay && trip?.days && selectedDay.dayNumber < trip.days) {
      const newDayNumber = selectedDay.dayNumber + 1;
      let newDate: string | undefined = undefined;
      
      if (trip?.startDate) {
        // Parse date in local timezone to avoid timezone offset issues
        const [year, month, day] = trip.startDate.split('-').map(Number);
        const calculatedDate = new Date(year, month - 1, day + newDayNumber - 1);
        newDate = calculatedDate.toISOString().split('T')[0];
      }
      
      setSelectedDay({ dayNumber: newDayNumber, date: newDate });
    }
  };

  const getExpensesByCategory = (categoryId: string) => {
    return expenses.filter((e) => e.category === categoryId);
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

  if (tripLoading || expensesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading trip...</div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Trip not found</h2>
          <Button onClick={() => setLocation("/")} data-testid="button-back-home">
            Back to Trips
          </Button>
        </div>
      </div>
    );
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const foodBudget = getCategoryTotal("food");
  const dailyFoodBudget = trip.days && trip.days > 0 ? Math.round(foodBudget / trip.days) : 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Back Button and Trip Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            className="gap-2"
            onClick={() => setLocation("/my-trips")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button
            variant="default"
            className="gap-2"
            onClick={() => setShowCalendar(true)}
            data-testid="button-day-by-day-layout"
          >
            <ExternalLink className="h-4 w-4" />
            Day by Day Layout
          </Button>
        </div>

        {/* Trip Name and Info */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2" data-testid="text-trip-name">{trip.name}</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <CalendarDays className="h-4 w-4" />
              <span data-testid="text-trip-dates">
                {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
              </span>
            </div>
            {trip.days && (
              <div className="flex items-center gap-1">
                <span data-testid="text-trip-days">{trip.days} days</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setShowEditTripDialog(true)}
              data-testid="button-edit-trip"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Total Trip Cost Card */}
        <Card className="mb-8 bg-muted/30">
          <CardContent className="py-6 text-center">
            <div className="text-sm text-muted-foreground mb-1">Total Trip Cost</div>
            <div className="text-4xl font-bold" data-testid="text-total-cost">
              ${trip.totalCost.toFixed(0)}
            </div>
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
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => 
                        percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ''
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  No expenses added yet
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Category Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Flights */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Plane className="h-4 w-4" style={{ color: CATEGORIES[0].color }} />
                Flights
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-1" 
                onClick={() => handleAddExpense("flights")}
                data-testid="button-add-flights"
              >
                <span className="text-2xl leading-none">+</span> Add Flight
              </Button>
            </CardHeader>
            <CardContent>
              {getExpensesByCategory("flights").length > 0 ? (
                <div className="space-y-2">
                  {getExpensesByCategory("flights").map((expense) => (
                    <div key={expense.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex-1">
                        <div className="text-sm font-medium">{expense.description}</div>
                        {expense.date && (
                          <div className="text-xs text-muted-foreground">{formatDate(expense.date)}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">${parseFloat(expense.cost).toFixed(0)}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteExpense(expense.id)}
                          className="h-8 px-2 text-destructive hover:text-destructive"
                          data-testid={`button-delete-expense-${expense.id}`}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No flights added</p>
              )}
            </CardContent>
          </Card>

          {/* City to City Transportation */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Train className="h-4 w-4" style={{ color: CATEGORIES[1].color }} />
                City to City Transportation
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-1" 
                onClick={() => handleAddExpense("intercity")}
                data-testid="button-add-transportation"
              >
                <span className="text-2xl leading-none">+</span> Add Route
              </Button>
            </CardHeader>
            <CardContent>
              {getExpensesByCategory("intercity").length > 0 ? (
                <div className="space-y-2">
                  {getExpensesByCategory("intercity").map((expense) => (
                    <div key={expense.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex-1">
                        <div className="text-sm font-medium">{expense.description}</div>
                        {expense.date && (
                          <div className="text-xs text-muted-foreground">{formatDate(expense.date)}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">${parseFloat(expense.cost).toFixed(0)}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteExpense(expense.id)}
                          className="h-8 px-2 text-destructive hover:text-destructive"
                          data-testid={`button-delete-expense-${expense.id}`}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No transportation added</p>
              )}
            </CardContent>
          </Card>

          {/* Local Transportation */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Bus className="h-4 w-4" style={{ color: CATEGORIES[2].color }} />
                Local Transportation
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-1" 
                onClick={() => handleAddExpense("local")}
                data-testid="button-add-local-transport"
              >
                <span className="text-2xl leading-none">+</span> Add Transport
              </Button>
            </CardHeader>
            <CardContent>
              {getExpensesByCategory("local").length > 0 ? (
                <div className="space-y-2">
                  {getExpensesByCategory("local").map((expense) => (
                    <div key={expense.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex-1">
                        <div className="text-sm font-medium">{expense.description}</div>
                        {expense.date && (
                          <div className="text-xs text-muted-foreground">{formatDate(expense.date)}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">${parseFloat(expense.cost).toFixed(0)}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteExpense(expense.id)}
                          className="h-8 px-2 text-destructive hover:text-destructive"
                          data-testid={`button-delete-expense-${expense.id}`}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No local transport added</p>
              )}
            </CardContent>
          </Card>

          {/* Lodging */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Hotel className="h-4 w-4" style={{ color: CATEGORIES[3].color }} />
                Lodging
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-1" 
                onClick={() => handleAddExpense("accommodation")}
                data-testid="button-add-lodging"
              >
                <span className="text-2xl leading-none">+</span> Add Lodging
              </Button>
            </CardHeader>
            <CardContent>
              {getExpensesByCategory("accommodation").length > 0 ? (
                <div className="space-y-2">
                  {getExpensesByCategory("accommodation").map((expense) => (
                    <div key={expense.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex-1">
                        <div className="text-sm font-medium">{expense.description}</div>
                        {expense.date && (
                          <div className="text-xs text-muted-foreground">{formatDate(expense.date)}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">${parseFloat(expense.cost).toFixed(0)}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteExpense(expense.id)}
                          className="h-8 px-2 text-destructive hover:text-destructive"
                          data-testid={`button-delete-expense-${expense.id}`}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No lodging added</p>
              )}
            </CardContent>
          </Card>

          {/* Activities & Attractions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Ticket className="h-4 w-4" style={{ color: CATEGORIES[5].color }} />
                Activities & Attractions
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-1" 
                onClick={() => handleAddExpense("activities")}
                data-testid="button-add-activities"
              >
                <span className="text-2xl leading-none">+</span> Add Activity
              </Button>
            </CardHeader>
            <CardContent>
              {getExpensesByCategory("activities").length > 0 ? (
                <div className="space-y-2">
                  {getExpensesByCategory("activities").map((expense) => (
                    <div key={expense.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex-1">
                        <div className="text-sm font-medium">{expense.description}</div>
                        {expense.date && (
                          <div className="text-xs text-muted-foreground">{formatDate(expense.date)}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">${parseFloat(expense.cost).toFixed(0)}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteExpense(expense.id)}
                          className="h-8 px-2 text-destructive hover:text-destructive"
                          data-testid={`button-delete-expense-${expense.id}`}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No activities added</p>
              )}
            </CardContent>
          </Card>

          {/* Other Costs */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" style={{ color: CATEGORIES[6].color }} />
                Other Costs
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-1" 
                onClick={() => handleAddExpense("other")}
                data-testid="button-add-other"
              >
                <span className="text-2xl leading-none">+</span> Add Cost
              </Button>
            </CardHeader>
            <CardContent>
              {getExpensesByCategory("other").length > 0 ? (
                <div className="space-y-2">
                  {getExpensesByCategory("other").map((expense) => (
                    <div key={expense.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex-1">
                        <div className="text-sm font-medium">{expense.description}</div>
                        {expense.date && (
                          <div className="text-xs text-muted-foreground">{formatDate(expense.date)}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">${parseFloat(expense.cost).toFixed(0)}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteExpense(expense.id)}
                          className="h-8 px-2 text-destructive hover:text-destructive"
                          data-testid={`button-delete-expense-${expense.id}`}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No other costs added</p>
              )}
            </CardContent>
          </Card>

          {/* Food Budget - Full width */}
          <Card className="md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Utensils className="h-4 w-4" style={{ color: CATEGORIES[4].color }} />
                Food Budget
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowFoodBudgetDialog(true)}
                data-testid="button-edit-food-budget"
              >
                Edit Budget
              </Button>
            </CardHeader>
            <CardContent>
              {foodBudget > 0 ? (
                <div className="grid grid-cols-3 gap-6">
                  <div className="bg-muted/30 rounded-lg p-4 text-center">
                    <div className="text-sm text-muted-foreground mb-1">Daily Budget</div>
                    <div className="text-2xl font-bold" data-testid="text-daily-budget">
                      ${dailyFoodBudget}
                    </div>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-4 text-center">
                    <div className="text-sm text-muted-foreground mb-1">Trip Days</div>
                    <div className="text-2xl font-bold" data-testid="text-food-days">
                      {trip.days || 0}
                    </div>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-4 text-center">
                    <div className="text-sm text-muted-foreground mb-1">Total Food Cost</div>
                    <div className="text-2xl font-bold" data-testid="text-food-total">
                      ${foodBudget.toFixed(0)}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No food budget set</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AddExpenseDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        categoryTitle={
          CATEGORIES.find((c) => c.id === selectedCategory)?.title || ""
        }
        onAdd={handleSaveExpense}
      />

      <FoodBudgetDialog
        open={showFoodBudgetDialog}
        onOpenChange={setShowFoodBudgetDialog}
        tripDays={trip?.days || 1}
        currentDailyBudget={dailyFoodBudget}
        onSave={handleSaveFoodBudget}
      />

      <TripCalendar
        open={showCalendar}
        onOpenChange={setShowCalendar}
        tripName={trip?.name || ""}
        startDate={trip?.startDate}
        endDate={trip?.endDate}
        days={trip?.days}
        onDayClick={handleDayClick}
      />

      <DayDetail
        open={showDayDetail}
        onOpenChange={setShowDayDetail}
        tripId={tripId || ""}
        dayNumber={selectedDay?.dayNumber || 1}
        date={selectedDay?.date}
        totalDays={trip?.days || 1}
        dailyFoodBudget={dailyFoodBudget}
        onSave={handleSaveDayDetail}
        onPrevious={handlePreviousDay}
        onNext={handleNextDay}
      />

      <EditTripDialog
        open={showEditTripDialog}
        onOpenChange={setShowEditTripDialog}
        trip={trip}
        onSave={(data) => updateTripMutation.mutate(data)}
        isPending={updateTripMutation.isPending}
      />
    </div>
  );
}

// Edit Trip Dialog Component
const editTripFormSchema = z.object({
  name: z.string().min(1, "Trip name is required"),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  days: z.number().min(1).optional().nullable(),
});

type EditTripFormValues = z.infer<typeof editTripFormSchema>;

function EditTripDialog({
  open,
  onOpenChange,
  trip,
  onSave,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip: Trip | undefined;
  onSave: (data: EditTripFormValues) => void;
  isPending: boolean;
}) {
  const form = useForm<EditTripFormValues>({
    resolver: zodResolver(editTripFormSchema),
    defaultValues: {
      name: trip?.name || "",
      startDate: trip?.startDate || null,
      endDate: trip?.endDate || null,
      days: trip?.days || null,
    },
  });

  useEffect(() => {
    if (trip && open) {
      form.reset({
        name: trip.name || "",
        startDate: trip.startDate || null,
        endDate: trip.endDate || null,
        days: trip.days || null,
      });
    }
  }, [trip, open, form]);

  const handleSubmit = (data: EditTripFormValues) => {
    onSave(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-edit-trip">
        <DialogHeader>
          <DialogTitle>Edit Trip Details</DialogTitle>
          <DialogDescription>
            Update the duration and dates for your trip. This will affect the day-by-day calendar layout.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Trip Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Europe 2025"
                      {...field}
                      data-testid="input-trip-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                      data-testid="input-start-date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Date (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                      data-testid="input-end-date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="days"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Days</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      {...field}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                      data-testid="input-days"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
                data-testid="button-cancel-edit"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} data-testid="button-save-edit">
                {isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
