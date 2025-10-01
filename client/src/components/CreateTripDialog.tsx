import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CreateTripDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (trip: {
    name: string;
    startDate?: string;
    endDate?: string;
    days?: number;
  }) => void;
}

export default function CreateTripDialog({
  open,
  onOpenChange,
  onCreate,
}: CreateTripDialogProps) {
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [days, setDays] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name) {
      onCreate({
        name,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        days: days ? parseInt(days) : undefined,
      });
      setName("");
      setStartDate("");
      setEndDate("");
      setDays("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-create-trip">
        <DialogHeader>
          <DialogTitle>Create New Trip</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="trip-name">Trip Name</Label>
            <Input
              id="trip-name"
              placeholder="e.g., Europe Backpacking Adventure"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              data-testid="input-trip-name"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                data-testid="input-start-date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                data-testid="input-end-date"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="days">Or Total Days</Label>
            <Input
              id="days"
              type="number"
              placeholder="e.g., 20"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              data-testid="input-trip-days"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              data-testid="button-cancel-trip"
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" data-testid="button-create-trip">
              Create Trip
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
