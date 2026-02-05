'use client';

import type { Message } from '../types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/shared/utils';
import { Bot, User, CircleDashed, Wrench } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ToolResult } from './tool-result';

interface ChatMessageProps {
  message: Message;
  isLoading: boolean;
}

export function ChatMessage({ message, isLoading }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isTool = message.role === 'tool';
  const toolName = message.tool_call_id ? 'Tool Result' : 'Unknown Tool';

  if (isTool) {
    return <ToolResult toolName={toolName} result={message.content} />
  }

  return (
    <div className={cn('flex items-start gap-3 w-full animate-in fade-in slide-in-from-bottom-2 duration-300', isUser && 'flex-row-reverse')}>
      {!isUser && (
        <Avatar className="h-8 w-8 border border-border flex-shrink-0 mt-1 shadow-sm">
          <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
            <Bot className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          'max-w-[90%] md:max-w-[80%] rounded-2xl px-5 py-3.5 text-sm shadow-md transition-all',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-card border border-border/60 hover:border-border'
        )}
      >
        <div className="space-y-3">
          {message.content && (
            <div className="prose prose-sm dark:prose-invert max-w-none break-words leading-relaxed">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ node, ...props }) => <h1 className="text-lg font-bold mb-2" {...props} />,
                  h2: ({ node, ...props }) => <h2 className="text-base font-bold mb-1.5" {...props} />,
                  h3: ({ node, ...props }) => <h3 className="text-sm font-bold mb-1" {...props} />,
                  p: ({ node, ...props }) => <p className="mb-2 leading-relaxed" {...props} />,
                  ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-2 space-y-1" {...props} />,
                  ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-2 space-y-1" {...props} />,
                  li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                  // Table components for GFM
                  table: ({ node, ...props }) => (
                    <div className="overflow-x-auto my-4 rounded-lg border border-border/60 shadow-sm">
                      <table className="min-w-full divide-y divide-border text-sm" {...props} />
                    </div>
                  ),
                  thead: ({ node, ...props }) => (
                    <thead className="bg-muted/50" {...props} />
                  ),
                  tbody: ({ node, ...props }) => (
                    <tbody className="divide-y divide-border/50 bg-card" {...props} />
                  ),
                  tr: ({ node, ...props }) => (
                    <tr className="hover:bg-muted/30 transition-colors" {...props} />
                  ),
                  th: ({ node, ...props }) => (
                    <th className="px-4 py-2.5 text-left font-semibold text-foreground whitespace-nowrap" {...props} />
                  ),
                  td: ({ node, ...props }) => (
                    <td className="px-4 py-2 text-muted-foreground whitespace-nowrap" {...props} />
                  ),
                  code({ node, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '')
                    return match ? (
                      <div className="relative rounded-md overflow-hidden my-3 border border-border/50 shadow-sm">
                        <div className="bg-muted/50 px-3 py-1.5 text-xs font-mono text-muted-foreground border-b border-border/50 flex items-center justify-between">
                          <span>{match[1]}</span>
                        </div>
                        <SyntaxHighlighter
                          style={vscDarkPlus as any}
                          language={match[1]}
                          PreTag="div"
                          customStyle={{ margin: 0, borderRadius: 0 }}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      </div>
                    ) : (
                      <code className="bg-muted/80 px-1.5 py-0.5 rounded text-xs font-mono font-medium text-foreground" {...props}>
                        {children}
                      </code>
                    )
                  },
                  blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-primary/50 pl-4 my-2 italic text-muted-foreground" {...props} />,
                  // Strikethrough for GFM
                  del: ({ node, ...props }) => <del className="text-muted-foreground line-through" {...props} />,
                  // Links
                  a: ({ node, ...props }) => <a className="text-primary hover:underline font-medium" target="_blank" rel="noopener noreferrer" {...props} />,
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
          {isLoading && !message.content && !message.tool_calls && (
            <div className="flex items-center gap-2 py-1">
              <CircleDashed className="animate-spin w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground animate-pulse">AI is thinking...</span>
            </div>
          )}
        </div>
        {message.tool_calls && message.tool_calls.length > 0 && (
          <div className="mt-4 pt-3 border-t border-border/30 space-y-2">
            <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-2">
              <Wrench className="w-3.5 h-3.5" />
              Tool Calls
            </div>
            <div className="flex flex-wrap gap-2">
              {message.tool_calls.map((toolCall) => (
                <div key={toolCall.id} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-secondary/80 border border-secondary text-secondary-foreground shadow-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  <span className='font-medium font-mono'>{toolCall.function.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {isUser && (
        <Avatar className="h-8 w-8 border border-border flex-shrink-0 mt-1 shadow-sm">
          <AvatarImage src="https://picsum.photos/seed/user-avatar/32/32" />
          <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
