import { Link2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface ExpenseItemProps {
  description: string;
  cost: number;
  url?: string;
  date?: string;
  icon: React.ReactNode;
  categoryColor: string;
  onEdit: () => void;
  onDelete: () => void;
}

export default function ExpenseItem({
  description,
  cost,
  url,
  date,
  icon,
  categoryColor,
  onEdit,
  onDelete,
}: ExpenseItemProps) {
  return (
    <Card className="p-4 hover-elevate group" data-testid={`card-expense-${description}`}>
      <div className="flex items-center gap-4">
        <div
          className="flex-shrink-0 w-10 h-10 rounded-md flex items-center justify-center"
          style={{ backgroundColor: categoryColor + "20", color: categoryColor }}
        >
          {icon}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-foreground" data-testid="text-expense-description">
              {description}
            </h4>
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                data-testid="link-expense-url"
              >
                <Link2 className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
          {date && (
            <p className="text-sm text-muted-foreground" data-testid="text-expense-date">
              {new Date(date).toLocaleDateString()}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="text-lg font-semibold text-foreground" data-testid="text-expense-cost">
              ${cost.toLocaleString()}
            </div>
          </div>
          
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="icon"
              variant="ghost"
              onClick={onEdit}
              data-testid="button-edit-expense"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={onDelete}
              data-testid="button-delete-expense"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
