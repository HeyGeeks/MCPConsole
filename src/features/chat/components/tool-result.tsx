'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Wrench, CheckCircle2, AlertCircle } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ToolResultProps {
  toolName: string;
  result: string;
}

export function ToolResult({ toolName, result }: ToolResultProps) {
  let formattedResult = result;
  let isError = false;
  let isJson = false;

  try {
    const parsed = JSON.parse(result);
    if (parsed.error) {
      isError = true;
    }
    formattedResult = JSON.stringify(parsed, null, 2);
    isJson = true;
  } catch (e) {
    // result is not json, show as markdown
    isJson = false;
  }

  return (
    <div className="w-full max-w-[80%] my-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <Accordion type="single" collapsible defaultValue="item-1" className="w-full rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <AccordionItem value="item-1" className="border-none">
          <AccordionTrigger className="px-4 py-3 hover:bg-muted/50 transition-colors hover:no-underline [&[data-state=open]]:bg-muted/50">
            <div className="flex items-center gap-3 w-full text-left">
              <div className={`p-2 rounded-lg ${isError ? 'bg-destructive/10' : 'bg-green-500/10'}`}>
                {isError ? (
                  <AlertCircle className="w-4 h-4 text-destructive" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Wrench className="w-3.5 h-3.5 text-muted-foreground" />
                  {toolName}
                </div>
                <div className="text-xs text-muted-foreground">
                  {isError ? 'Execution failed' : 'Executed successfully'}
                </div>
              </div>
              {isError && (
                <span className="text-[10px] text-white font-semibold uppercase tracking-wide bg-destructive px-2.5 py-1 rounded-full flex-shrink-0">
                  Error
                </span>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-0 py-0 border-t">
            {isJson ? (
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <SyntaxHighlighter
                  style={vscDarkPlus as any}
                  language="json"
                  customStyle={{
                    margin: 0,
                    borderRadius: 0,
                    fontSize: '12px',
                    padding: '16px'
                  }}
                  wrapLines
                  wrapLongLines
                >
                  {formattedResult}
                </SyntaxHighlighter>
              </div>
            ) : (
              <div className="p-4 bg-muted/30 max-h-[400px] overflow-y-auto">
                <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      table: ({ node, ...props }) => (
                        <div className="overflow-x-auto my-3 rounded-lg border border-border/60">
                          <table className="min-w-full divide-y divide-border text-sm" {...props} />
                        </div>
                      ),
                      thead: ({ node, ...props }) => (
                        <thead className="bg-muted/50" {...props} />
                      ),
                      tbody: ({ node, ...props }) => (
                        <tbody className="divide-y divide-border/50" {...props} />
                      ),
                      tr: ({ node, ...props }) => (
                        <tr className="hover:bg-muted/30" {...props} />
                      ),
                      th: ({ node, ...props }) => (
                        <th className="px-3 py-2 text-left font-semibold text-foreground text-xs" {...props} />
                      ),
                      td: ({ node, ...props }) => (
                        <td className="px-3 py-2 text-muted-foreground text-xs" {...props} />
                      ),
                      p: ({ node, ...props }) => (
                        <p className="mb-2 leading-relaxed text-foreground" {...props} />
                      ),
                      code: ({ node, className, children, ...props }) => (
                        <code className="bg-muted/80 px-1.5 py-0.5 rounded text-xs font-mono" {...props}>
                          {children}
                        </code>
                      ),
                    }}
                  >
                    {result}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
