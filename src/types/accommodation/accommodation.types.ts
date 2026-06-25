import type { Tables } from "@/types/database/database.types";

export type Accommodation = Tables<"accommodations">;

// Extended type including landlord info
export interface AccommodationWithLandlord extends Accommodation {
  landlord?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    is_verified: boolean;
    is_landlord: boolean;
  };
}