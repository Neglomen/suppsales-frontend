import { PackageDefinition } from "./package-definition";

export interface PackageMappingRule {
  id: string;
  name: string;
  priority: number;
  
  courier_integration_id?: number | null;
  courier_service_code?: string | null;
  
  product_identifiers?: string[] | null;
  product_identifier_type?: string | null;
  min_quantity?: number | null;
  
  min_weight_kg?: number | null;
  max_weight_kg?: number | null;
  
  min_total_quantity?: number | null;
  
  package_definition_id: string;
  organization_id: string;
  
  package_definition?: PackageDefinition;
  courier_integration_name?: string | null;
}
