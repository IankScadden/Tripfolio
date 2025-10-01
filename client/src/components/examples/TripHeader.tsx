import TripHeader from "../TripHeader";

export default function TripHeaderExample() {
  return (
    <TripHeader
      tripName="Europe Backpacking Adventure"
      startDate="2024-06-15"
      endDate="2024-07-05"
      days={20}
      totalCost={3450}
      onShare={() => console.log("Share clicked")}
      onEdit={() => console.log("Edit clicked")}
    />
  );
}
