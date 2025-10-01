import { useState } from "react";
import ShareTripDialog from "../ShareTripDialog";
import { Button } from "@/components/ui/button";

export default function ShareTripDialogExample() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <Button onClick={() => setOpen(true)}>Share Trip</Button>
      <ShareTripDialog
        open={open}
        onOpenChange={setOpen}
        shareUrl="https://tripbudget.com/share/abc123"
      />
    </div>
  );
}
