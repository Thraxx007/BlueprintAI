'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { audioApi } from '@/lib/api';
import { formatFileSize } from '@/lib/utils';
import { Upload, Mic, X, CheckCircle, AlertCircle } from 'lucide-react';

export default function AudioUploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [userContext, setUserContext] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [uploaded, setUploaded] = useState(false);
  const [sopId, setSopId] = useState('');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setError('');
      // Auto-fill title from filename if empty
      if (!title) {
        const filename = acceptedFiles[0].name;
        const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
        setTitle(nameWithoutExt);
      }
    }
  }, [title]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.mp3', '.wav', '.m4a', '.ogg', '.flac', '.aac'],
    },
    maxFiles: 1,
    maxSize: 500 * 1024 * 1024, // 500MB
  });

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(0);
    setError('');

    try {
      const response = await audioApi.upload(
        file,
        {
          title: title || undefined,
          description: description || undefined,
          user_context: userContext || undefined,
        },
        (p) => setProgress(p)
      );
      setSopId(response.data.sop_id);
      setUploaded(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleGenerate = async () => {
    try {
      await audioApi.generate(sopId);
      router.push(`/sops/${sopId}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to start generation');
    }
  };

  const removeFile = () => {
    setFile(null);
    setProgress(0);
    setError('');
    setUploaded(false);
  };

  if (uploaded) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Upload Complete!</h3>
            <p className="text-gray-500 mb-6">Your audio has been uploaded successfully</p>
            <div className="flex space-x-4">
              <Button onClick={handleGenerate}>
                Generate SOP
              </Button>
              <Button variant="outline" onClick={() => router.push('/audio')}>
                View All Audio
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Upload Audio</h1>
        <p className="text-gray-600">Upload an audio recording to create an SOP from spoken instructions</p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">
          {!file ? (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">
                {isDragActive ? 'Drop your audio here' : 'Drag & drop your audio'}
              </p>
              <p className="text-gray-500 mb-4">or click to browse</p>
              <p className="text-sm text-gray-400">
                Supported formats: MP3, WAV, M4A, OGG, FLAC, AAC (max 500MB)
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Mic className="h-10 w-10 text-blue-500" />
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                {!uploading && (
                  <Button variant="ghost" size="icon" onClick={removeFile}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="SOP title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={uploading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of what this SOP covers"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={uploading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="context">Additional Context (optional)</Label>
                  <Textarea
                    id="context"
                    placeholder="Any additional context to help generate better SOP steps"
                    value={userContext}
                    onChange={(e) => setUserContext(e.target.value)}
                    disabled={uploading}
                  />
                </div>
              </div>

              {uploading && (
                <div className="space-y-2">
                  <Progress value={progress} />
                  <p className="text-sm text-gray-500 text-center">{progress}% uploaded</p>
                </div>
              )}

              {error && (
                <div className="flex items-center space-x-2 p-3 bg-red-50 text-red-600 rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                className="w-full"
                onClick={handleUpload}
                disabled={uploading}
              >
                {uploading ? 'Uploading...' : 'Upload Audio'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2">Tips for best results:</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Speak clearly and at a moderate pace</li>
          <li>Number your steps for easier identification</li>
          <li>Describe each action in detail</li>
          <li>Mention any important warnings or tips</li>
        </ul>
      </div>
    </div>
  );
}
