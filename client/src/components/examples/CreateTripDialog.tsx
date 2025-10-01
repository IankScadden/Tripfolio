import { useState } from "react";
import CreateTripDialog from "../CreateTripDialog";
import { Button } from "@/components/ui/button";

export default function CreateTripDialogExample() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <Button onClick={() => setOpen(true)}>Create Trip</Button>
      <CreateTripDialog
        open={open}
        onOpenChange={setOpen}
        onCreate={(trip) => console.log("Created:", trip)}
      />
    </div>
  );
}
