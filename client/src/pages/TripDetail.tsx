import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, Plane, Train, Bus, Utensils, Home, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import TripHeader from "@/components/TripHeader";
import CategorySection from "@/components/CategorySection";
import BudgetChart from "@/components/BudgetChart";
import AddExpenseDialog from "@/components/AddExpenseDialog";
import ShareTripDialog from "@/components/ShareTripDialog";
import ThemeToggle from "@/components/ThemeToggle";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

const CATEGORIES = [
  {
    id: "flights",
    title: "Flights",
    icon: <Plane className="h-5 w-5" />,
    color: "hsl(25, 85%, 55%)",
  },
  {
    id: "intercity",
    title: "Intercity Transportation",
    icon: <Train className="h-5 w-5" />,
    color: "hsl(45, 90%, 50%)",
  },
  {
    id: "local",
    title: "Local Transportation",
    icon: <Bus className="h-5 w-5" />,
    color: "hsl(45, 90%, 50%)",
  },
  {
    id: "accommodation",
    title: "Accommodation",
    icon: <Home className="h-5 w-5" />,
    color: "hsl(150, 60%, 45%)",
  },
  {
    id: "food",
    title: "Food",
    icon: <Utensils className="h-5 w-5" />,
    color: "hsl(0, 70%, 55%)",
  },
  {
    id: "activities",
    title: "Activities",
    icon: <Ticket className="h-5 w-5" />,
    color: "hsl(270, 60%, 55%)",
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
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

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

  const handleAddExpense = (category: string) => {
    setSelectedCategory(category);
    setShowAddDialog(true);
  };

  const handleSaveExpense = (expense: any) => {
    createExpenseMutation.mutate({ ...expense, category: selectedCategory });
  };

  const handleDeleteExpense = (expenseId: string) => {
    deleteExpenseMutation.mutate(expenseId);
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

  const shareUrl = `${window.location.origin}/share/${trip.shareId}`;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              className="gap-2"
              onClick={() => setLocation("/")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4" />
              My Trips
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-12">
          <TripHeader
            tripName={trip.name}
            startDate={trip.startDate}
            endDate={trip.endDate}
            days={trip.days}
            totalCost={trip.totalCost}
            onShare={() => setShowShareDialog(true)}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {CATEGORIES.map((category) => (
              <CategorySection
                key={category.id}
                title={category.title}
                icon={category.icon}
                categoryColor={category.color}
                expenses={getExpensesByCategory(category.id).map(e => ({
                  id: e.id,
                  description: e.description,
                  cost: parseFloat(e.cost),
                  url: e.url,
                  date: e.date,
                }))}
                total={getCategoryTotal(category.id)}
                onAddExpense={() => handleAddExpense(category.id)}
                onEditExpense={(id) => console.log("Edit expense:", id)}
                onDeleteExpense={handleDeleteExpense}
              />
            ))}
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-6">
              {chartData.length > 0 ? (
                <BudgetChart data={chartData} />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Add expenses to see budget breakdown
                </div>
              )}
            </div>
          </div>
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

      <ShareTripDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        shareUrl={shareUrl}
      />
    </div>
  );
}
