'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { videosApi } from '@/lib/api';
import { formatDuration, formatFileSize, formatDate } from '@/lib/utils';
import type { Video } from '@/types';
import { Plus, Play, Trash2, Cog, FileVideo } from 'lucide-react';

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      const response = await videosApi.list();
      setVideos(response.data.videos);
    } catch (error) {
      console.error('Failed to load videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async (videoId: string) => {
    try {
      await videosApi.process(videoId);
      loadVideos();
    } catch (error) {
      console.error('Failed to process video:', error);
    }
  };

  const handleDelete = async (videoId: string) => {
    if (!confirm('Are you sure you want to delete this video?')) return;
    try {
      await videosApi.delete(videoId);
      loadVideos();
    } catch (error) {
      console.error('Failed to delete video:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      uploaded: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      processed: 'bg-green-100 text-green-800',
      error: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100'}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Videos</h1>
          <p className="text-gray-600">Upload and manage your screen recordings</p>
        </div>
        <Link href="/videos/upload">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Upload Video
          </Button>
        </Link>
      </div>

      {videos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileVideo className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium mb-2">No videos yet</h3>
            <p className="text-gray-500 mb-4">Upload your first screen recording to get started</p>
            <Link href="/videos/upload">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Upload Video
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {videos.map((video) => (
            <Card key={video.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-32 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Play className="h-8 w-8 text-gray-400" />
                    </div>
                    <div>
                      <Link href={`/videos/${video.id}`} className="font-medium hover:text-blue-600">
                        {video.original_filename}
                      </Link>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                        {video.duration_seconds && (
                          <span>{formatDuration(video.duration_seconds)}</span>
                        )}
                        <span>{formatFileSize(video.file_size)}</span>
                        <span>{formatDate(video.created_at)}</span>
                      </div>
                      <div className="mt-2 flex items-center space-x-2">
                        {getStatusBadge(video.status)}
                        {video.frame_count > 0 && (
                          <span className="text-xs text-gray-500">
                            {video.frame_count} frames
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {video.status === 'uploaded' && (
                      <Button variant="outline" size="sm" onClick={() => handleProcess(video.id)}>
                        <Cog className="h-4 w-4 mr-1" />
                        Process
                      </Button>
                    )}
                    {video.status === 'processed' && (
                      <Link href={`/sops/new?video_id=${video.id}`}>
                        <Button variant="outline" size="sm">
                          Create SOP
                        </Button>
                      </Link>
                    )}
                    <Link href={`/videos/${video.id}`}>
                      <Button variant="ghost" size="sm">View</Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(video.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {video.status === 'processing' && (
                  <div className="mt-4">
                    <Progress value={30} />
                    <p className="text-xs text-gray-500 mt-1">Processing video...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
