'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@workspace/ui/components/button'
import { Badge } from '@workspace/ui/components/badge'
import {
  Card,
  CardContent,
  CardTitle,
  CardDescription,
} from '@workspace/ui/components/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
} from '@workspace/ui/components/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import {
  IconSend,
  IconPlus,
  IconPlayerPlay,
  IconPlayerPause,
  IconDots,
  IconTrash,
  IconLoader,
  IconCircleDotFilled,
} from '@tabler/icons-react'
import { launchCampaign, pauseCampaign, resumeCampaign, deleteCampaign } from './actions'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CampaignRow = {
  id: number
  name: string
  status: string
  sequenceName: string | null
  listName: string | null
  leadCount: number | null
  sentCount: number
  createdAt: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_META: Record<string, { color: string; bg: string; dot: string }> = {
  draft: { color: 'text-zinc-400', bg: 'bg-zinc-500/15', dot: 'bg-zinc-400' },
  scheduled: { color: 'text-blue-400', bg: 'bg-blue-500/15', dot: 'bg-blue-400' },
  running: { color: 'text-emerald-400', bg: 'bg-emerald-500/15', dot: 'bg-emerald-400' },
  paused: { color: 'text-amber-400', bg: 'bg-amber-500/15', dot: 'bg-amber-400' },
  completed: { color: 'text-violet-400', bg: 'bg-violet-500/15', dot: 'bg-violet-400' },
}

// ---------------------------------------------------------------------------
// Status action button
// ---------------------------------------------------------------------------

function StatusActionButton({ campaign }: { campaign: CampaignRow }) {
  const [isPending, startTransition] = useTransition()

  function handleLaunch() {
    startTransition(async () => {
      try {
        await launchCampaign(campaign.id)
        toast.success('Campaign launched')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to launch')
      }
    })
  }

  function handlePause() {
    startTransition(async () => {
      await pauseCampaign(campaign.id)
      toast.success('Campaign paused')
    })
  }

  function handleResume() {
    startTransition(async () => {
      await resumeCampaign(campaign.id)
      toast.success('Campaign resumed')
    })
  }

  if (isPending) {
    return <IconLoader className="text-muted-foreground size-4 animate-spin" />
  }

  if (campaign.status === 'draft' || campaign.status === 'scheduled') {
    return (
      <Button variant="ghost" size="icon" className="size-8 text-emerald-400 hover:text-emerald-400 hover:bg-emerald-500/10" onClick={handleLaunch} title="Launch">
        <IconPlayerPlay className="size-3.5" />
      </Button>
    )
  }

  if (campaign.status === 'running') {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="size-8 text-amber-400 hover:text-amber-400 hover:bg-amber-500/10"
        onClick={handlePause}
        title="Pause"
      >
        <IconPlayerPause className="size-3.5" />
      </Button>
    )
  }

  if (campaign.status === 'paused') {
    return (
      <Button variant="ghost" size="icon" className="size-8 text-emerald-400 hover:text-emerald-400 hover:bg-emerald-500/10" onClick={handleResume} title="Resume">
        <IconPlayerPlay className="size-3.5" />
      </Button>
    )
  }

  return null
}

// ---------------------------------------------------------------------------
// Progress bar cell
// ---------------------------------------------------------------------------

function ProgressCell({ sent, total }: { sent: number; total: number | null }) {
  if (total === null || total === 0) {
    return <span className="text-muted-foreground/40 text-xs">—</span>
  }

  const ratio = Math.min(sent / total, 1)
  const pct = Math.round(ratio * 100)

  return (
    <div className="flex items-center gap-2.5">
      <div className="flex flex-1 flex-col gap-1">
        <div className="h-1.5 w-full rounded-full bg-muted/60">
          <div
            className="h-full rounded-full bg-primary/80 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <span className="text-muted-foreground min-w-[2.5rem] text-right text-xs tabular-nums">
        {pct}%
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Campaign row actions
// ---------------------------------------------------------------------------

function CampaignRowActions({ campaign }: { campaign: CampaignRow }) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm(`Delete "${campaign.name}"? This cannot be undone.`)) return
    startTransition(async () => {
      await deleteCampaign(campaign.id)
      toast.success('Campaign deleted')
    })
  }

  return (
    <div className="flex items-center justify-end gap-0.5">
      <StatusActionButton campaign={campaign} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground" disabled={isPending}>
            {isPending ? (
              <IconLoader className="size-4 animate-spin" />
            ) : (
              <IconDots className="size-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem variant="destructive" onSelect={handleDelete}>
            <IconTrash className="size-4 text-destructive" />
            <span className="text-destructive">Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export function CampaignsView({ campaigns }: { campaigns: CampaignRow[] }) {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
              <IconSend className="text-primary size-4" />
            </div>
            <h1 className="text-title tracking-tight">Campaigns</h1>
          </div>
          <p className="text-body ml-[2.35rem]">
            Pair sequences with lead lists and schedule your outreach.
          </p>
        </div>
        <Button
          asChild
          size="sm"
          className="gap-2 shadow-[0_0_0_0_rgba(59,130,246,0)] hover:shadow-[0_0_0_6px_rgba(59,130,246,0.12)]"
        >
          <Link href="/campaigns/new">
            <IconPlus className="size-4" />
            New campaign
          </Link>
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="relative mb-5">
              <div className="bg-primary/10 absolute inset-0 blur-2xl" />
              <div className="relative flex size-16 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
                <IconSend className="text-primary size-7" />
              </div>
            </div>
            <CardTitle className="mb-1.5 text-heading">No campaigns yet</CardTitle>
            <CardDescription className="max-w-xs text-center text-sm">
              Create a campaign to start sending. You&apos;ll choose a sequence, a lead list,
              which mailboxes to rotate across, and your send schedule.
            </CardDescription>
            <Button asChild className="mt-6 gap-2" size="sm">
              <Link href="/campaigns/new">
                <IconPlus className="size-4" />
                Create your first campaign
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableCaption className="py-4 text-xs">
                {campaigns.length} campaign{campaigns.length === 1 ? '' : 's'} total
              </TableCaption>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-11">Name</TableHead>
                  <TableHead className="h-11">Sequence</TableHead>
                  <TableHead className="h-11">List</TableHead>
                  <TableHead className="h-11 min-w-[160px]">Progress</TableHead>
                  <TableHead className="h-11">Status</TableHead>
                  <TableHead className="h-11 w-[4.5rem]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((campaign) => {
                  const meta = STATUS_META[campaign.status] ?? { color: 'text-zinc-400', bg: 'bg-zinc-500/15', dot: 'bg-zinc-400' }
                  const statusLabel = campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)

                  return (
                    <TableRow key={campaign.id}>
                      <TableCell className="px-4 py-3.5 font-medium">{campaign.name}</TableCell>
                      <TableCell className="px-3 py-3.5 text-muted-foreground text-sm">
                        {campaign.sequenceName ?? <span className="text-muted-foreground/40">—</span>}
                      </TableCell>
                      <TableCell className="px-3 py-3.5 text-muted-foreground text-sm">
                        {campaign.listName ?? <span className="text-muted-foreground/40">—</span>}
                      </TableCell>
                      <TableCell className="px-3 py-3.5">
                        <ProgressCell sent={campaign.sentCount} total={campaign.leadCount} />
                      </TableCell>
                      <TableCell className="px-3 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className={`status-dot ${meta.dot}`} />
                          <span className={`text-xs font-medium ${meta.color}`}>{statusLabel}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-3 py-3.5">
                        <CampaignRowActions campaign={campaign} />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
