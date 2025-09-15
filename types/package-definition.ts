export interface PackageDefinition {
  id: string;
  name: string;
  is_default: boolean;
  length_cm: number;
  width_cm: number;
  height_cm: number;
  weight_kg: number;
  organization_id: string;
  courier_code: string | null;
}
