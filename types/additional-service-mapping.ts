export interface AdditionalServiceMapping {
  id: string;
  marketplace_service_id: string;
  marketplace_service_name: string;
  source_integration_provider: string;
  courier_provider: string;
  courier_service_code: string;
  param_name?: string;
  param_source?: string;
}
