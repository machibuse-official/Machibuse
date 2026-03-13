export interface ScrapedImage {
  url: string;
  type:
    | "exterior"
    | "interior"
    | "floorplan"
    | "entrance"
    | "common"
    | "kitchen"
    | "bathroom"
    | "view"
    | "other";
  caption: string | null;
}

export interface ScrapedListing {
  mansion_name: string;
  address: string;
  nearest_station: string;
  walking_minutes: number;
  layout_type: string;
  size_sqm: number;
  floor: number | null;
  rent: number; // 円
  management_fee: number | null; // 円
  deposit: number | null; // 敷金（円）
  key_money: number | null; // 礼金（円）
  images: ScrapedImage[];
  move_in_date: string | null;
  interior_features: string[];
  building_features: string[];
  floorplan_image_url: string | null;
  exterior_image_url: string | null;
  source_site: string;
  source_url: string;
}
