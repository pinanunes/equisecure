export interface User {
  id: string;
  email: string;
  role: 'user' | 'admin';
  has_given_consent?: boolean;
  created_at: string;
  full_name: string | null; 
}

export interface Profile {
  id: string;
  email: string;
  role: 'user' | 'admin';
  has_given_consent?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Exploracao {
  id: string;
  user_id: string;
  name: string;
  region?: string;
  type?: string;
  created_at: string;
}

// Keep Installation as alias for backward compatibility during transition
export type Installation = Exploracao;

export interface Questionnaire {
  id: string;
  name: string;
  version: number;
  is_active: boolean;
  created_at: string;
  sections?: Section[];
}

export interface Section {
  id: string;
  questionnaire_id: string;
  name: string;
  order_index: number;
  created_at: string;
  questions?: Question[];
}

export interface Question {
  id: string;
  section_id: string;
  text: string;
  type: 'multiple_choice' | 'checkbox' | 'text';
  order_index: number;
  max_score: number;
  improvement_tip?: string;
  created_at: string;
  options?: QuestionOption[];
}

export interface QuestionOption {
  id: string;
  question_id: string;
  text: string;
  score: number;
  order_index: number;
  created_at: string;
}

export interface Evaluation {
  id: string;
  installation_id: string;
  questionnaire_id: string;
  user_id: string;
  total_score: number;
  created_at: string;
  installation?: Installation;
  questionnaire?: Questionnaire;
  answers?: EvaluationAnswer[];
}

export interface EvaluationAnswer {
  id: string;
  evaluation_id: string;
  question_id: string;
  selected_options: string[];
  text_answer?: string;
  score: number;
  created_at: string;
  question?: Question;
}

export interface SectionScore {
  section_id: string;
  section_name: string;
  score: number;
  max_score: number;
  percentage: number;
}

export interface EvaluationSummary {
  evaluation: Evaluation;
  section_scores: SectionScore[];
  total_score: number;
  total_max_score: number;
  total_percentage: number;
  recommendations: Recommendation[];
}

export interface Recommendation {
  question_id: string;
  question_text: string;
  improvement_tip: string;
  section_name: string;
  full_name: string; // <-- Add this line
}
