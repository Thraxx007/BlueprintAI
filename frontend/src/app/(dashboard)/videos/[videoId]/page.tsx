'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { videosApi, sopsApi } from '@/lib/api';
import { formatFileSize, formatDuration } from '@/lib/utils';
import { MultiSegmentSelector, VideoSegment } from '@/components/video/MultiSegmentSelector';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Play,
  Clock,
  HardDrive,
  Monitor,
  Loader2,
  CheckCircle,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  Save,
  Wand2,
} from 'lucide-react';

interface Video {
  id: string;
  user_id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  duration_seconds: number | null;
  resolution_width: number | null;
  resolution_height: number | null;
  fps: number | null;
  status: string;
  upload_date: string;
  processed_date: string | null;
  error_message: string | null;
  frame_count: number;
  segments: Array<{
    id: string;
    start_time: number;
    end_time: number;
    title: string | null;
    status: string;
  }>;
}

interface Frame {
  id: string;
  frame_number: number;
  timestamp_ms: number;
  thumbnail_path: string;
  is_scene_change: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  uploaded: { label: 'Uploaded', color: 'bg-gray-500', icon: Clock },
  processing: { label: 'Processing', color: 'bg-blue-500', icon: Loader2 },
  metadata_extracted: { label: 'Analyzing', color: 'bg-blue-500', icon: Loader2 },
  scenes_detected: { label: 'Extracting Frames', color: 'bg-blue-500', icon: Loader2 },
  processed: { label: 'Ready', color: 'bg-green-500', icon: CheckCircle },
  error: { label: 'Error', color: 'bg-red-500', icon: AlertCircle },
};

// Segment colors for consistency
const SEGMENT_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
];

