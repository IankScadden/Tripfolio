import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, Calendar, MapPin, Copy, ChevronDown, Heart, MessageCircle, Share2, Pencil, Check, MoreVertical, Plane, Train, Bus, Utensils, Hotel, Ticket, DollarSign, Settings, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";
import Header from "@/components/Header";
import { JourneyMap } from "@/components/JourneyMap";
import BudgetChart from "@/components/BudgetChart";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = [
  { id: "flights", title: "Flights", icon: Plane, color: "hsl(200, 85%, 55%)", addLabel: "Add Flight", emptyLabel: "No flights added" },
  { id: "intercity", title: "City to City Transportation", icon: Train, color: "hsl(30, 90%, 60%)", addLabel: "Add Route", emptyLabel: "No transportation added" },
  { id: "local", title: "Local Transportation", icon: Bus, color: "hsl(280, 70%, 65%)", addLabel: "Add Transport", emptyLabel: "No local transport added" },
  { id: "accommodation", title: "Lodging", icon: Hotel, color: "hsl(150, 60%, 50%)", addLabel: "Add Lodging", emptyLabel: "No lodging added" },
  { id: "food", title: "Food", icon: Utensils, color: "hsl(330, 70%, 65%)", addLabel: "Edit Budget", emptyLabel: "No food budget set" },
  { id: "activities", title: "Activities & Attractions", icon: Ticket, color: "hsl(50, 85%, 60%)", addLabel: "Add Activity", emptyLabel: "No activities added" },
  { id: "other", title: "Other Costs", icon: DollarSign, color: "hsl(180, 60%, 55%)", addLabel: "Add Cost", emptyLabel: "No other costs added" },
];

const DEFAULT_HEADER_IMAGE = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1600&h=600&fit=crop";

