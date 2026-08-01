export type ProjectRow = {
  id: string;
  title: string;
  assigned_vendor_id: string | null;
  region_id: string | null;
  budget: number | null;
  deadline: string | null;
  status: string;
  vendor: { name: string } | null;
  region: { name: string } | null;
};
