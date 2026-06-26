export type InternType = 'B.Tech' | 'MBA' | 'Diploma' | 'Sponsored';
export type InternStatus = 'Applied' | 'Matched' | 'Allotted' | 'Completed' | 'Waitlisted' | 'YetToJoin' | 'Left';

export interface Guide {
  id: string;
  full_name: string;
  p_no?: string;
  department: string;
  expertise_domains: string[];
  required_skills: string[];
  preferred_intern_types: InternType[];
  max_capacity: number;
  current_intern_count: number;
  is_complete: boolean;
  created_at: string;
  interns?: InternSummary[];
  active_interns?: InternSummary[];
  completed_interns?: InternSummary[];
  completed_count?: number;
  matched_interns?: InternSummary[];
}

export interface InternSummary {
  id: string;
  full_name: string;
  status: InternStatus;
  intern_type: InternType;
  branch?: string;
  college?: string;
  skills?: string[];
  start_date?: string;
  duration_months?: number;
  end_date?: string;
}

export interface Intern {
  id: string;
  full_name: string;
  //email: string;
  phone: string;
  p_no: string;
  intern_type: InternType;
  college: string;
  branch: string;
  graduation_year: number;
  cgpa: number | string;
  twelfth_marks?: number | string;
  tenth_marks?: number | string;
  reference_name?: string | null;
  skills: string[];
  preferred_domain: string;
  start_date: string;
  duration_months: number;
  end_date: string;
  status: InternStatus;
  assigned_guide_id: string | null;
  assigned_guide?: Guide | null;
  Project_title: string | null;
  Project_details: string | null;
  created_at: string;
  match_logs?: MatchLog[];
}

export interface MatchLog {
  id: string;
  intern_id: string;
  guide_id: string;
  match_score: number | string;
  matched_at: string;
  confirmed_at: string | null;
  allotted_at: string | null;
  notes: string | null;
  guide?: { id: string; full_name: string; department: string };
}

// export interface MatchResult {
//   guide_id: string;
//   total_score: number;
//   skill_score: number;
//   domain_score: number;
//   cgpa_score: number;
//   matched_skills: string[];
//   total_guide_skills: number;
//   current_intern_count: number;
//   guide: Guide & { is_at_capacity: boolean };
// }

export interface MatchResult {
  guide_id: string;
  total_score: number;
  branch_score: number;
  cgpa_score: number;
  intern_type_score: number;
  current_intern_count: number;

  guide: {
    id: string;
    full_name: string;
    department: string;
    max_capacity: number;
    current_intern_count: number;
    is_at_capacity: boolean;
  };
}
export interface DashboardData {
  left_count: number;
  total_completed: number;
  total_allotted?: number;
  guides_at_capacity: number;
  waitlisted: number;
  pending_confirmation: number;
  long_waitlisted_count: number;
  yet_to_join_count : number;
  long_waitlisted: Array<{
  id: string;
  full_name: string;
  intern_type: InternType;
  branch: string;
  waiting_since: string;
  }>;
}
