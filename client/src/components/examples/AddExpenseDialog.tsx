import { useState } from "react";
import AddExpenseDialog from "../AddExpenseDialog";
import { Button } from "@/components/ui/button";

export default function AddExpenseDialogExample() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <Button onClick={() => setOpen(true)}>Open Dialog</Button>
      <AddExpenseDialog
        open={open}
        onOpenChange={setOpen}
        categoryTitle="Flights"
        onAdd={(expense) => console.log("Added:", expense)}
      />
    </div>
  );
}
