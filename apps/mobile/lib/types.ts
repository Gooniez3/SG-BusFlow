export type Stop = {
  code: string;
  name: string;
  road_name: string | null;
  latitude: number;
  longitude: number;
  distance_m?: number | null;
};

export type NearbyResponse = {
  lat: number;
  lng: number;
  radius: number;
  stops: Stop[];
};

export type Arrival = {
  estimated_arrival: string | null;
  minutes: number | null;
  latitude: number | null;
  longitude: number | null;
  load: string | null;
  feature: string | null;
  type: string | null;
  origin_code?: string | null;
  destination_code?: string | null;
  destination_name?: string | null;
  bus_id?: string | null;
};

export type ServiceArrivals = {
  service_no: string;
  operator: string;
  arrivals: Arrival[];
};

export type StopArrivalsResponse = {
  bus_stop_code: string;
  cached_at: string;
  stale: boolean;
  services: ServiceArrivals[];
};

export type ServiceSearchItem = {
  service_no: string;
  operator: string | null;
  origin_code: string | null;
  destination_code: string | null;
};

export type ServiceDetailResponse = {
  service_no: string;
  directions: {
    service_no: string;
    operator: string;
    direction: number;
    category: string | null;
    origin_code: string | null;
    destination_code: string | null;
    loop_desc: string | null;
  }[];
};

export type JourneyLeg = {
  kind: string;
  duration_min: number;
  distance_m?: number | null;
  from_label?: string | null;
  to_label?: string | null;
  to_stop?: Stop | null;
  service_no?: string | null;
  wait_min?: number | null;
  live_minutes?: number | null;
  stop_count?: number | null;
  from_stop?: Stop | null;
  via_stops?: Stop[] | null;
};

export type JourneyOption = {
  id: string;
  duration_min: number;
  walk_min: number;
  wait_min: number;
  transfers: number;
  live: boolean;
  stale: boolean;
  legs: JourneyLeg[];
};

export type JourneyPlanResponse = {
  from_label: string;
  to_label: string;
  from_lat: number;
  from_lng: number;
  to_lat: number;
  to_lng: number;
  network_ready: boolean;
  options: JourneyOption[];
};
