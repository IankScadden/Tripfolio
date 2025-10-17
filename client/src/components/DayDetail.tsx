import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Hotel, Ticket, Bus, Train, Plane, Utensils, ChevronLeft, ChevronRight, X } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Activity {
  id?: string;
  name: string;
  cost: string;
  url?: string;
}

interface DayDetailProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  dayNumber: number;
  date?: string;
  totalDays: number;
  dailyFoodBudget: number;
  onSave: (data: any) => void;
  onPrevious?: () => void;
  onNext?: () => void;
  initialData?: any;
}

export default function DayDetail({
  open,
  onOpenChange,
  tripId,
  dayNumber,
  date,
  totalDays,
  dailyFoodBudget,
  onSave,
  onPrevious,
  onNext,
  initialData,
}: DayDetailProps) {
  const [destination, setDestination] = useState("");
  const [lodgingName, setLodgingName] = useState("");
  const [lodgingCost, setLodgingCost] = useState("");
  const [lodgingUrl, setLodgingUrl] = useState("");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [localTransportName, setLocalTransportName] = useState("");
  const [localTransportCost, setLocalTransportCost] = useState("");
  const [localTransportNotes, setLocalTransportNotes] = useState("");
  const [showIntercityTravel, setShowIntercityTravel] = useState(false);
  const [stayingInSameCity, setStayingInSameCity] = useState(false);
  const [intercityTransportType, setIntercityTransportType] = useState<string>("");
  const [intercityName, setIntercityName] = useState("");
  const [intercityCost, setIntercityCost] = useState("");
  const [intercityUrl, setIntercityUrl] = useState("");
  const [foodBudgetAdjustment, setFoodBudgetAdjustment] = useState("");

  // Fetch day detail data
  const { data: dayDetailData } = useQuery({
    queryKey: ["/api/trips", tripId, "day-details", dayNumber],
    queryFn: async () => {
      const response = await fetch(`/api/trips/${tripId}/day-details/${dayNumber}`);
      if (!response.ok) throw new Error("Failed to fetch day detail");
      return response.json();
    },
    enabled: open && !!tripId && !!dayNumber,
  });

  // Fetch expenses for this day
  const { data: dayExpenses = [] } = useQuery({
    queryKey: ["/api/trips", tripId, "expenses", "day", dayNumber],
    queryFn: async () => {
      const response = await fetch(`/api/trips/${tripId}/expenses`);
      if (!response.ok) throw new Error("Failed to fetch expenses");
      const allExpenses = await response.json();
      return allExpenses.filter((e: any) => e.dayNumber === dayNumber);
    },
    enabled: open && !!tripId && !!dayNumber,
  });

  useEffect(() => {
    if (dayDetailData) {
      setDestination(dayDetailData.destination || "");
      setLocalTransportNotes(dayDetailData.localTransportNotes || "");
      setFoodBudgetAdjustment(dayDetailData.foodBudgetAdjustment || "");
      setStayingInSameCity(dayDetailData.stayingInSameCity === 1);
      setIntercityTransportType(dayDetailData.intercityTransportType || "");
      setShowIntercityTravel(!!dayDetailData.intercityTransportType && !dayDetailData.stayingInSameCity);
    }
  }, [dayDetailData]);

  useEffect(() => {
    if (dayExpenses && dayExpenses.length > 0) {
      // Load lodging
      const lodging = dayExpenses.find((e: any) => e.category === "accommodation");
      if (lodging) {
        setLodgingName(lodging.description || "");
        setLodgingCost(lodging.cost || "");
        setLodgingUrl(lodging.url || "");
      }

      // Load activities
      const activityExpenses = dayExpenses.filter((e: any) => e.category === "activities");
      setActivities(activityExpenses.map((e: any) => ({
        id: e.id,
        name: e.description,
        cost: e.cost,
        url: e.url || "",
      })));

      // Load local transport
      const localTransport = dayExpenses.find((e: any) => e.category === "local");
      if (localTransport) {
        setLocalTransportName(localTransport.description || "");
        setLocalTransportCost(localTransport.cost || "");
      }

      // Load intercity transport
      const intercityExpense = dayExpenses.find((e: any) => e.category === "intercity");
      if (intercityExpense) {
        setIntercityName(intercityExpense.description || "");
        setIntercityCost(intercityExpense.cost || "");
        setIntercityUrl(intercityExpense.url || "");
      }
    }
  }, [dayExpenses]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    // Parse date in local timezone to avoid timezone offset issues
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  const addActivity = () => {
    setActivities([...activities, { name: "", cost: "", url: "" }]);
  };

  const updateActivity = (index: number, field: keyof Activity, value: string) => {
    const updated = [...activities];
    updated[index] = { ...updated[index], [field]: value };
    setActivities(updated);
  };

  const removeActivity = (index: number) => {
    setActivities(activities.filter((_, i) => i !== index));
  };

  const handleStayingInSameCity = () => {
    setStayingInSameCity(true);
    setShowIntercityTravel(false);
    setIntercityTransportType("");
    setIntercityName("");
    setIntercityCost("");
    setIntercityUrl("");
  };

  const saveDayDetailMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", `/api/trips/${tripId}/day-details`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId, "day-details", dayNumber] });
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId, "expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId] });
    },
  });

  const createExpenseMutation = useMutation({
    mutationFn: async (expenseData: any) => {
      const response = await apiRequest("POST", "/api/expenses", expenseData);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId, "expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId] });
    },
  });

  const updateExpenseMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const response = await apiRequest("PATCH", `/api/expenses/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId, "expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId] });
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/expenses/${id}`, {});
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId, "expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId] });
    },
  });

  const handleSave = async () => {
    // Save day detail
    await saveDayDetailMutation.mutateAsync({
      tripId,
      dayNumber,
      destination,
      localTransportNotes,
      foodBudgetAdjustment: foodBudgetAdjustment || "0",
      stayingInSameCity: stayingInSameCity ? 1 : 0,
      intercityTransportType: stayingInSameCity ? null : intercityTransportType,
    });

    // Save/update lodging expense
    const existingLodging = dayExpenses?.find((e: any) => e.category === "accommodation");
    if (lodgingName && lodgingCost) {
      if (existingLodging) {
        await updateExpenseMutation.mutateAsync({
          id: existingLodging.id,
          description: lodgingName,
          cost: lodgingCost,
          url: lodgingUrl || undefined,
          dayNumber,
        });
      } else {
        await createExpenseMutation.mutateAsync({
          tripId,
          category: "accommodation",
          description: lodgingName,
          cost: lodgingCost,
          url: lodgingUrl || undefined,
          dayNumber,
        });
      }
    } else if (existingLodging) {
      await deleteExpenseMutation.mutateAsync(existingLodging.id);
    }

    // Save/update activities
    const existingActivities = dayExpenses?.filter((e: any) => e.category === "activities") || [];
    for (const activity of activities) {
      if (activity.name && activity.cost) {
        if (activity.id) {
          await updateExpenseMutation.mutateAsync({
            id: activity.id,
            description: activity.name,
            cost: activity.cost,
            url: activity.url || undefined,
            dayNumber,
          });
        } else {
          await createExpenseMutation.mutateAsync({
            tripId,
            category: "activities",
            description: activity.name,
            cost: activity.cost,
            url: activity.url || undefined,
            dayNumber,
          });
        }
      }
    }
    // Delete removed activities
    for (const existing of existingActivities) {
      if (!activities.find(a => a.id === existing.id)) {
        await deleteExpenseMutation.mutateAsync(existing.id);
      }
    }

    // Save/update local transportation
    const existingLocalTransport = dayExpenses?.find((e: any) => e.category === "local");
    if (localTransportName && localTransportCost) {
      if (existingLocalTransport) {
        await updateExpenseMutation.mutateAsync({
          id: existingLocalTransport.id,
          description: localTransportName,
          cost: localTransportCost,
          dayNumber,
        });
      } else {
        await createExpenseMutation.mutateAsync({
          tripId,
          category: "local",
          description: localTransportName,
          cost: localTransportCost,
          dayNumber,
        });
      }
    } else if (existingLocalTransport) {
      await deleteExpenseMutation.mutateAsync(existingLocalTransport.id);
    }

    // Save/update intercity transport
    const existingIntercity = dayExpenses?.find((e: any) => e.category === "intercity");
    if (intercityName && intercityCost && !stayingInSameCity) {
      if (existingIntercity) {
        await updateExpenseMutation.mutateAsync({
          id: existingIntercity.id,
          description: intercityName,
          cost: intercityCost,
          url: intercityUrl || undefined,
          dayNumber,
        });
      } else {
        await createExpenseMutation.mutateAsync({
          tripId,
          category: "intercity",
          description: intercityName,
          cost: intercityCost,
          url: intercityUrl || undefined,
          dayNumber,
        });
      }
    } else if (existingIntercity) {
      await deleteExpenseMutation.mutateAsync(existingIntercity.id);
    }

    await onSave({ success: true });
  };

  const totalFoodBudget = dailyFoodBudget + (parseFloat(foodBudgetAdjustment) || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="dialog-day-detail">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">Day {dayNumber}</DialogTitle>
              {date && <p className="text-sm text-muted-foreground mt-1">{formatDate(date)}</p>}
            </div>
            <div className="flex gap-2">
              {onPrevious && dayNumber > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onPrevious}
                  data-testid="button-previous-day"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
              )}
              {onNext && dayNumber < totalDays && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onNext}
                  data-testid="button-next-day"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Destination */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Destination</h3>
            </div>
            <Input
              placeholder="City or location"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              data-testid="input-destination"
            />
          </div>

          {/* Lodging */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Hotel className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold">Lodging</h3>
            </div>
            <div className="space-y-3 pl-7">
              <div>
                <Label>Name</Label>
                <Input
                  placeholder="Hotel/Hostel name"
                  value={lodgingName}
                  onChange={(e) => setLodgingName(e.target.value)}
                  data-testid="input-lodging-name"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Cost ($)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={lodgingCost}
                    onChange={(e) => setLodgingCost(e.target.value)}
                    data-testid="input-lodging-cost"
                  />
                </div>
                <div>
                  <Label>Booking Link (Optional)</Label>
                  <Input
                    type="url"
                    placeholder="https://..."
                    value={lodgingUrl}
                    onChange={(e) => setLodgingUrl(e.target.value)}
                    data-testid="input-lodging-url"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Activities */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ticket className="h-5 w-5 text-purple-600" />
                <h3 className="font-semibold">Activities</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={addActivity}
                data-testid="button-add-activity"
              >
                + Add Activity
              </Button>
            </div>
            <div className="space-y-3 pl-7">
              {activities.map((activity, index) => (
                <div key={index} className="space-y-2 p-3 border rounded-lg relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 h-6 w-6 p-0"
                    onClick={() => removeActivity(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Input
                    placeholder="Activity name"
                    value={activity.name}
                    onChange={(e) => updateActivity(index, "name", e.target.value)}
                    data-testid={`input-activity-name-${index}`}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      placeholder="Cost ($)"
                      value={activity.cost}
                      onChange={(e) => updateActivity(index, "cost", e.target.value)}
                      data-testid={`input-activity-cost-${index}`}
                    />
                    <Input
                      type="url"
                      placeholder="Link (optional)"
                      value={activity.url || ""}
                      onChange={(e) => updateActivity(index, "url", e.target.value)}
                      data-testid={`input-activity-url-${index}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Local Transportation */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Bus className="h-5 w-5 text-purple-500" />
              <h3 className="font-semibold">Local Transportation</h3>
            </div>
            <div className="pl-7 space-y-3">
              <Input
                placeholder="Name (e.g., Metro Pass, Taxi, etc.)"
                value={localTransportName}
                onChange={(e) => setLocalTransportName(e.target.value)}
                data-testid="input-local-transport-name"
              />
              <Input
                type="number"
                placeholder="Cost ($)"
                value={localTransportCost}
                onChange={(e) => setLocalTransportCost(e.target.value)}
                data-testid="input-local-transport-cost"
              />
              <Textarea
                placeholder="Add notes about local transportation (metro, bus, etc.)"
                value={localTransportNotes}
                onChange={(e) => setLocalTransportNotes(e.target.value)}
                data-testid="input-local-transport-notes"
              />
            </div>
          </div>

          {/* Travel to Next City */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Train className="h-5 w-5 text-orange-500" />
                <h3 className="font-semibold">Travel to Next City</h3>
              </div>
              {!showIntercityTravel && !stayingInSameCity && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowIntercityTravel(true)}
                  data-testid="button-add-intercity"
                >
                  + Add Travel
                </Button>
              )}
            </div>
            {showIntercityTravel && (
              <div className="space-y-3 pl-7">
                <div>
                  <Label>Transport Type</Label>
                  <Select value={intercityTransportType} onValueChange={setIntercityTransportType}>
                    <SelectTrigger data-testid="select-intercity-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flight">
                        <div className="flex items-center gap-2">
                          <Plane className="h-4 w-4" />
                          Flight
                        </div>
                      </SelectItem>
                      <SelectItem value="train">
                        <div className="flex items-center gap-2">
                          <Train className="h-4 w-4" />
                          Train
                        </div>
                      </SelectItem>
                      <SelectItem value="bus">
                        <div className="flex items-center gap-2">
                          <Bus className="h-4 w-4" />
                          Bus
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  placeholder="Route description"
                  value={intercityName}
                  onChange={(e) => setIntercityName(e.target.value)}
                  data-testid="input-intercity-name"
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    type="number"
                    placeholder="Cost ($)"
                    value={intercityCost}
                    onChange={(e) => setIntercityCost(e.target.value)}
                    data-testid="input-intercity-cost"
                  />
                  <Input
                    type="url"
                    placeholder="Booking link (optional)"
                    value={intercityUrl}
                    onChange={(e) => setIntercityUrl(e.target.value)}
                    data-testid="input-intercity-url"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStayingInSameCity}
                  data-testid="button-staying-same-city"
                >
                  Staying in Same City
                </Button>
              </div>
            )}
            {stayingInSameCity && (
              <div className="pl-7 flex items-center gap-3">
                <p className="text-sm text-muted-foreground">No intercity travel for this day</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStayingInSameCity(false);
                    setShowIntercityTravel(true);
                  }}
                  data-testid="button-add-travel-back"
                >
                  + Add Travel
                </Button>
              </div>
            )}
          </div>

          {/* Food */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Utensils className="h-5 w-5 text-pink-500" />
              <h3 className="font-semibold">Food</h3>
            </div>
            <div className="pl-7 space-y-3">
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-sm text-muted-foreground">Daily Food Budget</p>
                <p className="text-2xl font-bold">${totalFoodBudget.toFixed(0)}</p>
              </div>
              <div>
                <Label>Add Extra Budget for This Day ($)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={foodBudgetAdjustment}
                  onChange={(e) => setFoodBudgetAdjustment(e.target.value)}
                  data-testid="input-food-adjustment"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
            data-testid="button-back-to-calendar"
          >
            Back to Calendar
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1"
            disabled={saveDayDetailMutation.isPending || createExpenseMutation.isPending || updateExpenseMutation.isPending}
            data-testid="button-save-day"
          >
            {saveDayDetailMutation.isPending || createExpenseMutation.isPending || updateExpenseMutation.isPending ? "Saving..." : "Done"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
