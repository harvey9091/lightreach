'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { generateMcpToken, revealMcpToken, revokeMcpToken } from './actions'
import { Button } from '@workspace/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { Badge } from '@workspace/ui/components/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@workspace/ui/components/tooltip'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs'
import {
  IconRefresh,
  IconEye,
  IconEyeOff,
  IconCopy,
  IconTrash,
  IconCheck,
  IconKey,
  IconCode,
  IconRocket,
} from '@tabler/icons-react'

// ---------------------------------------------------------------------------
// Tool catalog
// ---------------------------------------------------------------------------

type ToolEntry = { name: string; description: string; params: string }

const TOOL_GROUPS: { group: string; tools: ToolEntry[] }[] = [
  {
    group: 'Lists',
    tools: [
      { name: 'list_lists', description: 'List all lead lists', params: '—' },
      { name: 'create_list', description: 'Create a new lead list', params: 'name' },
      { name: 'delete_list', description: 'Delete a list and all its leads', params: 'id' },
    ],
  },
  {
    group: 'Leads',
    tools: [
      {
        name: 'list_leads',
        description: 'List leads (filterable)',
        params: 'listId?, status?, limit?',
      },
      { name: 'get_lead', description: 'Get a single lead by ID', params: 'id' },
      {
        name: 'create_lead',
        description: 'Create a new lead in a list',
        params: 'listId, email, firstName?, lastName?, company?, openingLine?',
      },
      {
        name: 'update_lead',
        description: 'Update lead fields',
        params: 'id, email?, firstName?, lastName?, company?, openingLine?, status?',
      },
      { name: 'delete_lead', description: 'Delete a lead by ID', params: 'id' },
      {
        name: 'import_leads',
        description: 'Bulk-import leads, skipping duplicates',
        params: 'listId, leads[]',
      },
    ],
  },
  {
    group: 'Sequences',
    tools: [
      { name: 'list_sequences', description: 'List all email sequences', params: '—' },
      {
        name: 'get_sequence',
        description: 'Get sequence with all steps',
        params: 'id',
      },
      {
        name: 'create_sequence',
        description: 'Create a sequence with steps',
        params: 'name, steps[]',
      },
      {
        name: 'update_sequence',
        description: 'Replace all steps in a sequence',
        params: 'id, name, steps[]',
      },
      { name: 'delete_sequence', description: 'Delete a sequence', params: 'id' },
      {
        name: 'preview_step',
        description: 'Preview step with spintax expanded and variables substituted',
        params: 'subject, body, variables?',
      },
    ],
  },
  {
    group: 'Connections',
    tools: [
      {
        name: 'list_connections',
        description: 'List mailboxes (credentials redacted)',
        params: '—',
      },
      { name: 'get_connection', description: 'Get connection by ID (redacted)', params: 'id' },
      {
        name: 'create_connection',
        description: 'Create SMTP/IMAP mailbox',
        params: 'label, fromName, fromEmail, smtpHost, smtpPort, smtpUser, smtpPass, …',
      },
      {
        name: 'update_connection',
        description: 'Update mailbox (leave passwords blank to keep)',
        params: 'id, …same as create…',
      },
      { name: 'delete_connection', description: 'Delete a mailbox', params: 'id' },
      { name: 'test_connection', description: 'Verify SMTP credentials', params: 'id' },
      {
        name: 'toggle_connection_status',
        description: 'Toggle active ↔ paused',
        params: 'id, currentStatus',
      },
      {
        name: 'send_test_email',
        description: 'Send a test email through a saved connection',
        params: 'connectionId, to, subject?, body?',
      },
    ],
  },
  {
    group: 'Campaigns',
    tools: [
      { name: 'list_campaigns', description: 'List all campaigns', params: '—' },
      {
        name: 'get_campaign',
        description: 'Get campaign with assigned mailbox IDs',
        params: 'id',
      },
      {
        name: 'create_campaign',
        description: 'Create campaign (sequence + list + mailboxes + schedule)',
        params: 'name, sequenceId, listId, connectionIds[], sendWindow…',
      },
      {
        name: 'launch_campaign',
        description: 'Queue step-1 messages and set status to running',
        params: 'id',
      },
      { name: 'pause_campaign', description: 'Pause a running campaign', params: 'id' },
      { name: 'resume_campaign', description: 'Resume a paused campaign', params: 'id' },
      { name: 'delete_campaign', description: 'Delete a campaign', params: 'id' },
    ],
  },
  {
    group: 'Messages',
    tools: [
      {
        name: 'list_messages',
        description: 'List send-queue messages (filterable)',
        params: 'campaignId?, leadId?, status?, limit?',
      },
      { name: 'get_message', description: 'Get a single message by ID', params: 'id' },
    ],
  },
  {
    group: 'Inbox & Replies',
    tools: [
      {
        name: 'list_inbound_emails',
        description: 'List received emails (filterable)',
        params: 'category?, isRead?, limit?',
      },
      {
        name: 'get_inbound_email',
        description: 'Get inbound email with full body',
        params: 'id',
      },
      {
        name: 'get_thread',
        description: 'Get outbound history for a conversation',
        params: 'inboundId',
      },
      {
        name: 'reply_to_email',
        description: 'Reply to an inbound email',
        params: 'inboundId, body',
      },
      {
        name: 'categorize_email',
        description: 'Set category on an inbound email',
        params: 'id, category',
      },
      { name: 'mark_read', description: 'Mark email as read', params: 'id' },
      { name: 'mark_unread', description: 'Mark email as unread', params: 'id' },
      { name: 'trigger_fetch', description: 'Manually poll all IMAP inboxes', params: '—' },
    ],
  },
  {
    group: 'Settings & Stats',
    tools: [
      { name: 'get_settings', description: 'Get all app settings', params: '—' },
      {
        name: 'set_filter_keywords',
        description: 'Set inbox filter keywords',
        params: 'keywords',
      },
      {
        name: 'get_stats',
        description: 'Overview counts: leads, messages sent, unread inbox…',
        params: '—',
      },
    ],
  },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const TOTAL_TOOLS = TOOL_GROUPS.reduce((a, g) => a + g.tools.length, 0)

export function McpView({ hasToken, appUrl }: { hasToken: boolean; appUrl: string }) {
  const [token, setToken] = useState<string | null>(null)
  const [tokenExists, setTokenExists] = useState(hasToken)
  const [showing, setShowing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isPending, startTransition] = useTransition()

  const endpoint =
    typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.host}/api/mcp`
      : `${appUrl}/api/mcp`

  const mcpJson = JSON.stringify(
    {
      mcpServers: {
        lightreach: {
          url: endpoint,
          headers: {
            Authorization: `Bearer ${token ?? '<your-bearer-token>'}`,
          },
        },
      },
    },
    null,
    2,
  )

  function handleGenerate() {
    startTransition(async () => {
      try {
        const t = await generateMcpToken()
        setToken(t)
        setTokenExists(true)
        setShowing(true)
        toast.success('Token generated')
      } catch {
        toast.error('Failed to generate token')
      }
    })
  }

  function handleReveal() {
    if (showing) {
      setShowing(false)
      return
    }
    startTransition(async () => {
      try {
        const t = await revealMcpToken()
        if (!t) {
          toast.error('No token found')
          return
        }
        setToken(t)
        setShowing(true)
      } catch {
        toast.error('Failed to reveal token')
      }
    })
  }

  function handleRevoke() {
    startTransition(async () => {
      try {
        await revokeMcpToken()
        setToken(null)
        setTokenExists(false)
        setShowing(false)
        toast.success('Token revoked')
      } catch {
        toast.error('Failed to revoke token')
      }
    })
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      toast.success('Copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-title">MCP Server</h1>
        <p className="text-body mt-1">
          Connect any MCP-compatible AI agent to Lightreach for full data access — create
          leads, launch campaigns, reply to emails, and more.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Access Token ─────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="bg-primary/10 flex size-8 shrink-0 items-center justify-center rounded-xl">
                  <IconKey className="text-primary size-4" />
                </div>
                <div>
                  <CardTitle className="text-heading">API Token</CardTitle>
                </div>
              </div>
              <Badge
                variant={tokenExists ? 'default' : 'secondary'}
                className="gap-1.5"
              >
                <span
                  className={`status-dot ${
                    tokenExists ? 'status-dot-success' : 'status-dot-neutral'
                  }`}
                />
                {tokenExists ? 'Active' : 'Not configured'}
              </Badge>
            </div>
            <CardDescription>
              Bearer token for MCP authentication. Keep it secret — anyone with this token
              can fully control Lightreach via the agent.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Token display */}
            {tokenExists && (
              <div className="relative">
                <div className="bg-muted/60 dark:bg-muted/40 flex items-center gap-2 rounded-xl border border-border p-2.5">
                  <div className="dark:[background:radial-gradient(ellipse_at_center,var(--primary-soft)_0%,transparent_70%)] absolute inset-0 -z-10 rounded-xl" />
                  <code className="flex-1 truncate font-mono text-xs tracking-wide text-foreground/90">
                    {showing && token ? token : '••••••••••••••••••••••••••••••••••••••••'}
                  </code>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        onClick={handleReveal}
                        disabled={isPending}
                        aria-label={showing ? 'Hide token' : 'Reveal token'}
                      >
                        {showing ? (
                          <IconEyeOff className="size-3.5" />
                        ) : (
                          <IconEye className="size-3.5" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      {showing ? 'Hide token' : 'Reveal token'}
                    </TooltipContent>
                  </Tooltip>
                  {showing && token && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => handleCopy(token)}
                          aria-label="Copy token"
                        >
                          {copied ? (
                            <IconCheck className="size-3.5 text-emerald-400" />
                          ) : (
                            <IconCopy className="size-3.5" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Copy token</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={handleGenerate} disabled={isPending}>
                <IconRefresh className="size-3.5" />
                {tokenExists ? 'Rotate token' : 'Generate token'}
              </Button>
              {tokenExists && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleRevoke}
                  disabled={isPending}
                >
                  <IconTrash className="size-3.5" />
                  Revoke
                </Button>
              )}
            </div>

            <p className="text-caption">
              Rotating creates a new token and immediately invalidates the old one. Any
              agent configs must be updated with the new token.
            </p>
          </CardContent>
        </Card>

        {/* ── Connect your agent ───────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div className="bg-primary/10 flex size-8 shrink-0 items-center justify-center rounded-xl">
                <IconCode className="text-primary size-4" />
              </div>
              <div>
                <CardTitle className="text-heading">Connect Your Agent</CardTitle>
                <CardDescription className="mt-0.5">
                  Add this to your project&apos;s <code className="font-mono text-xs">.mcp.json</code> (Claude
                  Code) or <code className="font-mono text-xs">claude_desktop_config.json</code> (Claude
                  Desktop).
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <pre className="bg-secondary/60 dark:bg-secondary/30 overflow-x-auto rounded-xl border border-border p-3.5 font-mono text-xs leading-relaxed tracking-wide text-foreground/85">
                {mcpJson}
              </pre>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    className="absolute top-2.5 right-2.5"
                    onClick={() => handleCopy(mcpJson)}
                    aria-label="Copy config snippet"
                  >
                    {copied ? (
                      <IconCheck className="size-3.5 text-emerald-400" />
                    ) : (
                      <IconCopy className="size-3.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Copy config</TooltipContent>
              </Tooltip>
            </div>
            {!token && (
              <p className="text-caption">
                Generate a token above to populate the snippet with your actual bearer
                token.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Tool Reference ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <div className="bg-primary/10 flex size-8 shrink-0 items-center justify-center rounded-xl">
              <IconRocket className="text-primary size-4" />
            </div>
            <div>
              <CardTitle className="text-heading">Tool Reference</CardTitle>
              <CardDescription className="mt-0.5">
                All {TOTAL_TOOLS} MCP tools exposed to your agent, grouped by domain.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={TOOL_GROUPS[0]?.group ?? ''} className="w-full">
            <TabsList variant="line" className="w-full justify-start rounded-none border-b border-border bg-transparent p-0">
              {TOOL_GROUPS.map(({ group }) => (
                <TabsTrigger
                  key={group}
                  value={group}
                  className="rounded-none border-b-2 border-transparent px-3 py-2 text-xs data-active:border-primary data-active:text-foreground"
                >
                  {group}
                </TabsTrigger>
              ))}
            </TabsList>
            {TOOL_GROUPS.map(({ group, tools }) => (
              <TabsContent key={group} value={group} className="mt-4">
                <div className="overflow-hidden rounded-xl border border-border">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30 dark:bg-muted/10">
                        <th className="px-4 py-2.5 font-mono text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Tool
                        </th>
                        <th className="px-4 py-2.5 font-mono text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Description
                        </th>
                        <th className="px-4 py-2.5 font-mono text-xs font-medium uppercase tracking-wider text-muted-foreground text-right">
                          Params
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {tools.map((tool, idx) => (
                        <tr
                          key={tool.name}
                          className={`border-b border-border last:border-0 transition-colors hover:bg-muted/20 dark:hover:bg-foreground/[0.03] ${
                            idx % 2 === 0 ? 'bg-transparent' : 'bg-muted/5 dark:bg-muted/[0.03]'
                          }`}
                        >
                          <td className="px-4 py-2.5 font-mono text-xs font-medium text-primary">
                            {tool.name}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-foreground/80">
                            {tool.description}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono text-xs text-muted-foreground">
                            {tool.params}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