type Trip = {
  id: string;
  name: string;
  startDate?: string;
  endDate?: string;
  days?: number;
  totalCost: number;
  description?: string;
  headerImageUrl?: string;
  tags?: string[];
  photos?: string[];
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
  profileImageUrl?: string;
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
  const [showBudget, setShowBudget] = useState(false);
  const [showItinerary, setShowItinerary] = useState(false); // false = budget view, true = itinerary view

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

  const formatDayDate = (startDate: string, dayNumber: number) => {
    const [year, month, day] = startDate.split('-').map(Number);
    const date = new Date(year, month - 1, day + dayNumber - 1);
    return date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" });
  };

  const getUserDisplayName = (user: User) => {
    if (user.displayName) return user.displayName;
    if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
    if (user.firstName) return user.firstName;
    return user.email || "Anonymous";
  };

  const getUserInitial = (user: User) => {
    if (user.displayName) return user.displayName[0].toUpperCase();
    if (user.firstName) return user.firstName[0].toUpperCase();
    return "?";
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

  const locations = data?.dayDetails
    .filter(detail => detail.destination && detail.latitude && detail.longitude)
    .map(detail => {
      let date: string | undefined;
      if (data.trip.startDate) {
        const [year, month, day] = data.trip.startDate.split('-').map(Number);
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
    }) || [];

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
      
      {/* Hero Image */}
      <div className="relative h-[500px] bg-muted">
        <img 
          src={trip.headerImageUrl || DEFAULT_HEADER_IMAGE}
          alt={trip.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = DEFAULT_HEADER_IMAGE;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        
        {/* Back Button Overlay */}
        <div className="absolute top-6 left-6">
          <Button
            variant="secondary"
            className="gap-2 bg-white/90 dark:bg-gray-900/90 text-gray-900 dark:text-white backdrop-blur hover:bg-white dark:hover:bg-gray-900"
            onClick={() => setLocation("/explore")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>

        {/* Location Badge */}
        {destinations.length > 0 && (
          <div className="absolute top-6 left-1/2 transform -translate-x-1/2">
            <Badge className="bg-white/90 dark:bg-gray-900/90 text-gray-900 dark:text-white backdrop-blur px-4 py-2 text-base font-medium">
              <MapPin className="h-4 w-4 mr-1" />
              {destinations[0]}
            </Badge>
          </div>
        )}
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-32 relative z-10 pb-12">
        {/* Author Card */}
        <Card className="mb-6 bg-card/95 backdrop-blur">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 mb-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={owner.profileImageUrl} />
                <AvatarFallback>{getUserInitial(owner)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <button
                  onClick={() => setLocation(`/profile/${owner.id}`)}
                  className="font-semibold hover:text-primary transition-colors hover:underline text-left"
                  data-testid={`link-user-profile-${owner.id}`}
                >
                  {getUserDisplayName(owner)}
                </button>
                <p className="text-sm text-muted-foreground">
                  {trip.startDate && formatDate(trip.startDate)}
                </p>
              </div>
            </div>

            {/* Trip Title */}
            <h1 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-trip-name">
              {trip.name}
            </h1>

            {/* Tags */}
            {trip.tags && trip.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {trip.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="px-3 py-1">
                    {tag.startsWith('#') ? tag : `#${tag}`}
                  </Badge>
                ))}
              </div>
            )}

            {/* Engagement Row */}
            <div className="flex items-center gap-6 text-muted-foreground">
              <button className="flex items-center gap-2 hover:text-foreground transition-colors">
                <Heart className="h-5 w-5" />
                <span className="text-sm">234</span>
              </button>
              <button className="flex items-center gap-2 hover:text-foreground transition-colors">
                <MessageCircle className="h-5 w-5" />
                <span className="text-sm">45</span>
              </button>
              <button className="flex items-center gap-2 hover:text-foreground transition-colors">
                <Share2 className="h-5 w-5" />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Description */}
        {trip.description && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="prose dark:prose-invert max-w-none">
                <p className="text-base leading-relaxed whitespace-pre-wrap">
                  {trip.description}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Photo Gallery */}
        {trip.photos && trip.photos.length > 0 && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {trip.photos.map((photo, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                    <img 
                      src={photo}
                      alt={`Gallery ${index + 1}`}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Journey Map - Always Visible */}
        {locations.length > 0 && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <h3 className="font-semibold text-xl mb-4">Journey Map</h3>
              <div className="rounded-lg overflow-hidden border" style={{ height: '400px' }}>
                <JourneyMap locations={locations} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Budget Breakdown with Expand Button */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 p-3 rounded-full">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-lg">Budget Breakdown</p>
                  <p className="text-sm text-muted-foreground">
                    ${trip.totalCost.toFixed(0)} total
                    {trip.days && trip.days > 0 && ` • $${(trip.totalCost / trip.days).toFixed(0)} per day`}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBudget(true)}
                data-testid="button-expand-budget"
                className="gap-2"
              >
                View Details
                <ArrowLeft className="h-4 w-4 rotate-180" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Full Budget Breakdown Dialog - EXACT copy of My Trips layout */}
        <Dialog open={showBudget} onOpenChange={setShowBudget}>
          <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto" data-testid="dialog-budget-breakdown">
            <div className="space-y-6">
              {/* Back Button and Trip Header with Action Buttons - EXACT from TripDetail */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h1 className="text-2xl font-bold mb-2">{trip.name}</h1>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {trip.startDate && trip.endDate
                          ? `${formatDate(trip.startDate)} - ${formatDate(trip.endDate)}`
                          : 'Dates not set'}
                      </span>
                    </div>
                    {trip.days && (
                      <div className="flex items-center gap-1">
                        <span>{trip.days} days</span>
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      data-testid="button-edit-trip"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={showItinerary ? "outline" : "default"}
                    className="gap-2"
                    onClick={() => setShowItinerary(!showItinerary)}
                    data-testid="button-day-by-day-layout"
                  >
                    <ExternalLink className="h-4 w-4" />
                    {showItinerary ? "Budget View" : "Day-by-Day Layout"}
                  </Button>
                </div>
              </div>

              {!showItinerary && (
                <>
                  {/* Total Trip Cost Card - EXACT from TripDetail */}
                  <Card className="bg-muted/30">
                    <CardContent className="py-6 text-center">
                      <div className="text-sm text-muted-foreground mb-1">Total Trip Cost</div>
                      <div className="text-4xl font-bold">
                        ${trip.totalCost.toFixed(0)}
                      </div>
                    </CardContent>
                  </Card>

              {/* Budget Breakdown and Visual Breakdown - EXACT from TripDetail */}
              <div className="grid md:grid-cols-2 gap-6">
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
                          <span className="text-sm font-medium">
                            ${total.toFixed(0)}
                          </span>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                {/* Visual Breakdown with BudgetChart - EXACT from TripDetail */}
                {chartData.length > 0 ? (
                  <BudgetChart data={chartData} />
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle>Visual Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                        No expenses added yet
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Category Cards - EXACT from TripDetail */}
              <div className="grid md:grid-cols-2 gap-6">
                {CATEGORIES.map((category) => {
                  const categoryExpenses = getExpensesByCategory(category.id);
                  const total = getCategoryTotal(category.id);
                  const IconComponent = category.icon;
                  
                  return (
                    <Card key={category.id}>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-base font-medium flex items-center gap-2">
                          <IconComponent className="h-4 w-4" style={{ color: category.color }} />
                          {category.title}
                        </CardTitle>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="gap-1"
                          data-testid={`button-add-${category.id}`}
                        >
                          <span className="text-2xl leading-none">+</span> {category.addLabel}
                        </Button>
                      </CardHeader>
                      <CardContent>
                        {categoryExpenses.length > 0 ? (
                          <div className="space-y-2">
                            {categoryExpenses.map((expense) => (
                              <div 
                                key={expense.id} 
                                className="flex items-center justify-between py-2 border-b last:border-0"
                              >
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
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground"
                                    data-testid={`button-toggle-purchased-${expense.id}`}
                                  >
                                    <Check className="h-4 w-4 opacity-30" />
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
                                      <DropdownMenuItem data-testid={`menu-toggle-purchased-${expense.id}`}>
                                        Mark as Purchased
                                      </DropdownMenuItem>
                                      <DropdownMenuItem data-testid={`menu-edit-expense-${expense.id}`}>
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem className="text-destructive" data-testid={`menu-delete-expense-${expense.id}`}>
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">{category.emptyLabel}</p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}

          {/* Day-by-Day Itinerary View */}
          {showItinerary && (
            <div className="space-y-4">
              <Card className="p-6">
                <div className="space-y-4">
                  <div className="text-center mb-6">
                    <p className="text-muted-foreground">
                      View the day-by-day itinerary for this trip.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    {Array.from({ length: trip.days || 0 }, (_, i) => {
                      const dayNumber = i + 1;
                      let date: Date | null = null;
                      let dateString = "";
                      
                      if (trip.startDate) {
                        const [year, month, day] = trip.startDate.split('-').map(Number);
                        date = new Date(year, month - 1, day + i);
                        dateString = date.toLocaleDateString('en-US', { weekday: 'short' });
                      }
                      
                      const dayDetail = data.dayDetails.find(d => d.dayNumber === dayNumber);
                      const hasDestination = !!dayDetail?.destination;
                      
                      return (
                        <div
                          key={dayNumber}
                          className={`p-4 border rounded-lg text-center ${
                            hasDestination ? 'bg-primary/5 border-primary/30' : ''
                          }`}
                        >
                          {trip.startDate && date && (
                            <div className="text-xs text-muted-foreground mb-1">{dateString}</div>
                          )}
                          <div className="font-semibold text-lg mb-1">Day {dayNumber}</div>
                          {trip.startDate && date && (
                            <div className="text-xs text-muted-foreground mb-2">
                              {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </div>
                          )}
                          {dayDetail?.destination && (
                            <div className="text-xs font-medium text-primary mt-2 truncate" title={dayDetail.destination}>
                              {dayDetail.destination}
                            </div>
                          )}
                          {dayDetail?.notes && (
                            <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {dayDetail.notes}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>

              {/* Day Details */}
              {data.dayDetails.length > 0 && (
                <div className="space-y-4">
                  {data.dayDetails
                    .sort((a, b) => a.dayNumber - b.dayNumber)
                    .map((day) => {
                      const dayExpenses = data.expenses.filter(
                        (e) => e.dayNumber === day.dayNumber
                      );
                      const dayTotal = dayExpenses.reduce(
                        (sum, e) => sum + parseFloat(e.cost),
                        0
                      );
                      
                      return (
                        <Card key={day.id}>
                          <CardContent className="pt-6">
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <h4 className="font-semibold text-lg">
                                  Day {day.dayNumber}
                                  {day.destination && ` - ${day.destination}`}
                                </h4>
                                {trip.startDate && (
                                  <p className="text-sm text-muted-foreground">
                                    {formatDayDate(trip.startDate, day.dayNumber)}
                                  </p>
                                )}
                              </div>
                              {dayTotal > 0 && (
                                <Badge variant="secondary" className="text-base px-3 py-1">
                                  ${dayTotal.toFixed(0)}
                                </Badge>
                              )}
                            </div>
                            
                            {day.notes && (
                              <p className="text-sm text-muted-foreground mb-4 whitespace-pre-wrap">
                                {day.notes}
                              </p>
                            )}
                            
                            {dayExpenses.length > 0 && (
                              <div className="space-y-2 mt-4 pt-4 border-t">
                                <p className="text-sm font-medium text-muted-foreground mb-2">Expenses:</p>
                                {dayExpenses.map((expense) => {
                                  const category = CATEGORIES.find(c => c.id === expense.category);
                                  const IconComponent = category?.icon || DollarSign;
                                  return (
                                    <div key={expense.id} className="flex items-center justify-between py-2">
                                      <div className="flex items-center gap-2 flex-1">
                                        <IconComponent 
                                          className="h-4 w-4 flex-shrink-0" 
                                          style={{ color: category?.color || '#888' }} 
                                        />
                                        <span className="text-sm">{expense.description}</span>
                                      </div>
                                      <span className="text-sm font-medium ml-4">${parseFloat(expense.cost).toFixed(0)}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              )}
            </div>
          )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Clone CTA */}
        <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20">
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Inspired by this trip? Use it as a template for your own adventure.
            </p>
            <Button
              variant="default"
              size="lg"
              onClick={() => cloneTripMutation.mutate()}
              disabled={cloneTripMutation.isPending}
              data-testid="button-clone-trip"
              className="gap-2"
            >
              <Copy className="h-4 w-4" />
              {cloneTripMutation.isPending ? "Copying..." : "Use as Template"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
