'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { exportsApi } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import type { Export } from '@/types';
import { Download, ExternalLink, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

export default function ExportsPage() {
  const [exports, setExports] = useState<Export[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExports();
  }, []);

  const loadExports = async () => {
    try {
      const response = await exportsApi.list();
      setExports(response.data);
    } catch (error) {
      console.error('Failed to load exports:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'in_progress':
      case 'pending':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getExportTypeName = (type: string) => {
    switch (type) {
      case 'google_docs':
        return 'Google Docs';
      case 'notion':
        return 'Notion';
      case 'pdf':
        return 'PDF';
      default:
        return type;
    }
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
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Export History</h1>
        <p className="text-gray-600">Track your SOP exports to Google Docs and Notion</p>
      </div>

      {exports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Download className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium mb-2">No exports yet</h3>
            <p className="text-gray-500">Export an SOP to see it here</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {exports.map((exp) => (
            <Card key={exp.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(exp.status)}
                    <div>
                      <p className="font-medium">
                        {getExportTypeName(exp.export_type)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDateTime(exp.created_at)}
                      </p>
                      {exp.error_message && (
                        <p className="text-sm text-red-600 mt-1">{exp.error_message}</p>
                      )}
                    </div>
                  </div>
                  {exp.external_url && (
                    <a
                      href={exp.external_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-blue-600 hover:text-blue-700"
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Open
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
