import type { Place, QiblaData, TravelLocation } from "@/lib/types";

export const mockTravelLocation: TravelLocation = {
  city: "Jakarta",
  country: "Indonesia",
  displayName: "Jakarta, Indonesia",
  latitudePlaceholder: -6.2,
  longitudePlaceholder: 106.84,
};

export const mockNearbyMosques: Place[] = [
  {
    id: "m1",
    name: "Istiqlal Mosque",
    category: "mosque",
    distance: "2.1 km",
    rating: 4.9,
    address: "Jl. Taman Wijaya Kusuma · mock",
    openNow: true,
    tags: ["Large capacity", "Tourist friendly"],
  },
  {
    id: "m2",
    name: "Al-Azhar Mosque",
    category: "mosque",
    distance: "3.4 km",
    rating: 4.7,
    address: "Kebayoran Baru · mock",
    openNow: true,
    tags: ["Quiet", "Library"],
  },
];

export const mockHalalFood: Place[] = [
  {
    id: "h1",
    name: "Sate Senayan",
    category: "halal-food",
    distance: "0.8 km",
    rating: 4.6,
    address: "Plaza Senayan · mock",
    openNow: true,
    tags: ["Halal certified (mock)", "Indonesian"],
  },
  {
    id: "h2",
    name: "Biryani House",
    category: "halal-food",
    distance: "1.2 km",
    rating: 4.5,
    address: "Jl. Sudirman · mock",
    openNow: false,
    tags: ["Middle Eastern"],
  },
];

export const mockQibla: QiblaData = {
  directionDegreesPlaceholder: 295,
  city: "Jakarta",
  country: "Indonesia",
  distanceKmPlaceholder: 7900,
  permissionState: "prompt",
};
