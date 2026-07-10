'use client'

import { useState } from 'react'
import { Badge } from '@workspace/ui/components/badge'
import {
  Card,
  CardContent,
} from '@workspace/ui/components/card'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@workspace/ui/components/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@workspace/ui/components/tabs'
import { IconClock, IconSend, IconInbox, IconMail, IconMailOpened } from '@tabler/icons-react'
import type { EmailRow } from './page'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost'; label: string }> = {
  queued: { variant: 'secondary', label: 'Queued' },
  scheduled: { variant: 'outline', label: 'Scheduled' },
  sent: { variant: 'default', label: 'Sent' },
  failed: { variant: 'destructive', label: 'Failed' },
  skipped: { variant: 'ghost', label: 'Skipped' },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatFullDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function leadDisplay(row: EmailRow) {
  const name = [row.leadFirstName, row.leadLastName].filter(Boolean).join(' ')
  return { name: name || null, email: row.leadEmail }
}

function statusLabel(status: string) {
  return STATUS_CONFIG[status]?.label ?? status.charAt(0).toUpperCase() + status.slice(1)
}

// ---------------------------------------------------------------------------
// Shared empty state
// ---------------------------------------------------------------------------

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="relative mb-5 flex size-14 items-center justify-center rounded-full">
        <div className="absolute inset-0 rounded-full bg-blue-500/10" />
        <IconInbox className="text-blue-400 relative size-7" />
      </div>
      <p className="text-foreground text-sm font-semibold">No {label} emails</p>
      <p className="text-muted-foreground mt-1.5 max-w-xs text-sm leading-relaxed">
        {label === 'scheduled'
          ? 'Launch a campaign to start queuing emails.'
          : 'Sent emails will appear here once delivered.'}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Email table
// ---------------------------------------------------------------------------

