export interface Supplier {
  id: number;
  name: string;
  lead_time_days: number;
  reliability_score: number;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  category: string;
  unit_cost: number;
  unit_price: number;
  current_stock: number;
  shelf_life_days: number | null;
  warehouse_location: string;
  supplier_id: number | null;
  supplier?: Supplier | null;
  created_at: string;
}

export interface DemandRecord {
  period_start: string;
  units_sold: number;
  stockout_occurred: boolean;
}

export interface ProductDetail extends Product {
  demand_records: DemandRecord[];
}

export interface ForecastPoint {
  period_index: number;
  period_label: string;
  expected_demand: number;
  lower_bound: number;
  upper_bound: number;
}

export interface TrendInfo {
  direction: "rising" | "falling" | "stable";
  slope_per_period: number;
  strength: number;
}

export interface SeasonalityInfo {
  detected: boolean;
  strength: number;
  pattern: string;
}

export interface ForecastResponse {
  product_id: number;
  sku: string;
  method: string;
  history_periods_used: number;
  volatility_cv: number;
  trend: TrendInfo;
  seasonality: SeasonalityInfo;
  forecast: ForecastPoint[];
  model_confidence: number;
}

export type Urgency = "critical" | "high" | "medium" | "low";
export type RecAction = "REORDER_NOW" | "MONITOR" | "REDUCE_STOCK" | "HEALTHY";

export interface RecommendationFactor {
  label: string;
  value: string;
  impact: "increases_risk" | "decreases_risk" | "neutral";
  detail: string;
}

export interface Recommendation {
  product_id: number;
  sku: string;
  product_name: string;
  action: RecAction;
  urgency: Urgency;
  current_stock: number;
  forecasted_weekly_demand: number;
  days_of_stock_remaining: number;
  reorder_point: number;
  safety_stock: number;
  economic_order_qty: number;
  recommended_order_qty: number;
  estimated_stockout_date: string | null;
  confidence: number;
  factors: RecommendationFactor[];
  summary: string;
  generated_at: string;
}

export interface DashboardKPI {
  total_skus: number;
  inventory_value: number;
  at_risk_skus: number;
  critical_skus: number;
  overstocked_skus: number;
  healthy_skus: number;
  avg_forecast_confidence: number;
  projected_stockout_value_at_risk: number;
}

export interface CategoryBreakdown {
  category: string;
  sku_count: number;
  inventory_value: number;
  at_risk_count: number;
}

export interface DashboardResponse {
  kpis: DashboardKPI;
  category_breakdown: CategoryBreakdown[];
  top_urgent: Recommendation[];
}

export interface DatasetWarning {
  column: string;
  issue: string;
  count: number;
}

export interface DatasetSummary {
  id: number;
  filename: string;
  uploaded_at: string;
  row_count: number;
  column_count: number;
  duplicate_rows_removed: number;
  missing_cells_filled: number;
  columns: string[];
  preview: Record<string, unknown>[];
  warnings: DatasetWarning[];
  status: "validated" | "committed";
  products_created: number;
}

export interface DatasetCommitResponse {
  id: number;
  status: string;
  products_created: number;
  message: string;
}

export interface ChatResponse {
  answer: string;
  grounded: boolean;
  mode: "claude" | "fallback";
}

export interface SKUComparison {
  sku: string;
  name: string;
  category: string;
  current_stock: number;
  before_demand: number;
  before_revenue: number;
  before_profit: number;
  before_stockout: boolean;
  after_demand: number;
  after_revenue: number;
  after_profit: number;
  after_stockout: boolean;
}

export interface SimulationResponse {
  scenario: string;
  demand_delta: number;
  category_affected: string | null;
  total_skus_affected: number;
  before_total_revenue: number;
  before_total_profit: number;
  before_avg_utilization: number;
  after_total_revenue: number;
  after_total_profit: number;
  after_avg_utilization: number;
  sku_breakdown: SKUComparison[];
  summary_narrative: string;
}

export interface ShelfProduct {
  sku: string;
  name: string;
  category: string;
  current_stock: number;
  urgency: string;
  action: string;
}

export interface ShelfHealth {
  shelf: string;
  zone: string;
  health: "red" | "amber" | "green";
  current_stock: number;
  capacity: number;
  utilization: number;
  products: ShelfProduct[];
}

export interface ExpiryItem {
  id: number;
  sku: string;
  name: string;
  category: string;
  current_stock: number;
  expiry_date: string;
  days_until_expiry: number;
  unit_price: number;
}

export interface ActionResponse {
  status: string;
  message: string;
}

export interface SKURevenuePrediction {
  sku: string;
  name: string;
  category: string;
  predicted_demand: number;
  predicted_revenue: number;
  predicted_profit: number;
  margin: number;
  roi: number;
}

export interface CategoryRevenuePrediction {
  category: string;
  sku_count: number;
  predicted_revenue: number;
  predicted_profit: number;
  avg_margin: number;
  avg_roi: number;
}

export interface RevenuePredictionResponse {
  total_revenue: number;
  total_profit: number;
  avg_margin: number;
  avg_roi: number;
  sku_predictions: SKURevenuePrediction[];
  category_predictions: CategoryRevenuePrediction[];
}
