'use client';

import { useEffect, useState } from 'react';
import { useAppContext } from '@/shared/context';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { HardDrive, Trash2, ChevronDown } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/shared/hooks';

export function ChatHeader() {
  const {
    providers,
    selectedProviderId,
    setSelectedProviderId,
    selectedModel,
    setSelectedModel,
    mcpServers,
    selectedMcpServerIds,
    setSelectedMcpServerIds,
    clearChat,
    messages
  } = useAppContext();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const selectedProvider = providers.find(p => p.id === selectedProviderId);
  const selectedServers = mcpServers.filter(s => selectedMcpServerIds.includes(s.id));

  useEffect(() => {
    if (!selectedProviderId && providers.length > 0) {
      setSelectedProviderId(providers[0].id);
    }
  }, [providers, selectedProviderId, setSelectedProviderId]);

  useEffect(() => {
    if (selectedProvider && (!selectedModel || !selectedProvider.models.includes(selectedModel))) {
      setSelectedModel(selectedProvider.models[0] || null);
    }
  }, [selectedProvider, selectedModel, setSelectedModel]);

  const handleProviderChange = (providerId: string) => {
    setSelectedProviderId(providerId);
    const provider = providers.find(p => p.id === providerId);
    if (provider) {
      setSelectedModel(provider.models[0] || null);
    }
  };

  const handleMcpServerToggle = (serverId: string) => {
    setSelectedMcpServerIds(
      selectedMcpServerIds.includes(serverId)
        ? selectedMcpServerIds.filter(id => id !== serverId)
        : [...selectedMcpServerIds, serverId]
    );
  };

  const handleClearChat = () => {
    clearChat();
    toast({ title: "Chat Cleared", description: "A new chat session has started." });
  }

  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 border-b bg-background/95 sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full md:w-auto">
        <Select value={selectedProviderId ?? ''} onValueChange={handleProviderChange}>
          <SelectTrigger className="w-full sm:w-[180px] text-xs sm:text-sm">
            <SelectValue placeholder="Select Provider" />
          </SelectTrigger>
          <SelectContent>
            {providers.map(provider => (
              <SelectItem key={provider.id} value={provider.id}>
                {provider.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedModel ?? ''} onValueChange={setSelectedModel} disabled={!selectedProvider}>
          <SelectTrigger className="w-full sm:w-[180px] text-xs sm:text-sm">
            <SelectValue placeholder="Select Model" />
          </SelectTrigger>
          <SelectContent>
            {selectedProvider?.models.map(model => (
              <SelectItem key={model} value={model}>
                {model}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="col-span-2 sm:col-span-1 flex items-center w-full sm:w-auto">
          <div className="p-2 border border-r-0 rounded-l-md bg-muted/50 hidden sm:block">
            <HardDrive className="size-5 text-muted-foreground" />
          </div>
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full sm:w-[160px] sm:rounded-l-none justify-between text-xs sm:text-sm h-10 px-3"
              >
                <span className="truncate flex-1 text-left">
                  {selectedMcpServerIds.length === 0
                    ? 'No MCP Servers'
                    : `${selectedMcpServerIds.length} server${selectedMcpServerIds.length !== 1 ? 's' : ''}`}
                </span>
                <ChevronDown className="h-4 w-4 ml-2 opacity-50 flex-shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[80vw] sm:w-64 p-0" align="start">
              <div className="p-4">
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {mcpServers.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No MCP servers available</p>
                  ) : (
                    mcpServers.map(server => (
                      <div key={server.id} className="flex items-center space-x-2 p-1 hover:bg-muted/50 rounded-md transition-colors">
                        <Checkbox
                          id={`server-${server.id}`}
                          checked={selectedMcpServerIds.includes(server.id)}
                          onCheckedChange={() => handleMcpServerToggle(server.id)}
                        />
                        <label
                          htmlFor={`server-${server.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1 py-1"
                        >
                          {server.name}
                        </label>
                        <Badge variant="outline" className="text-[10px] h-5 px-1">{server.type}</Badge>
                      </div>
                    ))
                  )}
                </div>
                {selectedMcpServerIds.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex flex-wrap gap-2">
                      {selectedServers.map(server => (
                        <Badge
                          key={server.id}
                          variant="secondary"
                          className="text-xs"
                        >
                          {server.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="w-full md:w-auto text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20" disabled={messages.length === 0}>
              <Trash2 className="mr-2 h-4 w-4" />
              <span className="md:hidden lg:inline">Clear Chat</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear Chat History?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the current chat history. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleClearChat} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
