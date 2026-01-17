'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { videosApi, jobsApi } from '@/lib/api';
import { formatFileSize, formatDuration } from '@/lib/utils';
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
  Image as ImageIcon
} from 'lucide-react';

interface Video {
  id: string;
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
}

interface Frame {
  id: string;
  frame_number: number;
  timestamp_ms: number;
  thumbnail_path: string;
  is_scene_change: boolean;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  uploaded: { label: 'Uploaded', color: 'bg-gray-500', icon: Clock },
  processing: { label: 'Processing', color: 'bg-blue-500', icon: Loader2 },
  metadata_extracted: { label: 'Analyzing', color: 'bg-blue-500', icon: Loader2 },
  scenes_detected: { label: 'Extracting Frames', color: 'bg-blue-500', icon: Loader2 },
  processed: { label: 'Ready', color: 'bg-green-500', icon: CheckCircle },
  error: { label: 'Error', color: 'bg-red-500', icon: AlertCircle },
};

export default function VideoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = params.videoId as string;

  const [video, setVideo] = useState<Video | null>(null);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [jobProgress, setJobProgress] = useState<{ progress: number; message: string } | null>(null);

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

  const loadVideo = async () => {
    try {
      const response = await videosApi.get(videoId);
      setVideo(response.data);

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

  const handleCreateSOP = () => {
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video Info */}
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
              <Button className="w-full" onClick={handleCreateSOP}>
                <FileText className="h-4 w-4 mr-2" />
                Create SOP
              </Button>
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

      {/* Extracted Frames */}
      {video.status === 'processed' && frames.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Extracted Frames ({frames.length} scene changes)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {frames.map((frame) => (
                <div key={frame.id} className="relative group">
                  <img
                    src={`${process.env.NEXT_PUBLIC_API_URL}/static/thumbnails/${videoId.split('-')[0]}/${videoId}/${frame.thumbnail_path?.split('/').pop()}`}
                    alt={`Frame ${frame.frame_number}`}
                    className="w-full aspect-video object-cover rounded-lg border"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder-frame.png';
                    }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 rounded-b-lg">
                    {formatDuration(frame.timestamp_ms / 1000)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
