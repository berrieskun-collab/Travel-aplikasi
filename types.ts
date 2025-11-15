export interface Activity {
  name: string;
  hours: string;
  cost: string; // e.g., "JPY 400" or "Gratis"
  priceCheckLink: string; // A URL for checking prices
  actualCost?: number | null; // Added for user-inputted actual cost
}

export interface ItineraryDay {
  day: number;
  activities: Activity[];
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
  maps?: {
    uri: string;
    title: string;
  };
}