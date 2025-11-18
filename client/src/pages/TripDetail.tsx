import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, Plane, Train, Bus, Utensils, Hotel, Ticket, CalendarDays, ExternalLink, DollarSign, Pencil, MoreVertical, Check, Settings, Link2, Share2, PieChart, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import Header from "@/components/Header";
import AddExpenseDialog from "@/components/AddExpenseDialog";
import FoodBudgetDialog from "@/components/FoodBudgetDialog";
import TripCalendar from "@/components/TripCalendar";
import DayDetail from "@/components/DayDetail";
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
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
  budget?: string | null;
};

type Expense = {
  id: string;
  tripId: string;
  category: string;
  description: string;
  cost: string;
  url?: string;
  date?: string;
  purchased?: number;
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
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [budgetInput, setBudgetInput] = useState<string>("");
  const [breakdownView, setBreakdownView] = useState<"list" | "chart">("list");

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

  useEffect(() => {
    if (trip?.budget) {
      setBudgetInput(trip.budget);
    }
  }, [trip?.budget]);

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

  const updateExpenseMutation = useMutation({
    mutationFn: async ({ expenseId, data }: { expenseId: string; data: any }) => {
      const response = await apiRequest("PATCH", `/api/expenses/${expenseId}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId, "expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId] });
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      toast({
        title: "Success",
        description: "Expense updated successfully",
      });
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
          description: "Failed to update expense. Please try again.",
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

  const togglePurchasedMutation = useMutation({
    mutationFn: async ({ expenseId, purchased }: { expenseId: string; purchased: number }) => {
      const response = await apiRequest("PATCH", `/api/expenses/${expenseId}`, { purchased });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId, "expenses"] });
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
          description: "Failed to update purchase status. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  const shareTripMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/trips/${tripId}/share`);
      return await response.json();
    },
    onSuccess: async (data: { shareId: string }) => {
      const shareUrl = `${window.location.origin}/share/${data.shareId}`;
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast({
          title: "Link Copied!",
          description: "Share link has been copied to your clipboard. Anyone with this link can view your budget breakdown.",
        });
      } catch (clipboardError) {
        // Fallback if clipboard API fails - show the link
        toast({
          title: "Share Link Generated!",
          description: shareUrl,
          duration: 10000,
        });
      }
    },
    onError: (error) => {
      console.error("Share trip error:", error);
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
          description: `Failed to generate share link: ${error instanceof Error ? error.message : 'Please try again.'}`,
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

  const updateBudgetMutation = useMutation({
    mutationFn: async (budget: string) => {
      const response = await apiRequest("PATCH", `/api/trips/${tripId}`, { budget });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId] });
      toast({
        title: "Success",
        description: "Budget updated successfully",
      });
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
          description: "Failed to update budget. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  const handleBudgetChange = (value: string) => {
    setBudgetInput(value);
  };

  const handleBudgetBlur = () => {
    if (budgetInput !== (trip?.budget || "")) {
      const numericValue = parseFloat(budgetInput);
      if (!isNaN(numericValue) && numericValue >= 0) {
        updateBudgetMutation.mutate(numericValue.toString());
      } else if (budgetInput === "") {
        // Allow clearing the budget
        updateBudgetMutation.mutate("");
      }
    }
  };

  const handleAddExpense = (category: string) => {
    if (category === "food") {
      setShowFoodBudgetDialog(true);
    } else {
      setSelectedCategory(category);
      setShowAddDialog(true);
    }
  };

  const handleSaveExpense = (expense: any) => {
    if (editingExpense) {
      // Update existing expense
      updateExpenseMutation.mutate({
        expenseId: editingExpense.id,
        data: expense,
      });
      setEditingExpense(null);
    } else {
      // Create new expense
      createExpenseMutation.mutate({ ...expense, category: selectedCategory });
    }
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setSelectedCategory(expense.category);
    setShowAddDialog(true);
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

  const handleTogglePurchased = (expense: Expense) => {
    const newPurchasedValue = expense.purchased ? 0 : 1;
    togglePurchasedMutation.mutate({ expenseId: expense.id, purchased: newPurchasedValue });
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
    return expenses
      .filter((e) => e.category === categoryId)
      .sort((a, b) => {
        // If both have dates, sort chronologically
        if (a.date && b.date) {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        }
        // If only a has a date, a comes first
        if (a.date && !b.date) {
          return -1;
        }
        // If only b has a date, b comes first
        if (!a.date && b.date) {
          return 1;
        }
        // If neither has a date, maintain original order
        return 0;
      });
  };

  const getCategoryTotal = (categoryId: string) => {
    return getExpensesByCategory(categoryId).reduce(
      (sum, e) => sum + parseFloat(e.cost),
      0
    );
  };

  const toggleCategoryExpanded = (categoryId: string) => {
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
    const categoryExpenses = getExpensesByCategory(categoryId);
    const isExpanded = expandedCategories.has(categoryId);
    return isExpanded ? categoryExpenses : categoryExpenses.slice(0, 3);
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
    // Parse date in local timezone to avoid timezone offset issues
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
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
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => shareTripMutation.mutate()}
              disabled={shareTripMutation.isPending}
              data-testid="button-share-trip"
            >
              <Share2 className="h-4 w-4" />
              {shareTripMutation.isPending ? "Generating..." : "Share Trip"}
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setLocation(`/trip/${tripId}/post`)}
              data-testid="button-post-trip"
            >
              <Settings className="h-4 w-4" />
              Post Trip
            </Button>
            <Button
              variant="default"
              className="gap-2"
              onClick={() => setLocation(`/trip/${tripId}/itinerary`)}
              data-testid="button-day-by-day-layout"
            >
              <ExternalLink className="h-4 w-4" />
              Day-by-Day Layout
            </Button>
          </div>
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

        {/* Combined Budget Overview and Breakdown */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Left: Budget Summary */}
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

              {/* Budget Input */}
              <div className="pt-2">
                <label htmlFor="trip-budget" className="text-[11px] text-muted-foreground mb-1 block text-center">
                  Trip Budget
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                  <Input
                    id="trip-budget"
                    type="number"
                    placeholder="0.00"
                    value={budgetInput}
                    onChange={(e) => handleBudgetChange(e.target.value)}
                    onBlur={handleBudgetBlur}
                    className="pl-7 text-center h-8 text-sm"
                    data-testid="input-trip-budget"
                    min="0"
                    step="1"
                  />
                </div>
              </div>

              {/* Remaining Budget */}
              {trip.budget && parseFloat(trip.budget) > 0 && (
                <div className="text-center py-2">
                  <div className="text-xs text-muted-foreground mb-1">
                    {parseFloat(trip.budget) - trip.totalCost >= 0 ? "Under Budget" : "Over Budget"}
                  </div>
                  <div 
                    className={`text-2xl font-bold ${
                      parseFloat(trip.budget) - trip.totalCost >= 0 
                        ? "text-green-600 dark:text-green-400" 
                        : "text-red-600 dark:text-red-400"
                    }`}
                    data-testid="text-remaining-budget"
                  >
                    ${Math.abs(parseFloat(trip.budget) - trip.totalCost).toFixed(0)}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right: Budget Breakdown */}
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
                <PieChart className="h-4 w-4" />
                {breakdownView === "list" ? "Pie Chart" : "List View"}
              </Button>
            </CardHeader>
            <CardContent>
              {breakdownView === "list" ? (
                <div className="space-y-3">
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
                </div>
              ) : chartData.length > 0 ? (
                <div className="flex items-center gap-6 h-[280px]">
                  {/* Legend on the left */}
                  <div className="flex-shrink-0 space-y-2 w-48">
                    {chartData.map((item, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">
                            {item.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            ${item.value.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Pie chart on the right */}
                  <div className="flex-1 h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
                            const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                            const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                            const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                            return (
                              <text
                                x={x}
                                y={y}
                                fill="white"
                                textAnchor="middle"
                                dominantBaseline="central"
                                className="text-xs font-bold"
                              >
                                {`${(percent * 100).toFixed(0)}%`}
                              </text>
                            );
                          }}
                          outerRadius={90}
                          innerRadius={50}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }: any) => {
                            if (active && payload && payload.length) {
                              const item = payload[0];
                              const total = chartData.reduce((sum, d) => sum + d.value, 0);
                              const percentage = ((item.value / total) * 100).toFixed(1);
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
                      </RechartsPie>
                    </ResponsiveContainer>
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
                <>
                  <div className="space-y-2">
                    {getVisibleExpenses("flights").map((expense) => (
                      <div 
                        key={expense.id} 
                        className={`flex items-center justify-between py-2 border-b last:border-0 transition-opacity ${expense.purchased ? 'opacity-60' : 'opacity-100'}`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-medium">{expense.description}</div>
                            {expense.url && (
                              <a
                                href={expense.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-primary transition-colors"
                                data-testid={`link-expense-url-${expense.id}`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Link2 className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </div>
                          {expense.date && (
                            <div className="text-xs text-muted-foreground">{formatDate(expense.date)}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">${parseFloat(expense.cost).toFixed(0)}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 ${expense.purchased ? 'text-green-600 hover:text-green-700' : 'text-muted-foreground hover:text-green-600'}`}
                            onClick={() => handleTogglePurchased(expense)}
                            data-testid={`button-toggle-purchased-${expense.id}`}
                          >
                            <Check className={`h-4 w-4 ${expense.purchased ? 'opacity-100' : 'opacity-30'}`} />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                data-testid={`button-expense-menu-${expense.id}`}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleTogglePurchased(expense)}
                                data-testid={`menu-toggle-purchased-${expense.id}`}
                              >
                                {expense.purchased ? 'Mark as Not Purchased' : 'Mark as Purchased'}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleEditExpense(expense)}
                                data-testid={`menu-edit-expense-${expense.id}`}
                              >
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteExpense(expense.id)}
                                className="text-destructive"
                                data-testid={`menu-delete-expense-${expense.id}`}
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                  {getExpensesByCategory("flights").length > 3 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => toggleCategoryExpanded("flights")}
                      data-testid="button-toggle-flights"
                    >
                      {expandedCategories.has("flights") ? "Show Less" : `Show More (${getExpensesByCategory("flights").length - 3} more)`}
                    </Button>
                  )}
                </>
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
                <>
                  <div className="space-y-2">
                    {getVisibleExpenses("intercity").map((expense) => (
                      <div 
                        key={expense.id} 
                        className={`flex items-center justify-between py-2 border-b last:border-0 transition-opacity ${expense.purchased ? 'opacity-60' : 'opacity-100'}`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-medium">{expense.description}</div>
                            {expense.url && (
                              <a
                                href={expense.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-primary transition-colors"
                                data-testid={`link-expense-url-${expense.id}`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Link2 className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </div>
                          {expense.date && (
                            <div className="text-xs text-muted-foreground">{formatDate(expense.date)}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">${parseFloat(expense.cost).toFixed(0)}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 ${expense.purchased ? 'text-green-600 hover:text-green-700' : 'text-muted-foreground hover:text-green-600'}`}
                            onClick={() => handleTogglePurchased(expense)}
                            data-testid={`button-toggle-purchased-${expense.id}`}
                          >
                            <Check className={`h-4 w-4 ${expense.purchased ? 'opacity-100' : 'opacity-30'}`} />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                data-testid={`button-expense-menu-${expense.id}`}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleTogglePurchased(expense)}
                                data-testid={`menu-toggle-purchased-${expense.id}`}
                              >
                                {expense.purchased ? 'Mark as Not Purchased' : 'Mark as Purchased'}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleEditExpense(expense)}
                                data-testid={`menu-edit-expense-${expense.id}`}
                              >
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteExpense(expense.id)}
                                className="text-destructive"
                                data-testid={`menu-delete-expense-${expense.id}`}
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                  {getExpensesByCategory("intercity").length > 3 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => toggleCategoryExpanded("intercity")}
                      data-testid="button-toggle-intercity"
                    >
                      {expandedCategories.has("intercity") ? "Show Less" : `Show More (${getExpensesByCategory("intercity").length - 3} more)`}
                    </Button>
                  )}
                </>
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
                <>
                  <div className="space-y-2">
                    {getVisibleExpenses("local").map((expense) => (
                      <div 
                        key={expense.id} 
                        className={`flex items-center justify-between py-2 border-b last:border-0 transition-opacity ${expense.purchased ? 'opacity-60' : 'opacity-100'}`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-medium">{expense.description}</div>
                            {expense.url && (
                              <a
                                href={expense.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-primary transition-colors"
                                data-testid={`link-expense-url-${expense.id}`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Link2 className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </div>
                          {expense.date && (
                            <div className="text-xs text-muted-foreground">{formatDate(expense.date)}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">${parseFloat(expense.cost).toFixed(0)}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 ${expense.purchased ? 'text-green-600 hover:text-green-700' : 'text-muted-foreground hover:text-green-600'}`}
                            onClick={() => handleTogglePurchased(expense)}
                            data-testid={`button-toggle-purchased-${expense.id}`}
                          >
                            <Check className={`h-4 w-4 ${expense.purchased ? 'opacity-100' : 'opacity-30'}`} />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                data-testid={`button-expense-menu-${expense.id}`}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleTogglePurchased(expense)}
                                data-testid={`menu-toggle-purchased-${expense.id}`}
                              >
                                {expense.purchased ? 'Mark as Not Purchased' : 'Mark as Purchased'}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleEditExpense(expense)}
                                data-testid={`menu-edit-expense-${expense.id}`}
                              >
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteExpense(expense.id)}
                                className="text-destructive"
                                data-testid={`menu-delete-expense-${expense.id}`}
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                  {getExpensesByCategory("local").length > 3 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => toggleCategoryExpanded("local")}
                      data-testid="button-toggle-local"
                    >
                      {expandedCategories.has("local") ? "Show Less" : `Show More (${getExpensesByCategory("local").length - 3} more)`}
                    </Button>
                  )}
                </>
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
                <>
                  <div className="space-y-2">
                    {getVisibleExpenses("accommodation").map((expense) => (
                      <div 
                        key={expense.id} 
                        className={`flex items-center justify-between py-2 border-b last:border-0 transition-opacity ${expense.purchased ? 'opacity-60' : 'opacity-100'}`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-medium">{expense.description}</div>
                            {expense.url && (
                              <a
                                href={expense.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-primary transition-colors"
                                data-testid={`link-expense-url-${expense.id}`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Link2 className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </div>
                          {expense.date && (
                            <div className="text-xs text-muted-foreground">{formatDate(expense.date)}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">${parseFloat(expense.cost).toFixed(0)}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 ${expense.purchased ? 'text-green-600 hover:text-green-700' : 'text-muted-foreground hover:text-green-600'}`}
                            onClick={() => handleTogglePurchased(expense)}
                            data-testid={`button-toggle-purchased-${expense.id}`}
                          >
                            <Check className={`h-4 w-4 ${expense.purchased ? 'opacity-100' : 'opacity-30'}`} />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                data-testid={`button-expense-menu-${expense.id}`}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleTogglePurchased(expense)}
                                data-testid={`menu-toggle-purchased-${expense.id}`}
                              >
                                {expense.purchased ? 'Mark as Not Purchased' : 'Mark as Purchased'}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleEditExpense(expense)}
                                data-testid={`menu-edit-expense-${expense.id}`}
                              >
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteExpense(expense.id)}
                                className="text-destructive"
                                data-testid={`menu-delete-expense-${expense.id}`}
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                  {getExpensesByCategory("accommodation").length > 3 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => toggleCategoryExpanded("accommodation")}
                      data-testid="button-toggle-accommodation"
                    >
                      {expandedCategories.has("accommodation") ? "Show Less" : `Show More (${getExpensesByCategory("accommodation").length - 3} more)`}
                    </Button>
                  )}
                </>
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
                <>
                  <div className="space-y-2">
                    {getVisibleExpenses("activities").map((expense) => (
                      <div 
                        key={expense.id} 
                        className={`flex items-center justify-between py-2 border-b last:border-0 transition-opacity ${expense.purchased ? 'opacity-60' : 'opacity-100'}`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-medium">{expense.description}</div>
                            {expense.url && (
                              <a
                                href={expense.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-primary transition-colors"
                                data-testid={`link-expense-url-${expense.id}`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Link2 className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </div>
                          {expense.date && (
                            <div className="text-xs text-muted-foreground">{formatDate(expense.date)}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">${parseFloat(expense.cost).toFixed(0)}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 ${expense.purchased ? 'text-green-600 hover:text-green-700' : 'text-muted-foreground hover:text-green-600'}`}
                            onClick={() => handleTogglePurchased(expense)}
                            data-testid={`button-toggle-purchased-${expense.id}`}
                          >
                            <Check className={`h-4 w-4 ${expense.purchased ? 'opacity-100' : 'opacity-30'}`} />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                data-testid={`button-expense-menu-${expense.id}`}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleTogglePurchased(expense)}
                                data-testid={`menu-toggle-purchased-${expense.id}`}
                              >
                                {expense.purchased ? 'Mark as Not Purchased' : 'Mark as Purchased'}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleEditExpense(expense)}
                                data-testid={`menu-edit-expense-${expense.id}`}
                              >
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteExpense(expense.id)}
                                className="text-destructive"
                                data-testid={`menu-delete-expense-${expense.id}`}
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                  {getExpensesByCategory("activities").length > 3 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => toggleCategoryExpanded("activities")}
                      data-testid="button-toggle-activities"
                    >
                      {expandedCategories.has("activities") ? "Show Less" : `Show More (${getExpensesByCategory("activities").length - 3} more)`}
                    </Button>
                  )}
                </>
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
                <>
                  <div className="space-y-2">
                    {getVisibleExpenses("other").map((expense) => (
                      <div 
                        key={expense.id} 
                        className={`flex items-center justify-between py-2 border-b last:border-0 transition-opacity ${expense.purchased ? 'opacity-60' : 'opacity-100'}`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-medium">{expense.description}</div>
                            {expense.url && (
                              <a
                                href={expense.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-primary transition-colors"
                                data-testid={`link-expense-url-${expense.id}`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Link2 className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </div>
                          {expense.date && (
                            <div className="text-xs text-muted-foreground">{formatDate(expense.date)}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">${parseFloat(expense.cost).toFixed(0)}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 ${expense.purchased ? 'text-green-600 hover:text-green-700' : 'text-muted-foreground hover:text-green-600'}`}
                            onClick={() => handleTogglePurchased(expense)}
                            data-testid={`button-toggle-purchased-${expense.id}`}
                          >
                            <Check className={`h-4 w-4 ${expense.purchased ? 'opacity-100' : 'opacity-30'}`} />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                data-testid={`button-expense-menu-${expense.id}`}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleTogglePurchased(expense)}
                                data-testid={`menu-toggle-purchased-${expense.id}`}
                              >
                                {expense.purchased ? 'Mark as Not Purchased' : 'Mark as Purchased'}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleEditExpense(expense)}
                                data-testid={`menu-edit-expense-${expense.id}`}
                              >
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteExpense(expense.id)}
                                className="text-destructive"
                                data-testid={`menu-delete-expense-${expense.id}`}
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                  {getExpensesByCategory("other").length > 3 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => toggleCategoryExpanded("other")}
                      data-testid="button-toggle-other"
                    >
                      {expandedCategories.has("other") ? "Show Less" : `Show More (${getExpensesByCategory("other").length - 3} more)`}
                    </Button>
                  )}
                </>
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
        onOpenChange={(open) => {
          setShowAddDialog(open);
          if (!open) {
            setEditingExpense(null);
          }
        }}
        categoryTitle={
          CATEGORIES.find((c) => c.id === selectedCategory)?.title || ""
        }
        onAdd={handleSaveExpense}
        initialData={editingExpense ? {
          description: editingExpense.description,
          cost: editingExpense.cost,
          url: editingExpense.url,
          date: editingExpense.date,
        } : undefined}
        mode={editingExpense ? "edit" : "add"}
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
