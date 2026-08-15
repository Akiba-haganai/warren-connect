/**
 * Shared amenities constants used across AccommodationComposer,
 * AccommodationFilters, and AccommodationDetailPage.
 * Single source of truth — do not redefine locally in those files.
 */

/** Full list of amenities shown in the composer and detail-page editor */
export const ALL_AMENITIES: string[] = [
  // Utilities
  "WiFi",
  "Water included",
  "Electricity included",
  "Borehole water",
  "Solar power backup",
  "Generator backup",
  "ZESCO prepaid meter",

  // Furnishings
  "Furnished",
  "Bed & mattress",
  "Wardrobe",
  "Study desk & chair",
  "Bookshelf",
  "Curtains & blinds",

  // Bathroom
  "Private bathroom",
  "Shared bathroom",
  "Hot water shower",
  "Flush toilet",

  // Kitchen
  "Shared kitchen",
  "Private kitchen",
  "Gas stove included",
  "Microwave",
  "Fridge access",

  // Security & Access
  "24/7 security guard",
  "Perimeter wall & gate",
  "CCTV cameras",
  "Burglar bars",
  "Electric fence",
  "Intercom / buzzer",

  // Laundry
  "Washing machine",
  "Laundry area",
  "Clothesline",

  // Outdoor & Transport
  "Parking (car)",
  "Parking (motorbike)",
  "Near minibus route",
  "Near campus shuttle",

  // Study & Work
  "Quiet study environment",
  "Common study room",
  "High-speed fibre",
  "Backup data / router",

  // Social & Wellness
  "Garden / outdoor space",
  "Common lounge",
  "Gym nearby",
  "No alcohol policy",
  "No smoking policy",
  "Couples welcome",
  "Female-only",
  "Male-only",

  // Extras
  "DSTV / TV included",
  "Cleaning service",
  "Trash collection",
  "Storage room",
  "Pet-friendly",
];

/**
 * Curated subset shown as filter chips in AccommodationFilters.
 * Keep this short enough to be scannable in a horizontal scroll row.
 */
export const FILTER_AMENITIES: string[] = [
  "WiFi",
  "Water included",
  "Electricity included",
  "Furnished",
  "Private bathroom",
  "Hot water shower",
  "24/7 security guard",
  "Solar power backup",
  "Generator backup",
  "Study desk & chair",
  "Parking (car)",
  "Near campus shuttle",
  "High-speed fibre",
  "Female-only",
  "Male-only",
];
