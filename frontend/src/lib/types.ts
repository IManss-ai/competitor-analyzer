// Mirrors backend Pydantic schemas exactly

export interface Dataset {
  id: number;
  company_slug: string;
  source_type: "huggingface" | "manual";
  hf_dataset_id: string | null;
  name: string;
  sources_description: string | null;
  contains_personal_data: boolean | null;
  license_type: string | null;
  contains_ip: boolean | null;
  approximate_size: string | null;
  acquisition_method: string | null;
  collection_period: string | null;
  modifications_description: string | null;
  has_missing_fields: boolean;
  created_at: string;
  updated_at: string;
}

export interface DatasetCreate {
  company_slug: string;
  source_type: "huggingface" | "manual";
  hf_dataset_id?: string;
  name: string;
  sources_description?: string;
  contains_personal_data?: boolean;
  license_type?: string;
  contains_ip?: boolean;
  approximate_size?: string;
  acquisition_method?: string;
  collection_period?: string;
  modifications_description?: string;
}

export interface DatasetUpdate {
  sources_description?: string;
  contains_personal_data?: boolean;
  license_type?: string;
  contains_ip?: boolean;
  approximate_size?: string;
  acquisition_method?: string;
  collection_period?: string;
  modifications_description?: string;
}

export interface DatasetList {
  datasets: Dataset[];
  total: number;
}

export interface Disclosure {
  id: number;
  dataset_id: number;
  version_hash: string;
  html_content: string;
  generated_at: string;
  published_at: string | null;
}

export interface DisclosureGenerateRequest {
  company_name: string;
  company_slug: string;
  dataset_ids: number[];
}

export interface DashboardStats {
  total_datasets: number;
  compliant_datasets: number;
  non_compliant_datasets: number;
  total_disclosures: number;
  published_disclosures: number;
  compliance_score: number; // 0.0 to 1.0
}

export interface BillingInfo {
  plan: "basic" | "unlimited";
  price_per_month: number;
  datasets_used: number;
  datasets_limit: number;
  invoices: Invoice[];
}

export interface Invoice {
  id: string;
  date: string;
  amount: number;
  status: "paid" | "pending" | "failed";
  pdf_url: string;
}

export interface Competitor {
  id: string;
  name: string;
  url: string;
  compliance_score: number;
  last_checked: string;
  datasets_disclosed: number;
}
