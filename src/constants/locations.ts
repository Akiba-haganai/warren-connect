/**
 * Standardized Zambian Higher Education Institutions & Residential Locations
 * Focused on Lusaka Province and Copperbelt Province student hubs.
 */

export const ZAMBIA_UNIVERSITIES_COLLEGES = [
  "University of Zambia (UNZA)",
  "Copperbelt University (CBU)",
  "Evelyn Hone College",
  "Zambia Centre for Accountancy Studies (ZCAS University)",
  "National Institute of Public Administration (NIPA)",
  "Apex Medical University (LAMU)",
  "Cavendish University Zambia",
  "University of Lusaka (UNILUS)",
  "Levy Mwanawasa Medical University (LMMU)",
  "Information and Communications University (ICU)",
  "Mulungushi University (MU)",
  "Kwame Nkrumah University",
  "Mukuba University",
  "Texila American University",
  "Zambia Institute of Mass Communication (ZAMCOM)",
  "Zambia Institute of Management (ZAMIM)",
  "Northern Technical College (NORTEC)",
  "DMI-St. Eugene University",
  "Other / Independent College",
] as const;

export const ZAMBIA_PROVINCES = [
  "Lusaka Province",
  "Copperbelt Province",
] as const;

export const ZAMBIA_LOCATIONS = [
  // Lusaka Province (UNZA, UNILUS, LMMU, ZCAS, NIPA, Apex, Cavendish)
  "Lusaka - UNZA Great East Road Campus",
  "Lusaka - Roma",
  "Lusaka - Kalundu",
  "Lusaka - Marshlands",
  "Lusaka - Kaunda Square",
  "Lusaka - Handsworth",
  "Lusaka - Munali",
  "Lusaka - Woodlands",
  "Lusaka - Kamwala / Kamwala South",
  "Lusaka - Rhodespark",
  "Lusaka - Kalingalinga",
  "Lusaka - Villa Elizabetha",
  "Lusaka - Northmead",
  "Lusaka - Chudleigh",
  "Lusaka - Chelston",
  "Lusaka - Sunningdale",
  "Lusaka - Matero",
  "Lusaka - Chilenje",
  "Lusaka - Silverest / UNILUS Campus",
  "Lusaka - Chainama / LMMU Campus",

  // Copperbelt Province - Kitwe (CBU Main)
  "Kitwe - CBU Main Campus / Mindolo",
  "Kitwe - Riverside",
  "Kitwe - Parklands",
  "Kitwe - Nkana East",
  "Kitwe - Kwacha",
  "Kitwe - Garneton",
  "Kitwe - Chimwemwe",

  // Copperbelt Province - Ndola (CBU Ndola School of Medicine)
  "Ndola - CBU Ndola School of Medicine",
  "Ndola - Itawa",
  "Ndola - Kansenshi",
  "Ndola - Northrise",
  "Ndola - Hillcrest",
  "Ndola - Masala",
] as const;

export type ZambianUniversity = (typeof ZAMBIA_UNIVERSITIES_COLLEGES)[number];
export type ZambianLocation = (typeof ZAMBIA_LOCATIONS)[number];
