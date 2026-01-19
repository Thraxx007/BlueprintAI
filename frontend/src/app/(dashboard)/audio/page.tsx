'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { audioLibraryApi } from '@/lib/api';
import { formatFileSize, formatDate } from '@/lib/utils';
import type { AudioFile } from '@/types';
import { Plus, Trash2, Mic, FileText, Loader2, Clock, Languages, FileAudio } from 'lucide-react';

export default function AudioPage() {
  const router = useRouter();
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAudio, setSelectedAudio] = useState<AudioFile | null>(null);
  const [showCreateSOPDialog, setShowCreateSOPDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [sopTitle, setSOPTitle] = useState('');
  const [sopDescription, setSOPDescription] = useState('');
  const [userContext, setUserContext] = useState('');

  useEffect(() => {
    loadAudioFiles();
  }, []);

  const loadAudioFiles = async () => {
    try {
      const response = await audioLibraryApi.list();
      setAudioFiles(response.data.items);
    } catch (error) {
      console.error('Failed to load audio files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (audioId: string) => {
    if (!confirm('Are you sure you want to delete this audio file? SOPs created from it will not be deleted.')) return;
    try {
      await audioLibraryApi.delete(audioId);
      loadAudioFiles();
    } catch (error) {
      console.error('Failed to delete audio file:', error);
    }
  };

  const openCreateSOPDialog = (audio: AudioFile) => {
    setSelectedAudio(audio);
    setSOPTitle(`SOP - ${audio.original_filename}`);
    setSOPDescription('');
    setUserContext('');
    setShowCreateSOPDialog(true);
  };

  const handleCreateSOP = async () => {
    if (!selectedAudio) return;

    setCreating(true);
    try {
      const response = await audioLibraryApi.createSOP({
        audio_file_id: selectedAudio.id,
        title: sopTitle || undefined,
        description: sopDescription || undefined,
        user_context: userContext || undefined,
        detail_level: 'detailed',
      });

      setShowCreateSOPDialog(false);
      router.push(`/sops/${response.data.sop_id}`);
    } catch (error) {
      console.error('Failed to create SOP:', error);
      setCreating(false);
    }
  };

  const getTranscriptionBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-gray-100 text-gray-700',
      transcribing: 'bg-blue-100 text-blue-800',
      transcribed: 'bg-green-100 text-green-800',
      error: 'bg-red-100 text-red-800',
    };
    const labels: Record<string, string> = {
      pending: 'Not Transcribed',
      transcribing: 'Transcribing',
      transcribed: 'Transcribed',
      error: 'Error',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
          <h1 className="text-2xl font-bold">Audio Library</h1>
          <p className="text-gray-600">Upload and manage your audio recordings for SOP generation</p>
        </div>
        <Link href="/audio/upload">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Upload Audio
          </Button>
        </Link>
      </div>

      {audioFiles.length === 0 ? (
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
          {audioFiles.map((audio) => (
            <Card key={audio.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                      <FileAudio className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium">{audio.original_filename}</h3>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                        <span>{formatFileSize(audio.file_size)}</span>
                        {audio.duration_seconds && (
                          <span className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatDuration(audio.duration_seconds)}
                          </span>
                        )}
                        {audio.detected_language && (
                          <span className="flex items-center">
                            <Languages className="h-3 w-3 mr-1" />
                            {audio.detected_language.toUpperCase()}
                          </span>
                        )}
                        <span>{formatDate(audio.upload_date)}</span>
                      </div>
                      <div className="mt-2 flex items-center space-x-2">
                        {getTranscriptionBadge(audio.transcription_status)}
                        {audio.sop_count > 0 && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                            {audio.sop_count} SOP{audio.sop_count !== 1 ? 's' : ''} created
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openCreateSOPDialog(audio)}
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      Create SOP
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(audio.id)}
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

      {/* Create SOP Dialog */}
      <Dialog open={showCreateSOPDialog} onOpenChange={setShowCreateSOPDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create SOP from Audio</DialogTitle>
            <DialogDescription>
              Generate a new Standard Operating Procedure from this audio file.
            </DialogDescription>
          </DialogHeader>
          {selectedAudio && (
            <div className="space-y-4 py-4">
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <FileAudio className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="font-medium text-sm">{selectedAudio.original_filename}</p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(selectedAudio.file_size)}
                    {selectedAudio.duration_seconds && ` • ${formatDuration(selectedAudio.duration_seconds)}`}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">SOP Title</Label>
                <Input
                  id="title"
                  value={sopTitle}
                  onChange={(e) => setSOPTitle(e.target.value)}
                  placeholder="Enter a title for the SOP"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={sopDescription}
                  onChange={(e) => setSOPDescription(e.target.value)}
                  placeholder="Brief description of what this SOP covers"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="context">Additional Context (optional)</Label>
                <Textarea
                  id="context"
                  value={userContext}
                  onChange={(e) => setUserContext(e.target.value)}
                  placeholder="Any additional context to help AI understand the process better"
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateSOPDialog(false)} disabled={creating}>
              Cancel
            </Button>
            <Button onClick={handleCreateSOP} disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Create SOP
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
