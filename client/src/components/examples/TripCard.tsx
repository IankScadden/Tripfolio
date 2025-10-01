import TripCard from "../TripCard";

export default function TripCardExample() {
  return (
    <TripCard
      name="Europe Backpacking Adventure"
      startDate="2024-06-15"
      endDate="2024-07-05"
      days={20}
      totalCost={3450}
      onClick={() => console.log("Trip clicked")}
    />
  );
}
