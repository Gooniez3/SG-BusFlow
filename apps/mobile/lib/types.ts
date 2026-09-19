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
