'use client';

import { useState, useEffect, Suspense, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { videosApi, sopsApi, audioApi } from '@/lib/api';
import type { Video } from '@/types';
import { ArrowLeft, Loader2, Wand2, Video as VideoIcon, Mic, Upload, CheckCircle2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { VideoSegmentSelector } from '@/components/video/VideoSegmentSelector';

type SourceType = 'video' | 'audio';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function NewSOPForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedVideoId = searchParams.get('videoId') || searchParams.get('video_id') || '';

  const [sourceType, setSourceType] = useState<SourceType>(preselectedVideoId ? 'video' : 'video');
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Video form state
  const [selectedVideoId, setSelectedVideoId] = useState(preselectedVideoId);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);

  // Audio form state
  const [audioFile, setAudioFile] = useState<File | null>(null);

  // Common form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [userContext, setUserContext] = useState('');
  const [detailLevel, setDetailLevel] = useState('detailed');
  const [maxSteps, setMaxSteps] = useState(50);
  const [language, setLanguage] = useState('');

  useEffect(() => {
    loadVideos();
  }, []);

  useEffect(() => {
    if (preselectedVideoId) {
      setSelectedVideoId(preselectedVideoId);
      setSourceType('video');
    }
  }, [preselectedVideoId]);

  // Reset segment times when video changes
  useEffect(() => {
    setStartTime(null);
    setEndTime(null);
  }, [selectedVideoId]);

  const loadVideos = async () => {
    try {
      const response = await videosApi.list(1, 100);
      const processedVideos = response.data.videos.filter(
        (v: Video) => v.status === 'processed'
      );
      setVideos(processedVideos);
    } catch (error) {
      console.error('Failed to load videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedVideo = useMemo(() => {
    return videos.find(v => v.id === selectedVideoId);
  }, [videos, selectedVideoId]);

  const videoUrl = useMemo(() => {
    if (!selectedVideo) return '';
    // Build video URL - the backend serves files from storage
    const filename = selectedVideo.filename;
    return `${API_URL}/storage/videos/${selectedVideo.user_id}/${filename}`;
  }, [selectedVideo]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setAudioFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.mp3', '.wav', '.m4a', '.ogg', '.webm'],
    },
    maxFiles: 1,
    maxSize: 25 * 1024 * 1024, // 25MB (Whisper API limit)
  });

  const handleSegmentChange = useCallback((start: number | null, end: number | null) => {
    setStartTime(start);
    setEndTime(end);
  }, []);

  const handleCreateFromVideo = async () => {
    if (!selectedVideoId || !title) {
      alert('Please select a video and enter a title');
      return;
    }

    setCreating(true);
    try {
      // Create SOP with optional segment times
      const createResponse = await sopsApi.create({
        video_id: selectedVideoId,
        title,
        description,
        user_context: userContext,
        start_time: startTime ?? undefined,
        end_time: endTime ?? undefined,
      });

      const sopId = createResponse.data.id;

      // Start generation
      await sopsApi.generate(sopId, {
        detail_level: detailLevel,
        max_steps: maxSteps,
      });

      router.push(`/sops/${sopId}`);
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to create SOP');
      setCreating(false);
    }
  };

  const handleCreateFromAudio = async () => {
    if (!audioFile || !title) {
      alert('Please upload an audio file and enter a title');
      return;
    }

    setCreating(true);
    setUploadProgress(0);

    try {
      // Upload audio and create SOP
      const uploadResponse = await audioApi.upload(
        audioFile,
        { title, description, user_context: userContext },
        (progress) => setUploadProgress(progress)
      );

      const sopId = uploadResponse.data.sop_id;

      // Start generation
      await audioApi.generate(sopId, {
        detail_level: detailLevel,
        language: language || undefined,
        user_context: userContext,
      });

      router.push(`/sops/${sopId}`);
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to create SOP from audio');
      setCreating(false);
    }
  };

  const handleCreate = () => {
    if (sourceType === 'video') {
      handleCreateFromVideo();
    } else {
      handleCreateFromAudio();
    }
  };

  const isValid = sourceType === 'video'
    ? selectedVideoId && title
    : audioFile && title;

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Button variant="ghost" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <div className="mb-8">
        <h1 className="text-2xl font-bold">Create New SOP</h1>
        <p className="text-gray-600">Generate a step-by-step guide from video or audio</p>
      </div>

      {/* Source Type Selector */}
      <div className="flex gap-4 mb-6">
        <button
          type="button"
          onClick={() => setSourceType('video')}
          className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${
            sourceType === 'video'
              ? 'border-blue-600 bg-blue-50 text-blue-700'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <VideoIcon className="h-5 w-5" />
          <span className="font-medium">From Video</span>
        </button>
        <button
          type="button"
          onClick={() => setSourceType('audio')}
          className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${
            sourceType === 'audio'
              ? 'border-blue-600 bg-blue-50 text-blue-700'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <Mic className="h-5 w-5" />
          <span className="font-medium">From Audio</span>
        </button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {sourceType === 'video' ? 'Video SOP Details' : 'Audio SOP Details'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Video Selection */}
          {sourceType === 'video' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="video">Select Video</Label>
                <select
                  id="video"
                  value={selectedVideoId}
                  onChange={(e) => setSelectedVideoId(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Choose a processed video...</option>
                  {videos.map((video) => (
                    <option key={video.id} value={video.id}>
                      {video.original_filename}
                      {video.duration_seconds && ` (${Math.floor(video.duration_seconds / 60)}:${Math.floor(video.duration_seconds % 60).toString().padStart(2, '0')})`}
                    </option>
                  ))}
                </select>
                {videos.length === 0 && (
                  <p className="text-sm text-amber-600">
                    No processed videos found. Please upload and process a video first.
                  </p>
                )}
              </div>

              {/* Video Segment Selector */}
              {selectedVideo && selectedVideo.duration_seconds && (
                <div className="space-y-2">
                  <VideoSegmentSelector
                    videoUrl={videoUrl}
                    duration={selectedVideo.duration_seconds}
                    onSegmentChange={handleSegmentChange}
                    initialStartTime={startTime ?? undefined}
                    initialEndTime={endTime ?? undefined}
                  />
                </div>
              )}
            </>
          )}

          {/* Audio Upload */}
          {sourceType === 'audio' && (
            <div className="space-y-2">
              <Label>Upload Audio File</Label>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? 'border-blue-500 bg-blue-50'
                    : audioFile
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input {...getInputProps()} />
                {audioFile ? (
                  <div className="flex flex-col items-center">
                    <CheckCircle2 className="h-10 w-10 text-green-600 mb-2" />
                    <p className="font-medium text-green-700">{audioFile.name}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {(audioFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAudioFile(null);
                      }}
                      className="text-sm text-gray-500 hover:text-gray-700 mt-2 underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Upload className="h-10 w-10 text-gray-400 mb-2" />
                    <p className="text-gray-600">
                      {isDragActive
                        ? 'Drop the audio file here...'
                        : 'Drag & drop an audio file, or click to select'}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      MP3, WAV, M4A, OGG, or WebM (max 25MB)
                    </p>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Your audio will be transcribed and analyzed to create SOP steps.
              </p>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">SOP Title *</Label>
            <Input
              id="title"
              placeholder="e.g., How to Create a New Project"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="Brief description of what this SOP covers"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* User Context */}
          <div className="space-y-2">
            <Label htmlFor="context">Context for AI</Label>
            <textarea
              id="context"
              placeholder={
                sourceType === 'video'
                  ? 'Describe what the video shows to help the AI generate better steps...'
                  : 'Describe what the audio covers to help the AI understand the context...'
              }
              value={userContext}
              onChange={(e) => setUserContext(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <p className="text-xs text-gray-500">
              The more context you provide, the better the AI can understand and describe each step.
            </p>
          </div>

          {/* Options */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="detail">Detail Level</Label>
              <select
                id="detail"
                value={detailLevel}
                onChange={(e) => setDetailLevel(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="brief">Brief</option>
                <option value="detailed">Detailed (Recommended)</option>
                <option value="comprehensive">Comprehensive</option>
              </select>
            </div>
            {sourceType === 'video' ? (
              <div className="space-y-2">
                <Label htmlFor="steps">Max Steps</Label>
                <Input
                  id="steps"
                  type="number"
                  min={5}
                  max={100}
                  value={maxSteps}
                  onChange={(e) => setMaxSteps(parseInt(e.target.value))}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="language">Language (optional)</Label>
                <select
                  id="language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Auto-detect</option>
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="it">Italian</option>
                  <option value="pt">Portuguese</option>
                  <option value="zh">Chinese</option>
                  <option value="ja">Japanese</option>
                  <option value="ko">Korean</option>
                </select>
              </div>
            )}
          </div>

          {/* Segment Info Summary */}
          {sourceType === 'video' && selectedVideo && startTime !== null && endTime !== null && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
              <p className="text-blue-800">
                <strong>Selected Segment:</strong>{' '}
                {Math.floor(startTime / 60)}:{Math.floor(startTime % 60).toString().padStart(2, '0')} - {Math.floor(endTime / 60)}:{Math.floor(endTime % 60).toString().padStart(2, '0')}{' '}
                ({Math.floor((endTime - startTime) / 60)}:{Math.floor((endTime - startTime) % 60).toString().padStart(2, '0')} duration)
              </p>
              <p className="text-blue-600 text-xs mt-1">
                Only frames within this segment will be analyzed for SOP generation.
              </p>
            </div>
          )}

          {/* Upload Progress */}
          {creating && sourceType === 'audio' && uploadProgress > 0 && uploadProgress < 100 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading audio...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          <Button
            className="w-full"
            onClick={handleCreate}
            disabled={creating || !isValid}
          >
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {sourceType === 'audio' && uploadProgress < 100
                  ? 'Uploading...'
                  : 'Creating SOP...'}
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4 mr-2" />
                Generate SOP
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function NewSOPPage() {
  return (
    <Suspense fallback={
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    }>
      <NewSOPForm />
    </Suspense>
  );
}
