'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { cn } from '@workspace/ui/lib/utils'
import { Button } from '@workspace/ui/components/button'
import { Badge } from '@workspace/ui/components/badge'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import {
  IconArrowLeft,
  IconDeviceFloppy,
  IconLoader,
  IconSend,
} from '@tabler/icons-react'
import { createCampaign } from '../actions'
import type { CreateCampaignInput } from '../actions'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SequenceOption = { id: number; name: string }
type ListOption = { id: number; name: string }
type ConnectionOption = {
  id: number
  label: string
  fromEmail: string
  status: string
  dailyLimit: number
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Australia/Sydney',
]

const DAYS = [
  { label: 'Su', value: 0 },
  { label: 'Mo', value: 1 },
  { label: 'Tu', value: 2 },
  { label: 'We', value: 3 },
  { label: 'Th', value: 4 },
  { label: 'Fr', value: 5 },
  { label: 'Sa', value: 6 },
]

const DEFAULT_FORM = {
  name: '',
  sequenceId: '',
  listId: '',
  connectionIds: [] as number[],
  sendWindowStart: '09:00',
  sendWindowEnd: '17:00',
  timezone: 'UTC',
  daysOfWeek: [1, 2, 3, 4, 5] as number[],
  minDelaySeconds: 60,
  maxDelaySeconds: 300,
}

// ---------------------------------------------------------------------------
// CampaignForm
// ---------------------------------------------------------------------------

