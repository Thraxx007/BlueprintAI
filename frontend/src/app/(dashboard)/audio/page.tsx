'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { audioApi } from '@/lib/api';
import { formatFileSize, formatDate } from '@/lib/utils';
import type { AudioSOP } from '@/types';
import { Plus, Trash2, Mic, FileText, Loader2 } from 'lucide-react';

export default function AudioPage() {
  const [audioSOPs, setAudioSOPs] = useState<AudioSOP[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAudioSOPs();
  }, []);

  const loadAudioSOPs = async () => {
    try {
      const response = await audioApi.list();
      setAudioSOPs(response.data.items);
    } catch (error) {
      console.error('Failed to load audio SOPs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (sopId: string) => {
    if (!confirm('Are you sure you want to delete this audio SOP?')) return;
    try {
      await audioApi.delete(sopId);
      loadAudioSOPs();
    } catch (error) {
      console.error('Failed to delete audio SOP:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending_audio: 'bg-yellow-100 text-yellow-800',
      generating: 'bg-blue-100 text-blue-800',
      generated: 'bg-green-100 text-green-800',
      completed: 'bg-green-100 text-green-800',
      error: 'bg-red-100 text-red-800',
    };
    const labels: Record<string, string> = {
      pending_audio: 'Pending',
      generating: 'Generating',
      generated: 'Generated',
      completed: 'Completed',
      error: 'Error',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100'}`}>
        {labels[status] || status}
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
          <h1 className="text-2xl font-bold">Audio</h1>
          <p className="text-gray-600">Upload and manage your audio recordings for SOP generation</p>
        </div>
        <Link href="/audio/upload">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Upload Audio
          </Button>
        </Link>
      </div>

      {audioSOPs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Mic className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium mb-2">No audio files yet</h3>
            <p className="text-gray-500 mb-4">Upload your first audio recording to get started</p>
            <Link href="/audio/upload">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Upload Audio
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {audioSOPs.map((audioSOP) => (
            <Card key={audioSOP.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                      <Mic className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <Link href={`/sops/${audioSOP.id}`} className="font-medium hover:text-blue-600">
                        {audioSOP.title}
                      </Link>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                        {audioSOP.original_filename && (
                          <span>{audioSOP.original_filename}</span>
                        )}
                        {audioSOP.file_size && (
                          <span>{formatFileSize(audioSOP.file_size)}</span>
                        )}
                        <span>{formatDate(audioSOP.created_at)}</span>
                      </div>
                      <div className="mt-2 flex items-center space-x-2">
                        {getStatusBadge(audioSOP.status)}
                        {audioSOP.total_steps > 0 && (
                          <span className="text-xs text-gray-500">
                            {audioSOP.total_steps} steps
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {audioSOP.status === 'pending_audio' && (
                      <Link href={`/audio/${audioSOP.id}/generate`}>
                        <Button variant="outline" size="sm">
                          <FileText className="h-4 w-4 mr-1" />
                          Generate SOP
                        </Button>
                      </Link>
                    )}
                    {(audioSOP.status === 'generated' || audioSOP.status === 'completed') && (
                      <Link href={`/sops/${audioSOP.id}`}>
                        <Button variant="outline" size="sm">
                          View SOP
                        </Button>
                      </Link>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(audioSOP.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {audioSOP.status === 'generating' && (
                  <div className="mt-4">
                    <Progress value={50} />
                    <p className="text-xs text-gray-500 mt-1 flex items-center">
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Generating SOP from audio...
                    </p>
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
