import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AddExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryTitle: string;
  onAdd: (expense: {
    description: string;
    cost: string;
    url?: string;
    date?: string;
  }) => void;
}

export default function AddExpenseDialog({
  open,
  onOpenChange,
  categoryTitle,
  onAdd,
}: AddExpenseDialogProps) {
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState("");
  const [url, setUrl] = useState("");
  const [date, setDate] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (description && cost) {
      onAdd({
        description,
        cost: cost,
        url: url || undefined,
        date: date || undefined,
      });
      setDescription("");
      setCost("");
      setUrl("");
      setDate("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-add-expense">
        <DialogHeader>
          <DialogTitle>Add {categoryTitle} Expense</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="Enter description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              data-testid="input-expense-description"
            />
          </div>
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
            <Label htmlFor="url">Link (optional)</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              data-testid="input-expense-url"
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
            <Button type="submit" className="flex-1" data-testid="button-save-expense">
              Add Expense
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
