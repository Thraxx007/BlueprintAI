'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { videosApi } from '@/lib/api';
import { formatFileSize } from '@/lib/utils';
import { Upload, FileVideo, X, CheckCircle, AlertCircle } from 'lucide-react';

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [uploaded, setUploaded] = useState(false);
  const [videoId, setVideoId] = useState('');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setError('');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.mkv', '.webm'],
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024 * 1024, // 5GB
  });

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(0);
    setError('');

    try {
      const response = await videosApi.upload(file, (p) => setProgress(p));
      setVideoId(response.data.id);
      setUploaded(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleProcess = async () => {
    try {
      await videosApi.process(videoId);
      router.push(`/videos/${videoId}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to start processing');
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
            <p className="text-gray-500 mb-6">Your video has been uploaded successfully</p>
            <div className="flex space-x-4">
              <Button onClick={handleProcess}>
                Process Video
              </Button>
              <Button variant="outline" onClick={() => router.push('/videos')}>
                View All Videos
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
        <h1 className="text-2xl font-bold">Upload Video</h1>
        <p className="text-gray-600">Upload a screen recording to create an SOP</p>
      </div>

      <Card>
        <CardContent className="p-6">
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
                {isDragActive ? 'Drop your video here' : 'Drag & drop your video'}
              </p>
              <p className="text-gray-500 mb-4">or click to browse</p>
              <p className="text-sm text-gray-400">
                Supported formats: MP4, MOV, AVI, MKV, WebM (max 5GB)
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <FileVideo className="h-10 w-10 text-blue-500" />
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
                {uploading ? 'Uploading...' : 'Upload Video'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2">Tips for best results:</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Use high-resolution screen recordings (1080p or higher)</li>
          <li>Keep mouse movements deliberate and visible</li>
          <li>Pause briefly after each click for better detection</li>
          <li>For long recordings, consider uploading in segments</li>
        </ul>
      </div>
    </div>
  );
}