export default function VideoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = params.videoId as string;

  const [video, setVideo] = useState<Video | null>(null);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [segments, setSegments] = useState<VideoSegment[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [initialSegmentsLoaded, setInitialSegmentsLoaded] = useState(false);

  // SOP creation dialog
  const [showSOPDialog, setShowSOPDialog] = useState(false);
  const [sopSegment, setSOPSegment] = useState<VideoSegment | null>(null);
  const [sopTitle, setSOPTitle] = useState('');
  const [sopDescription, setSOPDescription] = useState('');
  const [sopContext, setSOPContext] = useState('');
  const [sopDetailLevel, setSOPDetailLevel] = useState('detailed');
  const [sopMaxSteps, setSOPMaxSteps] = useState(50);
  const [creatingSOPs, setCreatingSOPs] = useState(false);
  const [createAllMode, setCreateAllMode] = useState(false);

  useEffect(() => {
    loadVideo();
  }, [videoId]);

  useEffect(() => {
    // Poll for updates while processing
    if (video && ['processing', 'metadata_extracted', 'scenes_detected'].includes(video.status)) {
      const interval = setInterval(() => {
        loadVideo();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [video?.status]);

  const loadVideo = async (forceLoadSegments = false) => {
    try {
      const response = await videosApi.get(videoId);
      setVideo(response.data);

      // Only load segments on initial load or when explicitly requested (after save)
      // This prevents overwriting user's unsaved segment changes during polling
      if (!initialSegmentsLoaded || forceLoadSegments) {
        if (response.data.segments && response.data.segments.length > 0) {
          const loadedSegments: VideoSegment[] = response.data.segments.map((seg: any, index: number) => ({
            id: seg.id,
            startTime: seg.start_time,
            endTime: seg.end_time,
            label: seg.title || `Segment ${index + 1}`,
            color: SEGMENT_COLORS[index % SEGMENT_COLORS.length],
          }));
          setSegments(loadedSegments);
        } else {
          setSegments([]);
        }
        setInitialSegmentsLoaded(true);
        setHasUnsavedChanges(false);
      }

      // Load frames if processed
      if (response.data.status === 'processed') {
        const framesResponse = await videosApi.getFrames(videoId, true);
        setFrames(framesResponse.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load video');
    } finally {
      setLoading(false);
    }
  };

  const handleSegmentsChange = useCallback((newSegments: VideoSegment[]) => {
    setSegments(newSegments);
    setHasUnsavedChanges(true);
  }, []);

  const handleSaveSegments = async () => {
    setSaving(true);
    try {
      await videosApi.saveSegments(videoId, segments.map(s => ({
        start_time: s.startTime,
        end_time: s.endTime,
        label: s.label,
        color: s.color,
      })));
      setHasUnsavedChanges(false);
      // Reload to get the new segment IDs from the server
      await loadVideo(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save segments');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateSOPFromSegment = (segment: VideoSegment) => {
    setSOPSegment(segment);
    setSOPTitle(segment.label);
    setSOPDescription('');
    setSOPContext('');
    setCreateAllMode(false);
    setShowSOPDialog(true);
  };

  const handleCreateAllSOPs = () => {
    setSOPSegment(null);
    setSOPTitle('');
    setSOPDescription('');
    setSOPContext('');
    setCreateAllMode(true);
    setShowSOPDialog(true);
  };

  const handleCreateSOP = async () => {
    setCreatingSOPs(true);
    try {
      if (createAllMode) {
        // Create SOP for each segment
        for (const segment of segments) {
          const createResponse = await sopsApi.create({
            video_id: videoId,
            title: segment.label,
            description: sopDescription || undefined,
            user_context: sopContext || undefined,
            start_time: segment.startTime,
            end_time: segment.endTime,
          });

          await sopsApi.generate(createResponse.data.id, {
            detail_level: sopDetailLevel,
            max_steps: sopMaxSteps,
          });
        }
        // Navigate to SOPs list
        router.push('/sops');
      } else if (sopSegment) {
        // Create single SOP
        const createResponse = await sopsApi.create({
          video_id: videoId,
          title: sopTitle || sopSegment.label,
          description: sopDescription || undefined,
          user_context: sopContext || undefined,
          start_time: sopSegment.startTime,
          end_time: sopSegment.endTime,
        });

        await sopsApi.generate(createResponse.data.id, {
          detail_level: sopDetailLevel,
          max_steps: sopMaxSteps,
        });

        // Navigate to the new SOP
        router.push(`/sops/${createResponse.data.id}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create SOP');
    } finally {
      setCreatingSOPs(false);
      setShowSOPDialog(false);
    }
  };

  const handleCreateSingleSOP = () => {
    router.push(`/sops/new?videoId=${videoId}`);
  };

  const handleProcess = async () => {
    try {
      await videosApi.process(videoId);
      loadVideo();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to start processing');
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Error Loading Video</h3>
            <p className="text-gray-500 mb-6">{error || 'Video not found'}</p>
            <Button onClick={() => router.push('/videos')}>
              Back to Videos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = statusConfig[video.status] || statusConfig.uploaded;
  const StatusIcon = status.icon;
  const videoUrl = `${API_URL}/static/videos/${video.user_id}/${video.filename}`;

  return (
    <div className="p-8">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.push('/videos')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Videos
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{video.original_filename}</h1>
            <p className="text-gray-500">Uploaded {new Date(video.upload_date).toLocaleDateString()}</p>
          </div>
          <Badge className={status.color}>
            <StatusIcon className={`h-3 w-3 mr-1 ${video.status.includes('process') || video.status.includes('extract') || video.status.includes('detect') ? 'animate-spin' : ''}`} />
            {status.label}
          </Badge>
        </div>
      </div>

      {/* Video Info Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Video Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <HardDrive className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Size</p>
                  <p className="font-medium">{formatFileSize(video.file_size)}</p>
                </div>
              </div>
              {video.duration_seconds && (
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Duration</p>
                    <p className="font-medium">{formatDuration(video.duration_seconds)}</p>
                  </div>
                </div>
              )}
              {video.resolution_width && video.resolution_height && (
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Monitor className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Resolution</p>
                    <p className="font-medium">{video.resolution_width}x{video.resolution_height}</p>
                  </div>
                </div>
              )}
              {video.frame_count > 0 && (
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <ImageIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Frames</p>
                    <p className="font-medium">{video.frame_count}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Processing Progress */}
            {['processing', 'metadata_extracted', 'scenes_detected'].includes(video.status) && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  <span className="font-medium text-blue-900">Processing video...</span>
                </div>
                <p className="text-sm text-blue-700">
                  This may take a few minutes depending on video length. The page will update automatically.
                </p>
              </div>
            )}

            {/* Error Message */}
            {video.status === 'error' && video.error_message && (
              <div className="mt-6 p-4 bg-red-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="font-medium text-red-900">Processing Failed</span>
                </div>
                <p className="text-sm text-red-700">{video.error_message}</p>
                <Button onClick={handleProcess} className="mt-3" size="sm">
                  Retry Processing
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {video.status === 'uploaded' && (
              <Button className="w-full" onClick={handleProcess}>
                <Play className="h-4 w-4 mr-2" />
                Process Video
              </Button>
            )}
            {video.status === 'processed' && (
              <>
                <Button className="w-full" onClick={handleCreateSingleSOP}>
                  <FileText className="h-4 w-4 mr-2" />
                  Create Single SOP
                </Button>
                {segments.length > 0 && (
                  <Button className="w-full" variant="outline" onClick={handleCreateAllSOPs}>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Create SOPs from All Segments ({segments.length})
                  </Button>
                )}
                {hasUnsavedChanges && (
                  <Button className="w-full" variant="secondary" onClick={handleSaveSegments} disabled={saving}>
                    {saving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Segments
                  </Button>
                )}
              </>
            )}
            {['processing', 'metadata_extracted', 'scenes_detected'].includes(video.status) && (
              <Button className="w-full" disabled>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Multi-Segment Selector */}
      {video.status === 'processed' && video.duration_seconds && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Video Segments</CardTitle>
            <p className="text-sm text-gray-500">
              Define multiple segments to create separate SOPs for different workflows in this recording.
            </p>
          </CardHeader>
          <CardContent>
            <MultiSegmentSelector
              videoUrl={videoUrl}
              duration={video.duration_seconds}
              segments={segments}
              onSegmentsChange={handleSegmentsChange}
              onCreateSOP={handleCreateSOPFromSegment}
            />
          </CardContent>
        </Card>
      )}

      {/* Extracted Frames */}
      {video.status === 'processed' && frames.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Scene Changes ({frames.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-2">
              {frames.slice(0, 24).map((frame) => (
                <div key={frame.id} className="relative group">
                  <img
                    src={`${API_URL}/static/thumbnails/${video.user_id}/${videoId}/${frame.thumbnail_path?.split('/').pop()}`}
                    alt={`Frame ${frame.frame_number}`}
                    className="w-full aspect-video object-cover rounded border"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-1 rounded-b">
                    {formatDuration(frame.timestamp_ms / 1000)}
                  </div>
                </div>
              ))}
            </div>
            {frames.length > 24 && (
              <p className="text-sm text-gray-500 mt-2 text-center">
                + {frames.length - 24} more frames
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* SOP Creation Dialog */}
      <Dialog open={showSOPDialog} onOpenChange={setShowSOPDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {createAllMode ? `Create ${segments.length} SOPs from Segments` : 'Create SOP from Segment'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!createAllMode && sopSegment && (
              <div className="space-y-2">
                <Label htmlFor="title">SOP Title</Label>
                <Input
                  id="title"
                  value={sopTitle}
                  onChange={(e) => setSOPTitle(e.target.value)}
                  placeholder="Enter SOP title..."
                />
                <p className="text-xs text-gray-500">
                  Segment: {formatDuration(sopSegment.startTime)} - {formatDuration(sopSegment.endTime)}
                </p>
              </div>
            )}

            {createAllMode && (
              <div className="p-3 bg-blue-50 rounded-lg text-sm">
                <p className="font-medium text-blue-900 mb-1">Creating SOPs for:</p>
                <ul className="text-blue-700 space-y-1">
                  {segments.map((seg, i) => (
                    <li key={seg.id}>
                      {i + 1}. {seg.label} ({formatDuration(seg.startTime)} - {formatDuration(seg.endTime)})
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                value={sopDescription}
                onChange={(e) => setSOPDescription(e.target.value)}
                placeholder="Brief description..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="context">Context for AI (optional)</Label>
              <textarea
                id="context"
                value={sopContext}
                onChange={(e) => setSOPContext(e.target.value)}
                placeholder="Describe what this video shows to help the AI..."
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="detail">Detail Level</Label>
                <select
                  id="detail"
                  value={sopDetailLevel}
                  onChange={(e) => setSOPDetailLevel(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="brief">Brief</option>
                  <option value="detailed">Detailed</option>
                  <option value="comprehensive">Comprehensive</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="steps">Max Steps</Label>
                <Input
                  id="steps"
                  type="number"
                  min={5}
                  max={100}
                  value={sopMaxSteps}
                  onChange={(e) => setSOPMaxSteps(parseInt(e.target.value))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSOPDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSOP} disabled={creatingSOPs}>
              {creatingSOPs ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-2" />
                  {createAllMode ? `Create ${segments.length} SOPs` : 'Create SOP'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
