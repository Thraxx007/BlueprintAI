export interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  created_at: string;
}

export interface Video {
  id: string;
  user_id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  duration_seconds: number | null;
  resolution_width: number | null;
  resolution_height: number | null;
  fps: number | null;
  mime_type: string | null;
  status: 'uploaded' | 'processing' | 'metadata_extracted' | 'scenes_detected' | 'frames_extracted' | 'processed' | 'error';
  upload_date: string;
  processed_date: string | null;
  metadata: Record<string, any>;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  segments: VideoSegment[];
  frame_count: number;
}

export interface VideoSegment {
  id: string;
  video_id: string;
  segment_index: number;
  start_time: number;
  end_time: number;
  file_path: string | null;
  status: string;
  title: string | null;
  description: string | null;
  created_at: string;
}

export interface Frame {
  id: string;
  video_id: string;
  segment_id: string | null;
  frame_number: number;
  timestamp_ms: number;
  file_path: string;
  thumbnail_path: string | null;
  is_scene_change: boolean;
  scene_change_score: number | null;
  width: number | null;
  height: number | null;
  analysis_status: string;
  created_at: string;
}

export interface SOP {
  id: string;
  user_id: string;
  video_id: string | null;
  segment_id: string | null;
  title: string;
  description: string | null;
  user_context: string | null;
  status: 'draft' | 'pending_audio' | 'generating' | 'generated' | 'completed' | 'error';
  start_time: number | null;
  end_time: number | null;
  total_steps: number;
  generation_metadata: Record<string, any>;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  steps: SOPStep[];
}

export interface SOPStep {
  id: string;
  sop_id: string;
  frame_id: string | null;
  step_number: number;
  title: string | null;
  description: string;
  screenshot_path: string | null;
  annotated_screenshot_path: string | null;
  timestamp_ms: number | null;
  created_at: string;
  updated_at: string;
  click_annotations: ClickAnnotation[];
}

export interface ClickAnnotation {
  id: string;
  step_id: string;
  x_coordinate: number;
  y_coordinate: number;
  x_percentage: number;
  y_percentage: number;
  click_type: 'left_click' | 'right_click' | 'double_click' | 'hover';
  element_description: string | null;
  action_description: string | null;
  sequence_order: number;
  created_at: string;
}

export interface Export {
  id: string;
  sop_id: string;
  user_id: string;
  export_type: 'google_docs' | 'notion';
  external_id: string | null;
  external_url: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  error_message: string | null;
  export_config: Record<string, any>;
  created_at: string;
  completed_at: string | null;
}

export interface Integration {
  provider: 'google' | 'notion';
  connected: boolean;
  provider_user_id: string | null;
  updated_at: string | null;
}

export interface Job {
  id: string;
  user_id: string;
  video_id: string | null;
  sop_id: string | null;
  celery_task_id: string | null;
  job_type: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  progress_message: string | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export interface AudioSOP {
  id: string;
  title: string;
  description: string | null;
  status: 'pending_audio' | 'generating' | 'generated' | 'completed' | 'error';
  original_filename: string | null;
  file_size: number | null;
  total_steps: number;
  audio_file_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AudioFile {
  id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  duration_seconds: number | null;
  mime_type: string | null;
  transcript: string | null;
  detected_language: string | null;
  transcription_status: 'pending' | 'transcribing' | 'transcribed' | 'error';
  sop_count: number;
  upload_date: string;
  created_at: string;
  updated_at: string;
}
