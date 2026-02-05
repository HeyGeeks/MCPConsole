'use client';

import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, RefreshCcw, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import type { MCPServer } from '../types';
import { getMcpStatus } from '@/lib/services/mcp-service';

interface McpServerListProps {
  servers: MCPServer[];
  onEdit: (server: MCPServer) => void;
  onDelete: (id: string) => void;
  onAuthorize?: (server: MCPServer, connectUrl?: string) => void;
  authorizingServerId?: string | null;
  processingAuthServerId?: string | null;
}

export const McpServerList = forwardRef<{ refresh: () => void }, McpServerListProps>(
  ({ servers, onEdit, onDelete, onAuthorize, authorizingServerId, processingAuthServerId }, ref) => {
    const [statuses, setStatuses] = useState<Record<string, any>>({});

    const fetchStatus = async () => {
      try {
        const result = await getMcpStatus();
        const statusMap = result.reduce((acc: any, curr: any) => {
          acc[curr.id] = curr;
          return acc;
        }, {});
        setStatuses(statusMap);
      } catch (e) {
        console.error("Failed to fetch status", e);
      }
    };

    // Expose refresh function via ref
    useImperativeHandle(ref, () => ({
      refresh: fetchStatus
    }));

    useEffect(() => {
      if (servers.length > 0) {
        fetchStatus();
        const interval = setInterval(fetchStatus, 5000);
        return () => clearInterval(interval);
      }
    }, [servers]);

  if (servers.length === 0) {
    return <div className="text-center text-muted-foreground p-8 border rounded-lg">No MCP servers configured. Add one to get started.</div>
  }

  return (
    <div className="border rounded-lg">
      <div className="flex justify-end p-2 bg-muted/20 border-b">
        <Button variant="ghost" size="sm" onClick={fetchStatus} className="h-6 text-xs">
          <RefreshCcw className="mr-1 h-3 w-3" /> Refresh Status
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Transport</TableHead>
            <TableHead>Config</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {servers.map((server) => {
            const config = JSON.parse(server.config || '{}');
            const displayConfig = config.url || 'N/A';

            const status = statuses[server.id]?.status || 'disconnected';
            const error = statuses[server.id]?.error;
            const needsAuth = status === 'auth_required' || error?.includes('authorize') || error?.includes('token expired');
            const connectUrl = statuses[server.id]?.connectUrl;

            // Check if this server is currently being authorized or processed
            const isAuthorizing = authorizingServerId === server.id;
            const isProcessingAuth = processingAuthServerId === server.id;
            const isAuthInProgress = isAuthorizing || isProcessingAuth;

            return (
              <TableRow key={server.id}>
                <TableCell className="font-medium">{server.name}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      {isProcessingAuth ? (
                        <Badge
                          variant="secondary"
                          className="bg-blue-500 hover:bg-blue-600 text-white border-blue-600"
                        >
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          Connecting...
                        </Badge>
                      ) : isAuthorizing ? (
                        <Badge
                          variant="secondary"
                          className="bg-blue-500 hover:bg-blue-600 text-white border-blue-600"
                        >
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          Waiting for auth...
                        </Badge>
                      ) : (
                        <Badge
                          variant={status === 'connected' ? 'default' : status === 'error' ? 'destructive' : 'secondary'}
                          className={status === 'auth_required' ? 'bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-600' : ''}
                        >
                          {status === 'auth_required' ? 'Auth Required' : status}
                        </Badge>
                      )}
                      {error && status !== 'auth_required' && !isAuthInProgress && <span className="text-xs text-destructive truncate max-w-[150px]" title={error}>(Error)</span>}
                    </div>
                    {needsAuth && !isAuthInProgress && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                          if (onAuthorize) {
                            onAuthorize(server, connectUrl);
                          } else if (connectUrl) {
                            window.open(connectUrl, '_blank');
                          }
                        }}
                        className="h-7 text-xs w-full bg-yellow-600 hover:bg-yellow-700 text-white"
                      >
                        {connectUrl ? 'Login to Server' : 'Authorize'}
                      </Button>
                    )}
                    {isAuthorizing && (
                      <p className="text-xs text-muted-foreground">
                        Complete authorization in popup window...
                      </p>
                    )}
                    {isProcessingAuth && (
                      <p className="text-xs text-muted-foreground">
                        Finishing authorization and connecting...
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell><Badge variant="outline">{server.type}</Badge></TableCell>
                <TableCell className="font-mono text-xs max-w-md truncate" title={displayConfig}>{displayConfig}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(server)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete this MCP server.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDelete(server.id)}>Continue</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
  }
);
McpServerList.displayName = 'McpServerList';