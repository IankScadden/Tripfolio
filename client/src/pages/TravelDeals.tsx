import { useState } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tag, Search, ExternalLink, Plane, Hotel, Car, Ticket, Globe, ArrowRight } from "lucide-react";
import Header from "@/components/Header";

type DealCategory = "all" | "flights" | "hotels" | "transportation" | "activities";

type Deal = {
  id: string;
  title: string;
  description: string;
  provider: string;
  providerUrl: string;
  category: DealCategory;
  discount?: string;
  imageUrl: string;
};

const deals: Deal[] = [
  {
    id: "1",
    title: "Skyscanner - Compare Flight Prices",
    description: "Search and compare millions of flights to find the cheapest deals. Set price alerts and track your favorite routes.",
    provider: "Skyscanner",
    providerUrl: "https://www.skyscanner.com",
    category: "flights",
    imageUrl: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&h=400&fit=crop",
  },
  {
    id: "2",
    title: "Google Flights - Flexible Search",
    description: "Explore destinations with flexible dates. Find the cheapest days to fly and discover hidden deals.",
    provider: "Google Flights",
    providerUrl: "https://www.google.com/flights",
    category: "flights",
    imageUrl: "https://images.unsplash.com/photo-1529074963764-98f45c47344b?w=600&h=400&fit=crop",
  },
  {
    id: "3",
    title: "Hostelworld - Budget Accommodation",
    description: "Find hostels, budget hotels, and unique stays worldwide. Perfect for backpackers and budget travelers.",
    provider: "Hostelworld",
    providerUrl: "https://www.hostelworld.com",
    category: "hotels",
    imageUrl: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=600&h=400&fit=crop",
  },
  {
    id: "4",
    title: "Booking.com - Hotels & More",
    description: "Over 28 million accommodation listings. Free cancellation on most rooms and best price guarantee.",
    provider: "Booking.com",
    providerUrl: "https://www.booking.com",
    category: "hotels",
    imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop",
  },
  {
    id: "5",
    title: "Rome2Rio - Multi-Modal Transport",
    description: "Discover how to get anywhere by plane, train, bus, ferry, or car. Compare all your transport options.",
    provider: "Rome2Rio",
    providerUrl: "https://www.rome2rio.com",
    category: "transportation",
    imageUrl: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&h=400&fit=crop",
  },
  {
    id: "6",
    title: "FlixBus - Europe Bus Network",
    description: "Travel Europe by bus at low prices. Extensive network connecting major cities with free WiFi onboard.",
    provider: "FlixBus",
    providerUrl: "https://www.flixbus.com",
    category: "transportation",
    imageUrl: "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=600&h=400&fit=crop",
  },
  {
    id: "7",
    title: "GetYourGuide - Tours & Activities",
    description: "Book tours, attractions, and experiences worldwide. Skip-the-line tickets and local experiences.",
    provider: "GetYourGuide",
    providerUrl: "https://www.getyourguide.com",
    category: "activities",
    imageUrl: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=600&h=400&fit=crop",
  },
  {
    id: "8",
    title: "Viator - Things to Do",
    description: "Find and book sightseeing tours, day trips, and activities. Verified reviews from real travelers.",
    provider: "Viator",
    providerUrl: "https://www.viator.com",
    category: "activities",
    imageUrl: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=600&h=400&fit=crop",
  },
];

const categories: { value: DealCategory; label: string; icon: any }[] = [
  { value: "all", label: "All Deals", icon: Globe },
  { value: "flights", label: "Flights", icon: Plane },
  { value: "hotels", label: "Hotels", icon: Hotel },
  { value: "transportation", label: "Transport", icon: Car },
  { value: "activities", label: "Activities", icon: Ticket },
];

export default function TravelDeals() {
  const [, setLocation] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<DealCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredDeals = deals.filter((deal) => {
    const matchesCategory = selectedCategory === "all" || deal.category === selectedCategory;
    const matchesSearch = 
      deal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.provider.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <div 
        className="relative h-[300px] flex items-center justify-center"
        style={{
          backgroundImage: `url(https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1600&h=400&fit=crop)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
        
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Tag className="w-10 h-10 text-white" />
            <h1 className="text-4xl md:text-5xl font-bold text-white">Travel Deals</h1>
          </div>
          <p className="text-xl text-gray-200 max-w-2xl mx-auto">
            Curated resources to help you find the best prices on flights, hotels, and experiences
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search deals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-deals"
            />
          </div>
          
          <div className="flex gap-2 flex-wrap">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <Button
                  key={category.value}
                  variant={selectedCategory === category.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.value)}
                  className="gap-2"
                  data-testid={`button-category-${category.value}`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{category.label}</span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Deals Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredDeals.map((deal) => (
            <Card 
              key={deal.id}
              className="overflow-hidden hover-elevate transition-all group"
              data-testid={`card-deal-${deal.id}`}
            >
              <div className="relative h-40 overflow-hidden">
                <img 
                  src={deal.imageUrl} 
                  alt={deal.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute top-3 left-3">
                  <Badge variant="secondary" className="bg-white/90 text-foreground">
                    {categories.find(c => c.value === deal.category)?.label}
                  </Badge>
                </div>
              </div>
              
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-2 line-clamp-1">{deal.title}</h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {deal.description}
                </p>
                
                <a 
                  href={deal.providerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                  data-testid={`link-deal-${deal.id}`}
                >
                  Visit {deal.provider}
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </Card>
          ))}
        </div>

        {filteredDeals.length === 0 && (
          <div className="text-center py-16">
            <Tag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No deals found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search or filter to find what you're looking for
            </p>
          </div>
        )}

        {/* Tip Section */}
        <div className="mt-12 bg-muted/50 rounded-lg p-6 sm:p-8">
          <h2 className="text-2xl font-bold mb-4">Pro Tips for Finding Deals</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Be Flexible with Dates</h3>
              <p className="text-sm text-muted-foreground">
                Flying mid-week (Tuesday/Wednesday) is often cheaper. Use flexible date searches to find the best prices.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Book in Advance</h3>
              <p className="text-sm text-muted-foreground">
                For international flights, booking 2-3 months ahead typically offers the best rates. Last-minute deals are rare.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Use Price Alerts</h3>
              <p className="text-sm text-muted-foreground">
                Set up alerts on Skyscanner or Google Flights to get notified when prices drop for your route.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to Start Planning?</h2>
          <p className="text-muted-foreground mb-6">
            Found some great deals? Create a trip budget to track all your expenses.
          </p>
          <Button 
            size="lg" 
            onClick={() => setLocation("/")}
            className="gap-2"
            data-testid="button-start-planning"
          >
            Create a Trip
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
