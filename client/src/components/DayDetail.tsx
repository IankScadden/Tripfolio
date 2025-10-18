import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Hotel, Ticket, Bus, Train, Plane, Utensils, ChevronLeft, ChevronRight, X } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import LocationAutocomplete from "@/components/LocationAutocomplete";

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
  const { toast } = useToast();
  const [destination, setDestination] = useState("");
  const [latitude, setLatitude] = useState<string>("");
  const [longitude, setLongitude] = useState<string>("");
  const [lodgingName, setLodgingName] = useState("");
  const [lodgingCost, setLodgingCost] = useState("");
  const [lodgingUrl, setLodgingUrl] = useState("");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [localTransportName, setLocalTransportName] = useState("");
  const [localTransportCost, setLocalTransportCost] = useState("");
  const [localTransportNotes, setLocalTransportNotes] = useState("");
  const [showLocalTransportForm, setShowLocalTransportForm] = useState(false);
  const [showIntercityTravel, setShowIntercityTravel] = useState(false);
  const [stayingInSameCity, setStayingInSameCity] = useState(false);
  const [intercityTransportType, setIntercityTransportType] = useState<string>("");
  const [intercityName, setIntercityName] = useState("");
  const [intercityCost, setIntercityCost] = useState("");
  const [intercityUrl, setIntercityUrl] = useState("");
  const [foodBudgetAdjustment, setFoodBudgetAdjustment] = useState("");
  
  // Multi-day lodging dialog state
  const [showMultiDayLodging, setShowMultiDayLodging] = useState(false);
  const [isEditingMultiDayLodging, setIsEditingMultiDayLodging] = useState(false);
  const [multiDayCheckIn, setMultiDayCheckIn] = useState("");
  const [multiDayCheckOut, setMultiDayCheckOut] = useState("");
  const [multiDayLodgingName, setMultiDayLodgingName] = useState("");
  const [multiDayTotalCost, setMultiDayTotalCost] = useState("");
  const [multiDayLodgingUrl, setMultiDayLodgingUrl] = useState("");

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

  // Fetch ALL trip expenses to detect multi-day lodging
  const { data: allTripExpenses = [] } = useQuery<any[]>({
    queryKey: ["/api/trips", tripId, "expenses"],
    enabled: open && !!tripId,
  });

  // Filter to get expenses for this specific day (memoized to prevent infinite loops)
  const dayExpenses = useMemo(
    () => allTripExpenses.filter((e: any) => e.dayNumber === dayNumber),
    [allTripExpenses, dayNumber]
  );

  // Detect if current lodging is part of a multi-day booking (memoized to prevent infinite loops)
  const multiDayLodgingInfo = useMemo(() => {
    const currentLodging = dayExpenses.find((e: any) => e.category === "accommodation");
    if (!currentLodging) return null;

    const lodgingName = currentLodging.description;
    const lodgingUrl = currentLodging.url;
    const nightlyCost = parseFloat(currentLodging.cost);

    // Find all lodging with the same name, sorted by day number
    const allLodging = allTripExpenses
      .filter((e: any) => e.category === "accommodation" && e.description === lodgingName)
      .sort((a: any, b: any) => (a.dayNumber || 0) - (b.dayNumber || 0));

    if (allLodging.length === 0) return null;

    // Find the CONSECUTIVE block that contains the current day
    // This handles cases where the same hotel is booked multiple times
    let consecutiveBlock: any[] = [];
    let currentBlock: any[] = [];
    
    for (let i = 0; i < allLodging.length; i++) {
      const expense = allLodging[i];
      
      // Start a new block if this is the first expense or if there's a gap
      if (currentBlock.length === 0 || expense.dayNumber === currentBlock[currentBlock.length - 1].dayNumber + 1) {
        currentBlock.push(expense);
      } else {
        // Gap found, save the current block if it contains the current day
        if (currentBlock.some(e => e.dayNumber === dayNumber)) {
          consecutiveBlock = currentBlock;
          break;
        }
        // Start a new block
        currentBlock = [expense];
      }
    }
    
    // Check if the last block contains the current day
    if (consecutiveBlock.length === 0 && currentBlock.some(e => e.dayNumber === dayNumber)) {
      consecutiveBlock = currentBlock;
    }

    // Must have at least 2 consecutive nights to show edit option
    if (consecutiveBlock.length < 2) return null;

    // Calculate check-in and check-out dates
    const checkInDate = consecutiveBlock[0].date;
    // Check-out is the day after the last night
    const lastNightDate = consecutiveBlock[consecutiveBlock.length - 1].date;
    const [year, month, day] = lastNightDate.split('-').map(Number);
    const checkOutDateObj = new Date(year, month - 1, day + 1);
    const checkOutDate = `${checkOutDateObj.getFullYear()}-${String(checkOutDateObj.getMonth() + 1).padStart(2, '0')}-${String(checkOutDateObj.getDate()).padStart(2, '0')}`;

    const totalCost = (nightlyCost * consecutiveBlock.length).toFixed(2);
    const dayNumbersInBlock = consecutiveBlock.map(e => e.dayNumber);

    return {
      checkInDate,
      checkOutDate,
      lodgingName,
      lodgingUrl,
      totalCost,
      nights: consecutiveBlock.length,
      dayNumbers: dayNumbersInBlock, // Include day numbers to delete when editing
    };
  }, [dayExpenses, allTripExpenses, dayNumber]);

  useEffect(() => {
    // Always set values, clearing them if no data exists for this day
    setDestination(dayDetailData?.destination || "");
    setLatitude(dayDetailData?.latitude || "");
    setLongitude(dayDetailData?.longitude || "");
    setLocalTransportNotes(dayDetailData?.localTransportNotes || "");
    setFoodBudgetAdjustment(dayDetailData?.foodBudgetAdjustment || "");
    setStayingInSameCity(dayDetailData?.stayingInSameCity === 1);
    setIntercityTransportType(dayDetailData?.intercityTransportType || "");
    setShowIntercityTravel(!!dayDetailData?.intercityTransportType && !dayDetailData?.stayingInSameCity);
  }, [dayDetailData, dayNumber]);

  useEffect(() => {
    // Load lodging
    const lodging = dayExpenses.find((e: any) => e.category === "accommodation");
    if (lodging) {
      setLodgingName(lodging.description || "");
      setLodgingCost(lodging.cost || "");
      setLodgingUrl(lodging.url || "");
    } else {
      // Clear lodging if no accommodation expense exists for this day
      setLodgingName("");
      setLodgingCost("");
      setLodgingUrl("");
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
      setShowLocalTransportForm(true);
    } else {
      // Clear local transport if none exists for this day
      setLocalTransportName("");
      setLocalTransportCost("");
      setShowLocalTransportForm(false);
    }

    // Load intercity transport
    const intercityExpense = dayExpenses.find((e: any) => e.category === "intercity");
    if (intercityExpense) {
      setIntercityName(intercityExpense.description || "");
      setIntercityCost(intercityExpense.cost || "");
      setIntercityUrl(intercityExpense.url || "");
    } else {
      // Clear intercity transport if none exists for this day
      setIntercityName("");
      setIntercityCost("");
      setIntercityUrl("");
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

  const bulkLodgingMutation = useMutation({
    mutationFn: async (data: { checkInDate: string; checkOutDate: string; lodgingName: string; totalCost: string; url?: string; startDayNumber: number; dayNumbersToDelete?: number[] }) => {
      const response = await apiRequest("POST", `/api/trips/${tripId}/lodging/bulk`, data);
      return await response.json();
    },
    onSuccess: async () => {
      // Force immediate refetch to ensure UI updates with latest data
      await queryClient.refetchQueries({ queryKey: ["/api/trips", tripId, "expenses"] });
      await queryClient.refetchQueries({ queryKey: ["/api/trips", tripId] });
    },
  });

  // Calculate nightly rate for multi-day lodging
  const calculateNightlyRate = () => {
    if (!multiDayCheckIn || !multiDayCheckOut || !multiDayTotalCost) return null;
    const [checkInYear, checkInMonth, checkInDay] = multiDayCheckIn.split('-').map(Number);
    const [checkOutYear, checkOutMonth, checkOutDay] = multiDayCheckOut.split('-').map(Number);
    const checkIn = new Date(checkInYear, checkInMonth - 1, checkInDay);
    const checkOut = new Date(checkOutYear, checkOutMonth - 1, checkOutDay);
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    if (nights <= 0) return null;
    return (parseFloat(multiDayTotalCost) / nights).toFixed(2);
  };

  const handleSaveMultiDayLodging = async () => {
    if (!multiDayCheckIn || !multiDayCheckOut || !multiDayLodgingName || !multiDayTotalCost) {
      return;
    }
    
    // When editing, pass the day numbers to delete from the original booking
    const dayNumbersToDelete = isEditingMultiDayLodging && multiDayLodgingInfo?.dayNumbers 
      ? multiDayLodgingInfo.dayNumbers 
      : undefined;
    
    await bulkLodgingMutation.mutateAsync({
      checkInDate: multiDayCheckIn,
      checkOutDate: multiDayCheckOut,
      lodgingName: multiDayLodgingName,
      totalCost: multiDayTotalCost,
      url: multiDayLodgingUrl || undefined,
      startDayNumber: dayNumber, // Pass current day number for trips without startDate
      dayNumbersToDelete, // Pass specific days to delete when editing
    });

    // Reset form and close dialog
    setIsEditingMultiDayLodging(false);
    setMultiDayCheckIn("");
    setMultiDayCheckOut("");
    setMultiDayLodgingName("");
    setMultiDayTotalCost("");
    setMultiDayLodgingUrl("");
    setShowMultiDayLodging(false);
  };

  const handleSave = async () => {
    // Save day detail
    await saveDayDetailMutation.mutateAsync({
      tripId,
      dayNumber,
      destination,
      latitude: latitude || null,
      longitude: longitude || null,
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
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto [&>button]:hidden" data-testid="dialog-day-detail">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">Day {dayNumber}</DialogTitle>
              {date && <p className="text-sm text-muted-foreground mt-1">{formatDate(date)}</p>}
            </div>
            <Button
              onClick={handleSave}
              disabled={saveDayDetailMutation.isPending || createExpenseMutation.isPending || updateExpenseMutation.isPending}
              data-testid="button-save-day"
            >
              {saveDayDetailMutation.isPending || createExpenseMutation.isPending || updateExpenseMutation.isPending ? "Saving..." : "Done"}
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Destination */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Destination</h3>
            </div>
            <LocationAutocomplete
              value={destination}
              onChange={(location, lat, lon) => {
                setDestination(location);
                // Clear coordinates if null, or set them if provided
                setLatitude(lat || "");
                setLongitude(lon || "");
              }}
              placeholder="City or location"
              testId="input-destination"
            />
          </div>

          {/* Lodging */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hotel className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold">Lodging</h3>
              </div>
              {!lodgingName && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsEditingMultiDayLodging(false);
                    // Default check-in to current day's date
                    if (date) {
                      setMultiDayCheckIn(date);
                      // Default check-out to 2 days later (for 2 nights)
                      const [year, month, day] = date.split('-').map(Number);
                      const checkOutDate = new Date(year, month - 1, day + 2);
                      const checkOutStr = `${checkOutDate.getFullYear()}-${String(checkOutDate.getMonth() + 1).padStart(2, '0')}-${String(checkOutDate.getDate()).padStart(2, '0')}`;
                      setMultiDayCheckOut(checkOutStr);
                    }
                    setShowMultiDayLodging(true);
                  }}
                  data-testid="button-add-lodging"
                >
                  + Add Lodging
                </Button>
              )}
            </div>
            {lodgingName ? (
              <div className="pl-7 space-y-2 p-3 border rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium">{lodgingName}</p>
                    <p className="text-sm text-muted-foreground">${lodgingCost} per night</p>
                    {multiDayLodgingInfo && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Multi-day booking: {multiDayLodgingInfo.nights} nights (${multiDayLodgingInfo.totalCost} total)
                      </p>
                    )}
                    {lodgingUrl && (
                      <a 
                        href={lodgingUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-sm text-primary hover:underline"
                        data-testid="link-lodging-url"
                      >
                        View booking
                      </a>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {multiDayLodgingInfo && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => {
                          // Pre-populate the edit form
                          setIsEditingMultiDayLodging(true);
                          setMultiDayCheckIn(multiDayLodgingInfo.checkInDate);
                          setMultiDayCheckOut(multiDayLodgingInfo.checkOutDate);
                          setMultiDayLodgingName(multiDayLodgingInfo.lodgingName);
                          setMultiDayTotalCost(multiDayLodgingInfo.totalCost);
                          setMultiDayLodgingUrl(multiDayLodgingInfo.lodgingUrl || "");
                          setShowMultiDayLodging(true);
                        }}
                        data-testid="button-edit-multiday-lodging"
                      >
                        Edit
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => {
                        setLodgingName("");
                        setLodgingCost("");
                        setLodgingUrl("");
                      }}
                      data-testid="button-remove-lodging"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="pl-7 text-sm text-muted-foreground">No lodging added for this day</p>
            )}
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bus className="h-5 w-5 text-purple-500" />
                <h3 className="font-semibold">Local Transportation</h3>
              </div>
              {!showLocalTransportForm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLocalTransportForm(true)}
                  data-testid="button-add-local-transport"
                >
                  + Add Transportation
                </Button>
              )}
            </div>
            {showLocalTransportForm ? (
              <div className="pl-7 space-y-2 p-3 border rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
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
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 ml-2"
                    onClick={() => {
                      setLocalTransportName("");
                      setLocalTransportCost("");
                      setLocalTransportNotes("");
                      setShowLocalTransportForm(false);
                    }}
                    data-testid="button-remove-local-transport"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <p className="pl-7 text-sm text-muted-foreground">No local transportation added for this day</p>
            )}
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
      </DialogContent>
    </Dialog>

    {/* Multi-Day Lodging Dialog */}
    <Dialog open={showMultiDayLodging} onOpenChange={(open) => {
      setShowMultiDayLodging(open);
      if (!open) {
        // Reset form when closing
        setIsEditingMultiDayLodging(false);
        setMultiDayCheckIn("");
        setMultiDayCheckOut("");
        setMultiDayLodgingName("");
        setMultiDayTotalCost("");
        setMultiDayLodgingUrl("");
      }
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditingMultiDayLodging ? "Edit" : "Add"} Multi-Day Lodging</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {isEditingMultiDayLodging ? "Update your multi-day lodging booking" : "Book lodging for multiple days at once"}
          </p>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Lodging Name</Label>
            <Input
              placeholder="Hotel/Hostel name"
              value={multiDayLodgingName}
              onChange={(e) => setMultiDayLodgingName(e.target.value)}
              data-testid="input-multiday-lodging-name"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Check-In Date</Label>
              <Input
                type="date"
                value={multiDayCheckIn}
                onChange={(e) => setMultiDayCheckIn(e.target.value)}
                data-testid="input-multiday-checkin"
              />
            </div>
            <div>
              <Label>Check-Out Date</Label>
              <Input
                type="date"
                value={multiDayCheckOut}
                onChange={(e) => setMultiDayCheckOut(e.target.value)}
                data-testid="input-multiday-checkout"
              />
            </div>
          </div>
          <div>
            <Label>Total Cost ($)</Label>
            <Input
              type="number"
              placeholder="0"
              value={multiDayTotalCost}
              onChange={(e) => setMultiDayTotalCost(e.target.value)}
              data-testid="input-multiday-total-cost"
            />
          </div>
          {calculateNightlyRate() && (
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-sm text-muted-foreground">Nightly Rate</p>
              <p className="text-xl font-bold">${calculateNightlyRate()}</p>
            </div>
          )}
          <div>
            <Label>Booking Link (Optional)</Label>
            <Input
              type="url"
              placeholder="https://..."
              value={multiDayLodgingUrl}
              onChange={(e) => setMultiDayLodgingUrl(e.target.value)}
              data-testid="input-multiday-lodging-url"
            />
          </div>
        </div>
        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => setShowMultiDayLodging(false)}
            className="flex-1"
            data-testid="button-cancel-multiday-lodging"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveMultiDayLodging}
            className="flex-1"
            disabled={bulkLodgingMutation.isPending || !multiDayCheckIn || !multiDayCheckOut || !multiDayLodgingName || !multiDayTotalCost}
            data-testid="button-save-multiday-lodging"
          >
            {bulkLodgingMutation.isPending ? "Saving..." : (isEditingMultiDayLodging ? "Update Lodging" : "Save Lodging")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