function EmailTable({
  rows,
  dateLabel,
  dateKey,
  onRowClick,
}: {
  rows: EmailRow[]
  dateLabel: string
  dateKey: 'scheduledAt' | 'sentAt'
  onRowClick: (row: EmailRow) => void
}) {
  if (rows.length === 0) {
    return (
      <Card className="border-border/60">
        <CardContent className="p-0">
          <EmptyState label={dateKey === 'scheduledAt' ? 'scheduled' : 'sent'} />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/60 overflow-hidden">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20">
                <TableHead className="pl-5">Lead</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>From</TableHead>
                <TableHead className="text-center">Step</TableHead>
                <TableHead>{dateLabel}</TableHead>
                <TableHead className="pr-5">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const { name, email } = leadDisplay(row)
                return (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer transition-colors hover:bg-blue-500/[0.04] dark:hover:bg-blue-500/[0.06]"
                    onClick={() => onRowClick(row)}
                  >
                    <TableCell className="pl-5">
                      {name && (
                        <p className="text-foreground text-sm font-medium leading-tight">{name}</p>
                      )}
                      <p className="text-muted-foreground text-xs">{email}</p>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {row.campaignName ?? <span className="text-muted-foreground/30">—</span>}
                    </TableCell>
                    <TableCell className="max-w-64 truncate text-sm">
                      {row.subject ?? <span className="text-muted-foreground/30">—</span>}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {row.fromEmail ? (
                        <span title={row.fromName ?? undefined}>{row.fromEmail}</span>
                      ) : (
                        <span className="text-muted-foreground/30">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-center text-sm tabular-nums">
                      {row.stepPosition}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm tabular-nums">
                      {formatDate(row[dateKey])}
                    </TableCell>
                    <TableCell className="pr-5">
                      <Badge variant={STATUS_CONFIG[row.status]?.variant ?? 'secondary'}>
                        {statusLabel(row.status)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Email detail sheet
// ---------------------------------------------------------------------------

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-x-4 gap-y-1 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-foreground min-w-0 break-words">{children}</span>
    </div>
  )
}

function EmailSheet({ email, onClose }: { email: EmailRow; onClose: () => void }) {
  const { name, email: leadEmail } = leadDisplay(email)
  const isSent = email.status === 'sent'
  const statusVariant = STATUS_CONFIG[email.status]?.variant ?? 'secondary'

  return (
    <Sheet open onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 data-[side=right]:w-[92vw] data-[side=right]:sm:max-w-2xl data-[side=right]:lg:max-w-3xl">
        {/* Header */}
        <SheetHeader className="border-b border-border/60 px-6 py-4">
          <SheetTitle className="pr-8 text-base leading-snug font-semibold">
            {email.subject || '(no subject)'}
          </SheetTitle>
          <div className="mt-2">
            <Badge variant={statusVariant} className="transition-all duration-200">
              {statusLabel(email.status)}
            </Badge>
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-auto">
          {/* Metadata section */}
          <div className="border-b border-border/40 bg-muted/10 px-6 py-4">
            <div className="space-y-2.5">
              <DetailRow label="To">
                {name ? (
                  <>
                    <span className="font-medium">{name}</span>{' '}
                    <span className="text-muted-foreground">&lt;{leadEmail}&gt;</span>
                  </>
                ) : (
                  leadEmail || <span className="text-muted-foreground/30">—</span>
                )}
              </DetailRow>
              <DetailRow label="From">
                {email.fromEmail ? (
                  email.fromName ? `${email.fromName} <${email.fromEmail}>` : email.fromEmail
                ) : (
                  <span className="text-muted-foreground/30">—</span>
                )}
              </DetailRow>
              <DetailRow label="Campaign">
                {email.campaignName ?? <span className="text-muted-foreground/30">—</span>}
              </DetailRow>
              <DetailRow label="Step">{email.stepPosition}</DetailRow>
              <DetailRow label={isSent ? 'Sent at' : 'Scheduled at'}>
                {formatFullDate(isSent ? email.sentAt : email.scheduledAt)}
              </DetailRow>
              {email.error && (
                <DetailRow label="Error">
                  <span className="text-red-400">{email.error}</span>
                </DetailRow>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-5">
            {email.body ? (
              <div className="bg-card border-border/60 rounded-xl border p-5">
                <div
                  className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: email.body }}
                />
              </div>
            ) : (
              <p className="text-muted-foreground text-sm italic">(no body)</p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export function EmailsView({
  scheduled,
  sent,
}: {
  scheduled: EmailRow[]
  sent: EmailRow[]
}) {
  const [selectedEmail, setSelectedEmail] = useState<EmailRow | null>(null)

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="relative flex size-9 items-center justify-center rounded-xl bg-blue-500/10">
            <div className="absolute inset-0 rounded-xl bg-blue-500/15 blur-md" />
            <IconMail className="text-blue-400 relative size-[18px]" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Emails</h1>
        </div>
        <p className="text-muted-foreground mt-1.5 ml-12 text-sm">
          Track every email across your campaigns — scheduled and sent.
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="scheduled">
        <TabsList variant="line" className="border-b border-border/60">
          <TabsTrigger value="scheduled" className="gap-1.5">
            <IconClock className="size-3.5" />
            Scheduled
            {scheduled.length > 0 && (
              <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 hover:bg-blue-500/15 border-blue-500/20 px-1.5 py-0 text-xs font-medium transition-colors">
                {scheduled.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sent" className="gap-1.5">
            <IconSend className="size-3.5" />
            Sent
            {sent.length > 0 && (
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15 border-emerald-500/20 px-1.5 py-0 text-xs font-medium transition-colors">
                {sent.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scheduled" className="mt-5">
          <EmailTable
            rows={scheduled}
            dateLabel="Scheduled At"
            dateKey="scheduledAt"
            onRowClick={setSelectedEmail}
          />
        </TabsContent>

        <TabsContent value="sent" className="mt-5">
          <EmailTable
            rows={sent}
            dateLabel="Sent At"
            dateKey="sentAt"
            onRowClick={setSelectedEmail}
          />
        </TabsContent>
      </Tabs>

      {selectedEmail && (
        <EmailSheet email={selectedEmail} onClose={() => setSelectedEmail(null)} />
      )}
    </div>
  )
}
