import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AddExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryTitle: string;
  category?: string;
  onAdd: (expense: {
    description: string;
    cost: string;
    url?: string;
    date?: string;
  }) => void;
  onAddMultiNightLodging?: (data: {
    lodgingName: string;
    totalCost: string;
    url?: string;
    checkInDate: string;
    checkOutDate: string;
  }) => void;
  initialData?: {
    description: string;
    cost: string;
    url?: string;
    date?: string;
  };
  mode?: "add" | "edit";
}

export default function AddExpenseDialog({
  open,
  onOpenChange,
  categoryTitle,
  category,
  onAdd,
  onAddMultiNightLodging,
  initialData,
  mode = "add",
}: AddExpenseDialogProps) {
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState("");
  const [url, setUrl] = useState("");
  const [date, setDate] = useState("");
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");

  const isAccommodation = category === "accommodation";
  const isMultiNight = isAccommodation && checkInDate && checkOutDate && mode === "add";

  const nightsCount = useMemo(() => {
    if (!checkInDate || !checkOutDate) return 0;
    const [checkInYear, checkInMonth, checkInDay] = checkInDate.split('-').map(Number);
    const [checkOutYear, checkOutMonth, checkOutDay] = checkOutDate.split('-').map(Number);
    const checkIn = new Date(checkInYear, checkInMonth - 1, checkInDay);
    const checkOut = new Date(checkOutYear, checkOutMonth - 1, checkOutDay);
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    return nights > 0 ? nights : 0;
  }, [checkInDate, checkOutDate]);

  const nightlyRate = useMemo(() => {
    if (!cost || nightsCount <= 0) return null;
    return (parseFloat(cost) / nightsCount).toFixed(2);
  }, [cost, nightsCount]);

  useEffect(() => {
    if (initialData && mode === "edit") {
      setDescription(initialData.description || "");
      setCost(initialData.cost || "");
      setUrl(initialData.url || "");
      setDate(initialData.date || "");
      setCheckInDate("");
      setCheckOutDate("");
    } else if (!open) {
      setDescription("");
      setCost("");
      setUrl("");
      setDate("");
      setCheckInDate("");
      setCheckOutDate("");
    }
  }, [initialData, mode, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isAccommodation && mode === "add" && checkInDate && checkOutDate && nightsCount > 0) {
      if (description && cost && onAddMultiNightLodging) {
        onAddMultiNightLodging({
          lodgingName: description,
          totalCost: cost,
          url: url || undefined,
          checkInDate,
          checkOutDate,
        });
        setDescription("");
        setCost("");
        setUrl("");
        setCheckInDate("");
        setCheckOutDate("");
        onOpenChange(false);
      }
    } else if (description && cost) {
      onAdd({
        description,
        cost: cost,
        url: url || undefined,
        date: date || undefined,
      });
      if (mode === "add") {
        setDescription("");
        setCost("");
        setUrl("");
        setDate("");
      }
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-add-expense">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Edit" : "Add"} {categoryTitle} Expense</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">
              {isAccommodation ? "Accommodation Name" : "Description"}
            </Label>
            <Input
              id="description"
              placeholder={isAccommodation ? "e.g., Hotel Paris, Airbnb Berlin" : "Enter description"}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              data-testid="input-expense-description"
            />
          </div>

          {isAccommodation && mode === "add" ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="checkInDate">Check-In Date</Label>
                  <Input
                    id="checkInDate"
                    type="date"
                    value={checkInDate}
                    onChange={(e) => setCheckInDate(e.target.value)}
                    data-testid="input-expense-checkin"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="checkOutDate">Check-Out Date</Label>
                  <Input
                    id="checkOutDate"
                    type="date"
                    value={checkOutDate}
                    onChange={(e) => setCheckOutDate(e.target.value)}
                    min={checkInDate}
                    data-testid="input-expense-checkout"
                  />
                </div>
              </div>

              {nightsCount > 0 && (
                <p className="text-sm text-muted-foreground">
                  {nightsCount} night{nightsCount !== 1 ? 's' : ''}
                  {nightlyRate && ` (${nightlyRate}/night)`}
                </p>
              )}

              <div className="space-y-2">
                <Label htmlFor="cost">Total Cost ($)</Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  placeholder="Total for all nights"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  required
                  data-testid="input-expense-cost"
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="cost">Cost ($)</Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  required
                  data-testid="input-expense-cost"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date (optional)</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  data-testid="input-expense-date"
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="url">Booking Link (optional)</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              data-testid="input-expense-url"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              data-testid="button-cancel-expense"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1" 
              data-testid="button-save-expense"
              disabled={isAccommodation && mode === "add" && !!checkInDate && !!checkOutDate && nightsCount <= 0}
            >
              {mode === "edit" ? "Save Changes" : isMultiNight && nightsCount > 0 ? `Add ${nightsCount} Night${nightsCount !== 1 ? 's' : ''}` : "Add Expense"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
