import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, Calendar, MapPin, Copy, ChevronDown, Heart, MessageCircle, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";
import Header from "@/components/Header";
import { JourneyMap } from "@/components/JourneyMap";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plane, Train, Bus, Utensils, Hotel, Ticket, DollarSign } from "lucide-react";

const CATEGORIES = [
  { id: "flights", title: "Flights", icon: Plane, color: "hsl(200, 85%, 55%)" },
  { id: "intercity", title: "City to City Transportation", icon: Train, color: "hsl(30, 90%, 60%)" },
  { id: "local", title: "Local Transportation", icon: Bus, color: "hsl(280, 70%, 65%)" },
  { id: "accommodation", title: "Lodging", icon: Hotel, color: "hsl(150, 60%, 50%)" },
  { id: "food", title: "Food", icon: Utensils, color: "hsl(330, 70%, 65%)" },
  { id: "activities", title: "Activities & Attractions", icon: Ticket, color: "hsl(50, 85%, 60%)" },
  { id: "other", title: "Other Costs", icon: DollarSign, color: "hsl(180, 60%, 55%)" },
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

        {/* Budget Breakdown Button */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <button
              onClick={() => setShowBudget(!showBudget)}
              className="w-full flex items-center justify-between p-4 bg-muted/50 rounded-lg hover-elevate transition-all"
              data-testid="button-toggle-budget"
            >
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
              <ChevronDown className={`h-5 w-5 transition-transform ${showBudget ? 'rotate-180' : ''}`} />
            </button>

            {/* Collapsible Budget Section */}
            {showBudget && (
              <div className="mt-6 space-y-6">
                {/* Budget Breakdown and Visual Breakdown */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Budget Breakdown */}
                  <div>
                    <h3 className="font-semibold mb-4">By Category</h3>
                    <div className="space-y-3">
                      {CATEGORIES.map((category) => {
                        const IconComponent = category.icon;
                        const total = getCategoryTotal(category.id);
                        if (total === 0) return null;
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
                  </div>

                  {/* Visual Breakdown */}
                  <div>
                    <h3 className="font-semibold mb-4">Visual Breakdown</h3>
                    {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ percent }) => 
                              percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''
                            }
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            style={{ fontSize: '12px', fontWeight: 'bold' }}
                          >
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Legend 
                            wrapperStyle={{ fontSize: '11px' }}
                            iconSize={8}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                        No expenses added yet
                      </div>
                    )}
                  </div>
                </div>

                {/* Journey Map */}
                {locations.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-4">Journey Map</h3>
                    <div className="rounded-lg overflow-hidden" style={{ height: '400px' }}>
                      <JourneyMap locations={locations} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

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
