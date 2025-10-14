import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FoodBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripDays: number;
  currentDailyBudget?: number;
  onSave: (dailyBudget: number) => void;
}

export default function FoodBudgetDialog({
  open,
  onOpenChange,
  tripDays,
  currentDailyBudget = 0,
  onSave,
}: FoodBudgetDialogProps) {
  const [dailyBudget, setDailyBudget] = useState(currentDailyBudget.toString());

  useEffect(() => {
    if (open) {
      setDailyBudget(currentDailyBudget > 0 ? currentDailyBudget.toString() : "");
    }
  }, [open, currentDailyBudget]);

  const totalBudget = parseFloat(dailyBudget || "0") * tripDays;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const daily = parseFloat(dailyBudget || "0");
    if (daily > 0) {
      onSave(daily);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set Food Budget</DialogTitle>
          <DialogDescription>
            Enter your daily food budget. Total will be calculated based on {tripDays} days.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="daily-budget">Daily Food Budget ($)</Label>
            <Input
              id="daily-budget"
              type="number"
              min="0"
              step="1"
              placeholder="25"
              value={dailyBudget}
              onChange={(e) => setDailyBudget(e.target.value)}
              data-testid="input-daily-food-budget"
              required
            />
          </div>

          <div className="bg-muted/30 rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">Total Food Cost</div>
            <div className="text-2xl font-bold" data-testid="text-preview-total-food">
              ${totalBudget.toFixed(0)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              ${dailyBudget || 0} × {tripDays} days
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel-food-budget"
            >
              Cancel
            </Button>
            <Button type="submit" data-testid="button-save-food-budget">
              Save Budget
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
