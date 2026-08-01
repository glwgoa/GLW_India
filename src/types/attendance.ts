export type AttendanceRow = {
  id: string;
  user_id: string;
  clock_in: string;
  clock_out: string | null;
  location_coordinates: string | null;
  status: string;
  profile?: { full_name: string } | null;
};