export function CampaignForm({
  sequences,
  lists,
  connections,
}: {
  sequences: SequenceOption[]
  lists: ListOption[]
  connections: ConnectionOption[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState(DEFAULT_FORM)

  const dailyCap = connections
    .filter((c) => form.connectionIds.includes(c.id))
    .reduce((sum, c) => sum + c.dailyLimit, 0)

  function toggleConnection(id: number) {
    setForm((prev) => ({
      ...prev,
      connectionIds: prev.connectionIds.includes(id)
        ? prev.connectionIds.filter((c) => c !== id)
        : [...prev.connectionIds, id],
    }))
  }

  function toggleDay(value: number) {
    setForm((prev) => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(value)
        ? prev.daysOfWeek.filter((d) => d !== value)
        : [...prev.daysOfWeek, value].sort((a, b) => a - b),
    }))
  }

  function handleSave() {
    if (!form.name.trim()) {
      toast.error('Please enter a campaign name')
      return
    }

    const input: CreateCampaignInput = {
      name: form.name,
      sequenceId: form.sequenceId ? Number(form.sequenceId) : null,
      listId: form.listId ? Number(form.listId) : null,
      connectionIds: form.connectionIds,
      sendWindowStart: form.sendWindowStart,
      sendWindowEnd: form.sendWindowEnd,
      timezone: form.timezone,
      daysOfWeek: form.daysOfWeek,
      dailyCap,
      minDelaySeconds: form.minDelaySeconds,
      maxDelaySeconds: form.maxDelaySeconds,
    }

    startTransition(async () => {
      try {
        await createCampaign(input)
        toast.success('Campaign created')
        router.push('/campaigns')
      } catch {
        toast.error('Failed to create campaign')
      }
    })
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push('/campaigns')}
            className="size-9 rounded-full border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 hover:border-primary/30"
          >
            <IconArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-title tracking-tight">New campaign</h1>
            <p className="text-caption mt-0.5">
              Configure your sequence, send schedule, and pacing settings
            </p>
          </div>
        </div>
        <Button
          onClick={handleSave}
          disabled={isPending || !form.name.trim()}
          className="gap-2 shadow-[0_0_0_0_rgba(59,130,246,0)] hover:shadow-[0_0_0_6px_rgba(59,130,246,0.12)]"
          size="sm"
        >
          {isPending ? (
            <IconLoader className="size-4 animate-spin" />
          ) : (
            <IconDeviceFloppy className="size-4" />
          )}
          Create campaign
        </Button>
      </div>

      {/* Setup */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <span className="bg-primary/80 size-1.5 rounded-full" />
            <CardTitle className="text-sm font-semibold tracking-tight">Setup</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid gap-1.5">
            <Label htmlFor="campaign-name">Campaign name</Label>
            <Input
              id="campaign-name"
              placeholder="Q3 Outreach"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              autoFocus
              className="bg-background"
            />
          </div>

          <div className="border-border/60 border-t pt-4">
            <p className="text-caption mb-3 uppercase tracking-wider">Target selection</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Sequence</Label>
                <Select
                  value={form.sequenceId}
                  onValueChange={(v) => setForm((p) => ({ ...p, sequenceId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a sequence…" />
                  </SelectTrigger>
                  <SelectContent>
                    {sequences.length === 0 ? (
                      <SelectItem value="__none__" disabled>
                        No sequences yet
                      </SelectItem>
                    ) : (
                      sequences.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5">
                <Label>Lead list</Label>
                <Select
                  value={form.listId}
                  onValueChange={(v) => setForm((p) => ({ ...p, listId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a list…" />
                  </SelectTrigger>
                  <SelectContent>
                    {lists.length === 0 ? (
                      <SelectItem value="__none__" disabled>
                        No lists yet
                      </SelectItem>
                    ) : (
                      lists.map((l) => (
                        <SelectItem key={l.id} value={String(l.id)}>
                          {l.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mailboxes */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="bg-primary/80 size-1.5 rounded-full" />
              <CardTitle className="text-sm font-semibold tracking-tight">Mailboxes</CardTitle>
            </div>
            {dailyCap > 0 && (
              <Badge
                variant="outline"
                className="gap-1.5 rounded-full border-primary/20 bg-primary/5 px-2.5 py-0.5 text-xs text-primary"
              >
                <IconSend className="size-3" />
                <span className="font-semibold tabular-nums">{dailyCap}</span>
                <span className="text-primary/70">emails/day</span>
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {connections.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 py-10">
              <p className="text-muted-foreground text-sm">
                No mailboxes configured. Add connections first.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {connections.map((conn) => {
                const active = form.connectionIds.includes(conn.id)
                return (
                  <label
                    key={conn.id}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-xl border bg-background p-3.5 transition-all duration-150',
                      active
                        ? 'border-primary/25 bg-primary/[0.04] ring-1 ring-primary/20'
                        : 'border-border/60 hover:border-foreground/15 hover:bg-muted/30',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => toggleConnection(conn.id)}
                      className="accent-primary size-4 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-tight">{conn.label}</p>
                      <p className="text-muted-foreground text-xs">{conn.fromEmail}</p>
                    </div>
                    {conn.status !== 'active' && (
                      <span className="text-caption uppercase tracking-wider text-muted-foreground">
                        {conn.status}
                      </span>
                    )}
                  </label>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schedule + Pacing side by side on wider screens */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Schedule */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <span className="bg-primary/80 size-1.5 rounded-full" />
              <CardTitle className="text-sm font-semibold tracking-tight">Schedule</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="window-start">Window start</Label>
                <Input
                  id="window-start"
                  type="time"
                  value={form.sendWindowStart}
                  onChange={(e) => setForm((p) => ({ ...p, sendWindowStart: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="window-end">Window end</Label>
                <Input
                  id="window-end"
                  type="time"
                  value={form.sendWindowEnd}
                  onChange={(e) => setForm((p) => ({ ...p, sendWindowEnd: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label>Days of week</Label>
              <div className="flex flex-wrap gap-1.5">
                {DAYS.map(({ label, value }) => {
                  const active = form.daysOfWeek.includes(value)
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggleDay(value)}
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all duration-150',
                        active
                          ? 'bg-primary text-primary-foreground shadow-[0_0_0_2px_rgba(59,130,246,0.25)]'
                          : 'border border-border/80 text-muted-foreground hover:border-foreground/20 hover:text-foreground',
                      )}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label>Timezone</Label>
              <Select
                value={form.timezone}
                onValueChange={(v) => setForm((p) => ({ ...p, timezone: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label>Daily send cap</Label>
              {dailyCap > 0 ? (
                <Badge
                  variant="outline"
                  className="w-fit gap-1.5 rounded-full border-primary/20 bg-primary/5 px-3 py-1 text-sm text-primary"
                >
                  <span className="font-semibold tabular-nums">{dailyCap}</span>
                  <span className="text-primary/70">emails/day</span>
                  {form.connectionIds.length > 1 && (
                    <span className="text-primary/50">· {form.connectionIds.length} mailboxes</span>
                  )}
                </Badge>
              ) : (
                <p className="text-caption">Select mailboxes to calculate</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pacing */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <span className="bg-primary/80 size-1.5 rounded-full" />
              <CardTitle className="text-sm font-semibold tracking-tight">Pacing</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="grid gap-1.5">
              <Label htmlFor="min-delay">Min delay between sends</Label>
              <div className="relative">
                <Input
                  id="min-delay"
                  type="number"
                  min={0}
                  value={form.minDelaySeconds}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      minDelaySeconds: Math.max(0, Number(e.target.value)),
                    }))
                  }
                  className="pr-12"
                />
                <span className="text-caption absolute right-3 top-1/2 -translate-y-1/2">
                  seconds
                </span>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="max-delay">Max delay between sends</Label>
              <div className="relative">
                <Input
                  id="max-delay"
                  type="number"
                  min={0}
                  value={form.maxDelaySeconds}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      maxDelaySeconds: Math.max(0, Number(e.target.value)),
                    }))
                  }
                  className="pr-12"
                />
                <span className="text-caption absolute right-3 top-1/2 -translate-y-1/2">
                  seconds
                </span>
              </div>
            </div>
            <div className="bg-muted/30 flex items-start gap-2 rounded-lg border border-border/40 px-3 py-2.5">
              <p className="text-caption leading-relaxed">
                A random delay within this range is applied between each send to mimic human
                sending patterns.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
