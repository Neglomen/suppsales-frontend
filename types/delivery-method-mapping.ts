import { ServiceIntegration } from "./service-integration";
export interface DeliveryMethodMapping {
  id: string;
  marketplace_delivery_method: string;
  service_integration_id: number;
  courier_service_code: string;
  courier_credentials_id: string | null;
  default_package_definition_id: string | null;
  organization_id: string;
  source_integration: ServiceIntegration | null;
}
