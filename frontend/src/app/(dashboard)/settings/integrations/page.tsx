'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { integrationsApi } from '@/lib/api';
import type { Integration } from '@/types';
import { Check, X, ExternalLink, Loader2 } from 'lucide-react';

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      const response = await integrationsApi.list();
      setIntegrations(response.data);
    } catch (error) {
      console.error('Failed to load integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (provider: string) => {
    setConnecting(provider);
    try {
      const response =
        provider === 'google'
          ? await integrationsApi.connectGoogle()
          : await integrationsApi.connectNotion();

      // Redirect to OAuth URL
      window.location.href = response.data.auth_url;
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to connect');
      setConnecting(null);
    }
  };

  const handleDisconnect = async (provider: string) => {
    if (!confirm(`Are you sure you want to disconnect ${provider}?`)) return;

    try {
      await integrationsApi.disconnect(provider);
      loadIntegrations();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to disconnect');
    }
  };

  const getIntegration = (provider: string) =>
    integrations.find((i) => i.provider === provider);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Integrations</h1>
        <p className="text-gray-600">Connect your accounts to export SOPs</p>
      </div>

      <div className="space-y-4">
        {/* Google */}
        <IntegrationCard
          name="Google"
          description="Export SOPs to Google Docs with formatted text and images"
          icon={
            <svg className="h-8 w-8" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          }
          integration={getIntegration('google')}
          onConnect={() => handleConnect('google')}
          onDisconnect={() => handleDisconnect('google')}
          connecting={connecting === 'google'}
        />

        {/* Notion */}
        <IntegrationCard
          name="Notion"
          description="Export SOPs to Notion pages with rich formatting"
          icon={
            <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none">
              <path
                d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.98-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466l1.823 1.447zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.166V6.354c0-.606-.233-.933-.748-.886l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952l1.449.327s0 .84-1.168.84l-3.224.187c-.093-.187 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.458-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.887.747-.933l3.22-.187z"
                fill="currentColor"
              />
            </svg>
          }
          integration={getIntegration('notion')}
          onConnect={() => handleConnect('notion')}
          onDisconnect={() => handleDisconnect('notion')}
          connecting={connecting === 'notion'}
        />
      </div>
    </div>
  );
}

function IntegrationCard({
  name,
  description,
  icon,
  integration,
  onConnect,
  onDisconnect,
  connecting,
}: {
  name: string;
  description: string;
  icon: React.ReactNode;
  integration?: Integration;
  onConnect: () => void;
  onDisconnect: () => void;
  connecting: boolean;
}) {
  const isConnected = integration?.connected;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {icon}
            <div>
              <h3 className="font-semibold flex items-center">
                {name}
                {isConnected && (
                  <span className="ml-2 flex items-center text-green-600 text-sm font-normal">
                    <Check className="h-4 w-4 mr-1" />
                    Connected
                  </span>
                )}
              </h3>
              <p className="text-sm text-gray-500">{description}</p>
            </div>
          </div>
          {isConnected ? (
            <Button variant="outline" onClick={onDisconnect}>
              <X className="h-4 w-4 mr-2" />
              Disconnect
            </Button>
          ) : (
            <Button onClick={onConnect} disabled={connecting}>
              {connecting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4 mr-2" />
              )}
              Connect
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
