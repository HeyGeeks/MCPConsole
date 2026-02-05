'use client';

import { useForm, Controller } from 'react-hook-form';
import type { MCPServer } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useState, useEffect } from 'react';
import { useToast } from '@/shared/hooks';
import { Loader2, CheckCircle2, XCircle, Wand2 } from 'lucide-react';

interface McpServerFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Omit<MCPServer, 'id'> | MCPServer) => void;
  server?: MCPServer;
}

interface FormValues {
  name: string;
  type: 'http' | 'sse' | 'http-direct';
  url?: string;
  command?: string;
  args?: string;
  env?: string;
  headers?: string;
  useOAuth2?: boolean;
  oauth2ClientId?: string;
  oauth2ClientSecret?: string;
  oauth2TokenUrl?: string;
  oauth2AuthUrl?: string;
  oauth2Scope?: string;
  oauth2RegistrationUrl?: string;
}

export function McpServerForm({
  isOpen,
  onOpenChange,
  onSubmit,
  server,
}: McpServerFormProps) {
  const { toast } = useToast();

  const parseConfig = (server: MCPServer | undefined): FormValues => {
    if (!server) return {
      name: '',
      type: 'sse',
      args: '[]',
      env: '{}',
      headers: '{}',
      useOAuth2: false,
      oauth2ClientId: '',
      oauth2ClientSecret: '',
      oauth2TokenUrl: '',
      oauth2AuthUrl: '',
      oauth2Scope: '',
      oauth2RegistrationUrl: ''
    };

    const config = JSON.parse(server.config || '{}');
    return {
      name: server.name,
      type: server.type as any,
      url: config.url || '',
      command: config.command || '',
      args: JSON.stringify(config.args || []),
      env: JSON.stringify(config.env || {}),
      headers: JSON.stringify(config.headers || {}),
      useOAuth2: !!config.oauth2,
      oauth2ClientId: config.oauth2?.clientId || '',
      oauth2ClientSecret: config.oauth2?.clientSecret || '',
      oauth2TokenUrl: config.oauth2?.tokenUrl || '',
      oauth2AuthUrl: config.oauth2?.authUrl || '',
      oauth2Scope: config.oauth2?.scope || '',
      oauth2RegistrationUrl: config.oauth2?.registrationUrl || ''
    }
  }

  const { register, handleSubmit, control, formState: { errors }, reset, watch, setValue } = useForm<FormValues>({
    defaultValues: parseConfig(server)
  });

  useEffect(() => {
    if (server) {
      const values = parseConfig(server);
      reset(values);
    } else {
      reset({
        name: '',
        type: 'sse',
        args: '[]',
        env: '{}',
        headers: '{}',
        useOAuth2: false,
        oauth2ClientId: '',
        oauth2ClientSecret: '',
        oauth2TokenUrl: '',
        oauth2AuthUrl: '',
        oauth2Scope: '',
        oauth2RegistrationUrl: ''
      });
    }
  }, [server, reset]);

  const useOAuth2 = watch('useOAuth2');

  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryStatus, setDiscoveryStatus] = useState<'idle' | 'success' | 'failed'>('idle');
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);

  // Auto-discover OAuth from the main URL field
  const handleAutoDiscoverOAuth = async () => {
    const serverUrl = watch('url');
    if (!serverUrl) {
      setDiscoveryError('Please enter the MCP server URL first');
      setDiscoveryStatus('failed');
      return;
    }

    setIsDiscovering(true);
    setDiscoveryError(null);
    setDiscoveryStatus('idle');

    try {
      // Extract origin from URL for discovery
      let baseUrl: string;
      try {
        const url = new URL(serverUrl);
        baseUrl = url.origin;
      } catch {
        baseUrl = serverUrl;
      }

      const response = await fetch('/api/mcp/discover-oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.details || result.error);
      }

      // Auto-fill all discovered OAuth fields
      if (result.discovery.tokenEndpoint) {
        setValue('oauth2TokenUrl', result.discovery.tokenEndpoint);
      }
      if (result.discovery.authorizationEndpoint) {
        setValue('oauth2AuthUrl', result.discovery.authorizationEndpoint);
      }
      if (result.discovery.registrationUrl) {
        setValue('oauth2RegistrationUrl', result.discovery.registrationUrl);
      }
      if (result.discovery.scopesSupported?.length > 0) {
        setValue('oauth2Scope', result.discovery.scopesSupported.join(' '));
      }

      setDiscoveryStatus('success');
      toast({
        title: "OAuth Discovery Successful",
        description: (
          <div className="mt-2 text-xs space-y-1">
            <p><strong>Token URL:</strong> {result.discovery.tokenEndpoint}</p>
            <p><strong>Auth URL:</strong> {result.discovery.authorizationEndpoint || 'N/A'}</p>
            {result.discovery.registrationUrl && (
              <p><strong>Registration:</strong> Available (DCR supported)</p>
            )}
            {result.discovery.scopesSupported?.length > 0 && (
              <p><strong>Scopes:</strong> {result.discovery.scopesSupported.join(', ')}</p>
            )}
          </div>
        ),
      });
    } catch (error: any) {
      setDiscoveryError(error.message);
      setDiscoveryStatus('failed');
      toast({
        title: "OAuth Discovery Failed",
        description: "Could not auto-discover OAuth endpoints. Please enter them manually below.",
        variant: "destructive"
      });
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleFormSubmit = (data: FormValues) => {
    try {
      let config: any = {};

      config = {
        url: data.url,
        headers: data.headers ? JSON.parse(data.headers) : {}
      };

      // Add OAuth2 configuration if enabled
      if (data.useOAuth2) {
        config.oauth2 = {
          clientId: data.oauth2ClientId || undefined,
          clientSecret: data.oauth2ClientSecret || undefined,
          tokenUrl: data.oauth2TokenUrl || undefined,
          authUrl: data.oauth2AuthUrl || undefined,
          scope: data.oauth2Scope || undefined,
          registrationUrl: data.oauth2RegistrationUrl || undefined,
          // Always enable auto-discover at runtime for flexibility
          autoDiscover: true
        };
      }

      const payload: Omit<MCPServer, 'id'> | MCPServer = {
        name: data.name,
        type: data.type,
        config: JSON.stringify(config)
      };

      if (server?.id) {
        (payload as MCPServer).id = server.id;
      }

      onSubmit(payload);

      reset();
      onOpenChange(false);
    } catch (e) {
      toast({
        title: "Configuration Error",
        description: "Invalid JSON in arguments, environment variables, or headers.",
        variant: "destructive"
      });
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      reset();
      setDiscoveryStatus('idle');
      setDiscoveryError(null);
    }
    onOpenChange(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{server ? 'Edit' : 'Add'} MCP Server</DialogTitle>
          <DialogDescription>
            Configure your MCP server connection.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name">Server Name</Label>
            <Input id="name" {...register('name', { required: 'Name is required' })} />
            {errors.name && <p className="text-destructive text-sm mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <Label htmlFor="type">Transport Type</Label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select transport type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sse">SSE (Server-Sent Events)</SelectItem>
                    <SelectItem value="http-direct">Direct HTTP (POST)</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div>
            <Label htmlFor="url">MCP Server URL</Label>
            <Input
              id="url"
              placeholder="https://your-mcp-server.com/mcp"
              {...register('url', { required: 'URL is required' })}
            />
            {errors.url && <p className="text-destructive text-sm mt-1">{errors.url.message}</p>}
          </div>

          <div>
            <Label htmlFor="headers">Custom Headers (JSON)</Label>
            <Textarea
              id="headers"
              className="font-mono text-xs min-h-[80px]"
              placeholder='{"Authorization": "Bearer <TOKEN>"}'
              {...register('headers')}
            />
            <p className="text-xs text-muted-foreground mt-1">Optional. Use for API keys or custom auth headers.</p>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Controller
              name="useOAuth2"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="useOAuth2"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <Label htmlFor="useOAuth2" className="text-sm font-normal cursor-pointer">
              Use OAuth2 Authentication
            </Label>
          </div>

          {useOAuth2 && (
            <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">OAuth2 Configuration</p>
                <Button
                  type="button"
                  onClick={handleAutoDiscoverOAuth}
                  disabled={isDiscovering}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  {isDiscovering ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Discovering...
                    </>
                  ) : discoveryStatus === 'success' ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Discovered
                    </>
                  ) : discoveryStatus === 'failed' ? (
                    <>
                      <XCircle className="h-4 w-4 text-red-500" />
                      Retry Discovery
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4" />
                      Auto-Discover
                    </>
                  )}
                </Button>
              </div>

              {discoveryStatus === 'success' && (
                <p className="text-xs text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-400 p-2 rounded">
                  ✓ OAuth endpoints auto-discovered from server. You can modify them below if needed.
                </p>
              )}

              {discoveryError && (
                <p className="text-xs text-destructive bg-destructive/10 p-2 rounded">
                  {discoveryError}. Please enter the OAuth details manually.
                </p>
              )}

              <div>
                <Label htmlFor="oauth2AuthUrl">Authorization URL</Label>
                <Input
                  id="oauth2AuthUrl"
                  placeholder="https://server.com/oauth/authorize"
                  {...register('oauth2AuthUrl')}
                />
              </div>

              <div>
                <Label htmlFor="oauth2TokenUrl">Token URL</Label>
                <Input
                  id="oauth2TokenUrl"
                  placeholder="https://server.com/oauth/token"
                  {...register('oauth2TokenUrl')}
                />
              </div>

              <div>
                <Label htmlFor="oauth2ClientId">Client ID</Label>
                <Input
                  id="oauth2ClientId"
                  placeholder="your-client-id (leave empty for DCR)"
                  {...register('oauth2ClientId')}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave empty to use Dynamic Client Registration if supported.
                </p>
              </div>

              <div>
                <Label htmlFor="oauth2ClientSecret">Client Secret (Optional)</Label>
                <Input
                  id="oauth2ClientSecret"
                  type="password"
                  placeholder="your-client-secret"
                  {...register('oauth2ClientSecret')}
                />
                <p className="text-xs text-muted-foreground mt-1">Leave empty for PKCE flow.</p>
              </div>

              <div>
                <Label htmlFor="oauth2Scope">Scopes</Label>
                <Input
                  id="oauth2Scope"
                  placeholder="openid email profile"
                  {...register('oauth2Scope')}
                />
                <p className="text-xs text-muted-foreground mt-1">Space-separated scopes.</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">Cancel</Button>
            </DialogClose>
            <Button type="submit">Save Server</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
