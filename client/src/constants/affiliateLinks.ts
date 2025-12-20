export interface AffiliateLink {
  name: string;
  url: string;
  description: string;
}

export interface CategoryLinks {
  title: string;
  description: string;
  links: AffiliateLink[];
}

export const AFFILIATE_LINKS: Record<string, CategoryLinks> = {
  flights: {
    title: "Find Flights",
    description: "Compare prices and find the best deals on flights",
    links: [
      {
        name: "Skyscanner",
        url: "https://www.skyscanner.com",
        description: "Compare flights from hundreds of airlines"
      },
      {
        name: "Google Flights",
        url: "https://www.google.com/travel/flights",
        description: "Search and track flight prices"
      },
      {
        name: "Kayak",
        url: "https://www.kayak.com/flights",
        description: "Find cheap flights and deals"
      },
      {
        name: "Momondo",
        url: "https://www.momondo.com",
        description: "Compare millions of flights"
      }
    ]
  },
  lodging: {
    title: "Find Accommodation",
    description: "Find hostels, hotels, and unique places to stay",
    links: [
      {
        name: "Hostelworld",
        url: "https://www.hostelworld.com",
        description: "Book hostels worldwide"
      },
      {
        name: "Booking.com",
        url: "https://www.booking.com",
        description: "Hotels, apartments, and more"
      },
      {
        name: "Airbnb",
        url: "https://www.airbnb.com",
        description: "Unique homes and experiences"
      },
      {
        name: "Agoda",
        url: "https://www.agoda.com",
        description: "Great deals on hotels"
      }
    ]
  },
  localTransport: {
    title: "Find Local Transport",
    description: "Get around your destination easily",
    links: [
      {
        name: "Rome2Rio",
        url: "https://www.rome2rio.com",
        description: "Find any way to get anywhere"
      },
      {
        name: "Google Maps",
        url: "https://www.google.com/maps",
        description: "Navigate and find transit options"
      },
      {
        name: "Moovit",
        url: "https://moovitapp.com",
        description: "Public transit navigation"
      }
    ]
  },
  cityToCity: {
    title: "Find Transportation",
    description: "Buses, trains, and intercity travel",
    links: [
      {
        name: "FlixBus",
        url: "https://www.flixbus.com",
        description: "Affordable bus travel across Europe"
      },
      {
        name: "Trainline",
        url: "https://www.thetrainline.com",
        description: "Compare train tickets across Europe"
      },
      {
        name: "Rome2Rio",
        url: "https://www.rome2rio.com",
        description: "Compare all transport options"
      },
      {
        name: "Omio",
        url: "https://www.omio.com",
        description: "Trains, buses, and flights"
      },
      {
        name: "BlaBlaCar",
        url: "https://www.blablacar.com",
        description: "Ridesharing between cities"
      }
    ]
  }
};
