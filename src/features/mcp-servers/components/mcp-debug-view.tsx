'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { listAllTools, callTool } from '@/lib/services/mcp-service';
import { useAppContext } from '@/shared/context';
import {
    Loader2,
    Play,
    RefreshCw,
    Terminal,
    Code2,
    Zap,
    Wrench,
    CheckCircle2,
    AlertCircle,
    ChevronRight,
    Copy,
    Check,
    ServerCog,
    Sparkles
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/shared/hooks';

interface Tool {
    function: {
        name: string;
        description?: string;
        parameters?: {
            properties?: Record<string, {
                type: string;
                description?: string;
                minimum?: number;
                default?: any;
            }>;
            required?: string[];
        };
    };
    serverId?: string;
}

export function McpDebugView() {
    const { mcpServers } = useAppContext();
    const [tools, setTools] = useState<Tool[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
    const [toolArgs, setToolArgs] = useState('{}');
    const [executionResult, setExecutionResult] = useState<string | null>(null);
    const [isExecuting, setIsExecuting] = useState(false);
    const [copied, setCopied] = useState(false);
    const [executionStatus, setExecutionStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const { toast } = useToast();

    const formatExecutionResult = (raw: string) => {
        try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object' && Array.isArray((parsed as any).content)) {
                const textContent = (parsed as any).content
                    .filter((item: any) => item?.type === 'text' && typeof item?.text === 'string')
                    .map((item: any) => item.text)
                    .join('\n');

                if (textContent) {
                    return textContent;
                }
            }

            return JSON.stringify(parsed, null, 2);
        } catch {
            return raw;
        }
    };

    const fetchTools = async () => {
        setIsLoading(true);
        try {
            const fetchedTools = await listAllTools();
            setTools(fetchedTools as Tool[]);
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error fetching tools',
                description: error instanceof Error ? error.message : 'Unknown error'
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (mcpServers.length > 0) {
            fetchTools();
        }
    }, [mcpServers]);

    const handleExecute = async () => {
        if (!selectedTool) return;
        setIsExecuting(true);
        setExecutionResult(null);
        setExecutionStatus('idle');

        try {
            let args = {};
            try {
                args = JSON.parse(toolArgs);
            } catch (e) {
                toast({ variant: 'destructive', title: 'Invalid JSON', description: 'Arguments must be valid JSON' });
                setIsExecuting(false);
                return;
            }

            const serverId = selectedTool.serverId;
            const server = mcpServers.find(s => s.id === serverId);

            if (!server) {
                throw new Error("Could not find server for this tool");
            }

            const result = await callTool(server, {
                id: 'debug',
                type: 'function',
                function: { name: selectedTool.function.name, arguments: args }
            });

            setExecutionResult(formatExecutionResult(result));
            setExecutionStatus('success');
        } catch (error) {
            const errorPayload = JSON.stringify({ error: error instanceof Error ? error.message : String(error) }, null, 2);
            setExecutionResult(formatExecutionResult(errorPayload));
            setExecutionStatus('error');
        } finally {
            setIsExecuting(false);
        }
    };

    const handleCopyResult = () => {
        if (executionResult) {
            navigator.clipboard.writeText(executionResult);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleToolSelect = (tool: Tool) => {
        setSelectedTool(tool);
        const schema = tool.function.parameters;
        let initialArgs = {};
        if (schema?.properties) {
            const required = schema.required || [];
            initialArgs = Object.keys(schema.properties).reduce((acc: Record<string, any>, key) => {
                const prop = schema.properties![key];
                if (required.includes(key)) {
                    if (prop.type === 'string') {
                        acc[key] = prop.default || '';
                    } else if (prop.type === 'number') {
                        acc[key] = prop.minimum || 0;
                    } else if (prop.type === 'boolean') {
                        acc[key] = false;
                    } else if (prop.type === 'object') {
                        acc[key] = {};
                    } else if (prop.type === 'array') {
                        acc[key] = [];
                    }
                }
                return acc;
            }, {});
        }
        setToolArgs(JSON.stringify(initialArgs, null, 2));
        setExecutionResult(null);
        setExecutionStatus('idle');
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'string': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
            case 'number': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'boolean': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
            case 'object': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
            case 'array': return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
            default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        }
    };

    return (
        <Card className="mt-6 overflow-hidden border-0 shadow-xl bg-gradient-to-br from-background via-background to-muted/30">
            {/* Header Section */}
            <div className="relative overflow-hidden">
                {/* Gradient Background */}
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600/10 via-purple-600/10 to-fuchsia-600/10" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-violet-500/10 via-transparent to-transparent" />

                {/* Animated Grid Pattern */}
                <div
                    className="absolute inset-0 opacity-[0.02]"
                    style={{
                        backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px),
                                         linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
                        backgroundSize: '40px 40px'
                    }}
                />

                <div className="relative px-6 py-6 md:px-8 md:py-8">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25">
                                <Terminal className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold tracking-tight md:text-2xl">
                                    Debug Console
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    Inspect and execute MCP tools in real-time
                                </p>
                            </div>
                        </div>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={fetchTools}
                            disabled={isLoading}
                            className="group gap-2 border-violet-500/20 bg-violet-500/5 hover:bg-violet-500/10 hover:border-violet-500/30 transition-all duration-300"
                        >
                            <RefreshCw className={`h-4 w-4 transition-transform duration-500 ${isLoading ? 'animate-spin' : 'group-hover:rotate-180'}`} />
                            <span className="hidden sm:inline">Refresh Tools</span>
                            <span className="sm:hidden">Refresh</span>
                        </Button>
                    </div>

                    {/* Stats Bar */}
                    <div className="mt-6 flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-sm">
                            <Wrench className="h-3.5 w-3.5 text-primary" />
                            <span className="font-medium">{tools.length}</span>
                            <span className="text-muted-foreground">Tools</span>
                        </div>
                        <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 text-sm">
                            <ServerCog className="h-3.5 w-3.5 text-emerald-500" />
                            <span className="font-medium">{mcpServers.length}</span>
                            <span className="text-muted-foreground">Servers</span>
                        </div>
                        {selectedTool && (
                            <div className="flex items-center gap-2 rounded-full bg-violet-500/10 px-3 py-1.5 text-sm animate-in fade-in slide-in-from-left-2 duration-300">
                                <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                                <span className="text-muted-foreground">Selected:</span>
                                <span className="font-medium font-mono text-violet-400">{selectedTool.function.name}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <CardContent className="p-4 md:p-6">
                <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                    {/* Available Tools - Left Panel */}
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                            <Code2 className="h-4 w-4 text-muted-foreground" />
                            <h3 className="font-semibold">Available Tools</h3>
                            <Badge variant="secondary" className="ml-auto text-xs">
                                {tools.length} available
                            </Badge>
                        </div>

                        <div className="h-[450px] rounded-xl border bg-muted/20 backdrop-blur-sm overflow-hidden">
                            {tools.length === 0 ? (
                                <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
                                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
                                        <Terminal className="h-8 w-8 text-muted-foreground/50" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-muted-foreground">No tools found</p>
                                        <p className="mt-1 text-sm text-muted-foreground/70">
                                            Connect an MCP server to see available tools
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <ScrollArea className="h-full">
                                    <div className="space-y-2 p-3">
                                        {tools.map((tool, i) => (
                                            <button
                                                key={i}
                                                className={`group w-full text-left rounded-lg border p-3 transition-all duration-200 ${selectedTool === tool
                                                    ? 'bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-fuchsia-500/10 border-violet-500/30 shadow-lg shadow-violet-500/5 ring-1 ring-violet-500/20'
                                                    : 'bg-card/50 border-border/50 hover:bg-muted/50 hover:border-muted-foreground/20 hover:shadow-md'
                                                    }`}
                                                onClick={() => handleToolSelect(tool)}
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <Zap className={`h-3.5 w-3.5 flex-shrink-0 transition-colors ${selectedTool === tool ? 'text-violet-400' : 'text-muted-foreground group-hover:text-primary'
                                                                }`} />
                                                            <span className="font-mono font-medium text-xs truncate">
                                                                {tool.function.name}
                                                            </span>
                                                        </div>
                                                        {tool.function.description && (
                                                            <p className="mt-1.5 text-[11px] text-muted-foreground line-clamp-1 leading-relaxed pl-5">
                                                                {tool.function.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <ChevronRight className={`h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/50 transition-transform duration-200 ${selectedTool === tool ? 'rotate-90 text-violet-400' : 'group-hover:translate-x-1'
                                                        }`} />
                                                </div>
                                                <div className="mt-2 flex items-center gap-2 pl-5">
                                                    <Badge
                                                        variant="outline"
                                                        className="text-[9px] font-mono bg-background/50 border-border/50 px-1.5 py-0"
                                                    >
                                                        {tool.serverId || 'Unknown'}
                                                    </Badge>
                                                    {tool.function.parameters?.required && tool.function.parameters.required.length > 0 && (
                                                        <Badge
                                                            variant="secondary"
                                                            className="text-[9px] px-1.5 py-0"
                                                        >
                                                            {tool.function.parameters.required.length} params
                                                        </Badge>
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </ScrollArea>
                            )}
                        </div>
                    </div>

                    {/* Execute Tool - Right Panel */}
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                            <Play className="h-4 w-4 text-muted-foreground" />
                            <h3 className="font-semibold">Execute Tool</h3>
                        </div>

                        <div className="h-[450px] rounded-xl border bg-muted/20 backdrop-blur-sm flex flex-col">
                            {selectedTool ? (
                                <ScrollArea className="flex-1 h-0">
                                    <div className="p-4 space-y-3">
                                        {/* Function Header */}
                                        <div className="rounded-lg bg-gradient-to-r from-violet-500/10 via-purple-500/5 to-transparent p-3 border border-violet-500/20">
                                            <div className="flex items-start gap-3">
                                                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-violet-500/20">
                                                    <Zap className="h-4 w-4 text-violet-400" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-mono font-semibold text-sm break-words">
                                                        {selectedTool.function.name}
                                                    </h4>
                                                    {selectedTool.function.description && (
                                                        <p className="mt-1 text-[11px] text-muted-foreground break-words">
                                                            {selectedTool.function.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Schema Display */}
                                        {selectedTool.function.parameters?.properties && Object.keys(selectedTool.function.parameters.properties).length > 0 && (
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                                    <Code2 className="h-3 w-3" />
                                                    Parameters
                                                </label>
                                                <div className="max-h-[120px] overflow-y-auto rounded-lg border bg-background/50 p-2.5 space-y-1.5">
                                                    {Object.entries(selectedTool.function.parameters.properties).map(([key, prop]) => (
                                                        <div key={key} className="flex flex-wrap items-center gap-1.5 text-[11px]">
                                                            <span className="font-mono font-semibold text-foreground">{key}</span>
                                                            <Badge
                                                                variant="outline"
                                                                className={`text-[9px] h-4 px-1.5 border ${getTypeColor(prop.type)}`}
                                                            >
                                                                {prop.type}
                                                            </Badge>
                                                            {selectedTool.function.parameters?.required?.includes(key) && (
                                                                <Badge className="text-[9px] h-4 px-1.5 bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                                                    required
                                                                </Badge>
                                                            )}
                                                            {prop.description && (
                                                                <span className="text-muted-foreground text-[10px] w-full mt-0.5 leading-relaxed break-words">
                                                                    {prop.description}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Arguments Input */}
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                                <Terminal className="h-3 w-3" />
                                                Arguments (JSON)
                                            </label>
                                            <Textarea
                                                className="font-mono text-xs h-[70px] resize-none bg-background/80 border-border/50 focus:border-violet-500/50 focus:ring-violet-500/20 transition-colors"
                                                value={toolArgs}
                                                onChange={(e) => setToolArgs(e.target.value)}
                                                placeholder='{"param": "value"}'
                                            />
                                        </div>

                                        {/* Execute Button */}
                                        <Button
                                            onClick={handleExecute}
                                            disabled={isExecuting}
                                            className="w-full gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 shadow-lg shadow-violet-500/25 transition-all duration-300 hover:shadow-violet-500/40 hover:scale-[1.01] active:scale-[0.99]"
                                            size="default"
                                        >
                                            {isExecuting ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    Executing...
                                                </>
                                            ) : (
                                                <>
                                                    <Play className="h-4 w-4" />
                                                    Execute Tool
                                                </>
                                            )}
                                        </Button>

                                        {/* Response Section */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                                    {executionStatus === 'success' && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                                                    {executionStatus === 'error' && <AlertCircle className="h-3 w-3 text-rose-500" />}
                                                    Response
                                                </label>
                                                {executionResult && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={handleCopyResult}
                                                        className="h-5 gap-1 text-[10px] text-muted-foreground hover:text-foreground px-2"
                                                    >
                                                        {copied ? (
                                                            <>
                                                                <Check className="h-3 w-3 text-emerald-500" />
                                                                Copied!
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Copy className="h-3 w-3" />
                                                                Copy
                                                            </>
                                                        )}
                                                    </Button>
                                                )}
                                            </div>
                                            <div className={`h-[100px] rounded-lg border overflow-hidden transition-colors ${executionStatus === 'success' ? 'border-emerald-500/30 bg-emerald-500/5' :
                                                executionStatus === 'error' ? 'border-rose-500/30 bg-rose-500/5' :
                                                    'border-border/50 bg-background/50'
                                                }`}>
                                                {executionResult ? (
                                                    <ScrollArea className="h-[100px]">
                                                        <pre className="p-2.5 text-[11px] font-mono whitespace-pre-wrap break-words leading-relaxed">
                                                            {executionResult}
                                                        </pre>
                                                    </ScrollArea>
                                                ) : (
                                                    <div className="h-full flex items-center justify-center">
                                                        <p className="text-[11px] text-muted-foreground italic">
                                                            Response will appear here
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </ScrollArea>
                            ) : (
                                <div className="h-full flex items-center justify-center">
                                    <div className="text-center p-6 max-w-xs">
                                        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/20">
                                            <Wrench className="h-7 w-7 text-violet-400/50" />
                                        </div>
                                        <p className="font-medium text-muted-foreground text-sm">No tool selected</p>
                                        <p className="mt-1.5 text-xs text-muted-foreground/70">
                                            Select a tool from the list to view its parameters and execute it
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
