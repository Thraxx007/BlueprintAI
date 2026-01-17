'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { sopsApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { SOP } from '@/types';
import { Plus, FileText, Trash2, ExternalLink, Loader2, Video, Mic } from 'lucide-react';

export default function SOPsPage() {
  const [sops, setSOPs] = useState<SOP[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSOPs();
  }, []);

  const loadSOPs = async () => {
    try {
      const response = await sopsApi.list();
      setSOPs(response.data.sops);
    } catch (error) {
      console.error('Failed to load SOPs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (sopId: string) => {
    if (!confirm('Are you sure you want to delete this SOP?')) return;
    try {
      await sopsApi.delete(sopId);
      loadSOPs();
    } catch (error) {
      console.error('Failed to delete SOP:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      pending_audio: 'bg-yellow-100 text-yellow-800',
      generating: 'bg-blue-100 text-blue-800',
      generated: 'bg-green-100 text-green-800',
      completed: 'bg-green-100 text-green-800',
      error: 'bg-red-100 text-red-800',
    };
    const displayStatus = status === 'generated' ? 'completed' : status;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100'}`}>
        {status === 'generating' && <Loader2 className="h-3 w-3 inline mr-1 animate-spin" />}
        {displayStatus}
      </span>
    );
  };

  const getSourceIcon = (sop: SOP) => {
    const isAudio = sop.generation_metadata?.source === 'audio';
    return isAudio ? (
      <span className="flex items-center text-xs text-purple-600" title="Generated from audio">
        <Mic className="h-3 w-3 mr-1" />
        Audio
      </span>
    ) : sop.video_id ? (
      <span className="flex items-center text-xs text-blue-600" title="Generated from video">
        <Video className="h-3 w-3 mr-1" />
        Video
      </span>
    ) : null;
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
          <h1 className="text-2xl font-bold">SOPs</h1>
          <p className="text-gray-600">Your Standard Operating Procedures</p>
        </div>
        <Link href="/sops/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create SOP
          </Button>
        </Link>
      </div>

      {sops.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium mb-2">No SOPs yet</h3>
            <p className="text-gray-500 mb-4">Create your first SOP from a processed video</p>
            <Link href="/sops/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create SOP
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sops.map((sop) => (
            <Card key={sop.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Link href={`/sops/${sop.id}`} className="text-lg font-medium hover:text-blue-600">
                      {sop.title}
                    </Link>
                    {sop.description && (
                      <p className="text-gray-500 text-sm mt-1 line-clamp-1">{sop.description}</p>
                    )}
                    <div className="flex items-center space-x-4 mt-2">
                      {getStatusBadge(sop.status)}
                      {getSourceIcon(sop)}
                      <span className="text-sm text-gray-500">
                        {sop.total_steps} steps
                      </span>
                      <span className="text-sm text-gray-500">
                        {formatDate(sop.created_at)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {(sop.status === 'completed' || sop.status === 'generated') && (
                      <Link href={`/sops/${sop.id}`}>
                        <Button variant="outline" size="sm">
                          <ExternalLink className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </Link>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(sop.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
