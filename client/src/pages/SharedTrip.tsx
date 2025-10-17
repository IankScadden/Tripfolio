import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Plane, Train, Bus, Utensils, Hotel, Ticket, CalendarDays, ExternalLink, MapPin, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";

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
};

type SharedTripData = {
  trip: Trip;
  expenses: Expense[];
};

export default function SharedTrip() {
  const [, params] = useRoute("/share/:shareId");
  const shareId = params?.shareId;

  const { data, isLoading } = useQuery<SharedTripData>({
    queryKey: ["/api/share", shareId],
    queryFn: async () => {
      const response = await fetch(`/api/share/${shareId}`);
      if (!response.ok) throw new Error("Failed to fetch shared trip");
      return response.json();
    },
    enabled: !!shareId,
  });

  const trip = data?.trip;
  const expenses = data?.expenses || [];

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
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Tripfolio</h1>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Trip Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" data-testid="text-trip-name">
            {trip.name}
          </h1>
          {trip.startDate && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              <span>
                {new Date(trip.startDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
                {trip.endDate &&
                  ` - ${new Date(trip.endDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}`}
              </span>
              {trip.days && <span className="ml-2">• {trip.days} days</span>}
            </div>
          )}
        </div>

        {/* Total Cost Card */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Total Trip Cost</p>
              <p className="text-5xl font-bold text-primary" data-testid="text-total-cost">
                ${trip.totalCost.toFixed(0)}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Budget Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Budget Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {CATEGORIES.map((category) => {
                const categoryExpenses = expensesByCategory[category.id] || [];
                const total = categoryExpenses.reduce(
                  (sum, e) => sum + parseFloat(e.cost),
                  0
                );
                const Icon = category.icon;

                return (
                  <div key={category.id}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" style={{ color: category.color }} />
                        <span className="font-medium">{category.title}</span>
                      </div>
                      <span className="font-semibold">${total.toFixed(0)}</span>
                    </div>
                    
                    {categoryExpenses.length > 0 && (
                      <div className="ml-6 space-y-2">
                        {categoryExpenses.map((expense) => (
                          <div
                            key={expense.id}
                            className="flex items-start justify-between text-sm"
                          >
                            <div className="flex-1">
                              <p className="text-foreground">{expense.description}</p>
                              {expense.date && (
                                <p className="text-xs text-muted-foreground">
                                  {new Date(expense.date).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">
                                ${parseFloat(expense.cost).toFixed(2)}
                              </span>
                              {expense.url && (
                                <a
                                  href={expense.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-primary hover:underline"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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
              {categoryTotals.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryTotals}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {categoryTotals.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  No expenses added yet
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
