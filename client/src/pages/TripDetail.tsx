import { useState } from "react";
import { ArrowLeft, Plane, Train, Bus, Utensils, Home, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import TripHeader from "@/components/TripHeader";
import CategorySection from "@/components/CategorySection";
import BudgetChart from "@/components/BudgetChart";
import AddExpenseDialog from "@/components/AddExpenseDialog";
import ShareTripDialog from "@/components/ShareTripDialog";
import ThemeToggle from "@/components/ThemeToggle";

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

export default function TripDetail() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  //todo: remove mock functionality
  const [expenses, setExpenses] = useState<any[]>([
    {
      id: "1",
      category: "flights",
      description: "Flight to Paris",
      cost: 450,
      url: "https://example.com",
      date: "2024-06-15",
    },
    {
      id: "2",
      category: "flights",
      description: "Return flight from Rome",
      cost: 380,
      date: "2024-07-05",
    },
    {
      id: "3",
      category: "accommodation",
      description: "Hotel in Paris (5 nights)",
      cost: 600,
      date: "2024-06-15",
    },
    {
      id: "4",
      category: "intercity",
      description: "Train Paris to Amsterdam",
      cost: 120,
      date: "2024-06-20",
    },
    {
      id: "5",
      category: "food",
      description: "Daily food budget",
      cost: 600,
    },
    {
      id: "6",
      category: "activities",
      description: "Museum passes & tours",
      cost: 300,
    },
  ]);

  const handleAddExpense = (category: string) => {
    setSelectedCategory(category);
    setShowAddDialog(true);
  };

  const handleSaveExpense = (expense: any) => {
    const newExpense = {
      id: Date.now().toString(),
      category: selectedCategory,
      ...expense,
    };
    setExpenses([...expenses, newExpense]);
    console.log("Added expense:", newExpense);
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

  const totalCost = expenses.reduce((sum, e) => sum + parseFloat(e.cost), 0);

  const chartData = CATEGORIES.map((cat) => ({
    name: cat.title,
    value: getCategoryTotal(cat.id),
    color: cat.color,
  })).filter((item) => item.value > 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              className="gap-2"
              onClick={() => console.log("Navigate back")}
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
            tripName="Europe Backpacking Adventure"
            startDate="2024-06-15"
            endDate="2024-07-05"
            days={20}
            totalCost={totalCost}
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
                expenses={getExpensesByCategory(category.id)}
                total={getCategoryTotal(category.id)}
                onAddExpense={() => handleAddExpense(category.id)}
                onEditExpense={(id) => console.log("Edit expense:", id)}
                onDeleteExpense={(id) => {
                  setExpenses(expenses.filter((e) => e.id !== id));
                  console.log("Delete expense:", id);
                }}
              />
            ))}
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <BudgetChart data={chartData} />
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
        shareUrl={`${window.location.origin}/share/abc123`}
      />
    </div>
  );
}
