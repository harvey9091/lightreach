'use client'

import { useState, useTransition, useMemo, useEffect, useRef } from 'react'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent } from '@workspace/ui/components/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@workspace/ui/components/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs'
import { Textarea } from '@workspace/ui/components/textarea'
import {
  IconMailbox,
  IconFlame,
  IconSearch,
  IconRefresh,
  IconLoader,
  IconSettings,
  IconSend,
  IconMail,
  IconMailOpened,
  IconTag,
  IconChevronDown,
  IconCircleCheck,
  IconCircleX,
  IconCalendar,
  IconClock,
  IconBan,
  IconArrowDown,
  IconArrowUp,
  IconSelector,
} from '@tabler/icons-react'
import { toast } from 'sonner'
import { splitQuotedReply } from '@workspace/core/email/quote'
import type { InboundRow } from './page'
import { markRead, markUnread, replyToEmail, saveFilteredKeywords, triggerFetch, categorizeEmail, getOutboundMessages } from './actions'
import type { OutboundMessage } from './actions'

// ---------------------------------------------------------------------------
// Category config
// ---------------------------------------------------------------------------

type CategoryKey = 'none' | 'interested' | 'not_interested' | 'meeting_booked' | 'out_of_office' | 'do_not_contact'

const CATEGORIES: { value: CategoryKey; label: string; badge: string; icon: React.ReactNode }[] = [
  {
    value: 'none',
    label: 'Uncategorized',
    badge: '',
    icon: <IconTag className="size-3.5" />,
  },
  {
    value: 'interested',
    label: 'Interested',
    badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    icon: <IconCircleCheck className="size-3.5" />,
  },
  {
    value: 'not_interested',
    label: 'Not Interested',
    badge: 'bg-red-500/15 text-red-400 border-red-500/20',
    icon: <IconCircleX className="size-3.5" />,
  },
  {
    value: 'meeting_booked',
    label: 'Meeting Booked',
    badge: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    icon: <IconCalendar className="size-3.5" />,
  },
  {
    value: 'out_of_office',
    label: 'Out of Office',
    badge: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
    icon: <IconClock className="size-3.5" />,
  },
  {
    value: 'do_not_contact',
    label: 'Do Not Contact',
    badge: 'bg-muted text-muted-foreground border-border',
    icon: <IconBan className="size-3.5" />,
  },
]

function getCategoryMeta(value: string) {
  return CATEGORIES.find((c) => c.value === value) ?? CATEGORIES[0]!
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return mins === 1 ? '1 minute ago' : `${mins} minutes ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return hrs === 1 ? '1 hour ago' : `${hrs} hours ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return days === 1 ? '1 day ago' : `${days} days ago`
  const months = Math.floor(days / 30)
  if (months < 12) return months === 1 ? '1 month ago' : `${months} months ago`
  const years = Math.floor(months / 12)
  return years === 1 ? '1 year ago' : `${years} years ago`
}

function filterRows(rows: InboundRow[], query: string): InboundRow[] {
  const q = query.trim().toLowerCase()
  if (!q) return rows
  return rows.filter(
    (r) =>
      r.fromEmail.toLowerCase().includes(q) ||
      r.fromName.toLowerCase().includes(q) ||
      r.subject.toLowerCase().includes(q) ||
      (r.bodyText ?? '').toLowerCase().includes(q),
  )
}

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

type SortKey = 'from' | 'subject' | 'category' | 'mailbox' | 'date'
type SortDir = 'asc' | 'desc'

function sortRows(rows: InboundRow[], key: SortKey, dir: SortDir, showLastInteraction: boolean): InboundRow[] {
  return [...rows].sort((a, b) => {
    let av: string
    let bv: string
    switch (key) {
      case 'from':
        av = (a.fromName || a.fromEmail).toLowerCase()
        bv = (b.fromName || b.fromEmail).toLowerCase()
        break
      case 'subject':
        av = (a.subject ?? '').toLowerCase()
        bv = (b.subject ?? '').toLowerCase()
        break
      case 'category':
        av = a.category ?? ''
        bv = b.category ?? ''
        break
      case 'mailbox':
        av = (a.connectionLabel ?? '').toLowerCase()
        bv = (b.connectionLabel ?? '').toLowerCase()
        break
      case 'date':
        if (showLastInteraction) {
          const aMax = a.repliedAt && a.receivedAt
            ? (a.repliedAt > a.receivedAt ? a.repliedAt : a.receivedAt)
            : (a.repliedAt ?? a.receivedAt ?? '')
          const bMax = b.repliedAt && b.receivedAt
            ? (b.repliedAt > b.receivedAt ? b.repliedAt : b.receivedAt)
            : (b.repliedAt ?? b.receivedAt ?? '')
          av = aMax; bv = bMax
        } else {
          av = a.receivedAt ?? ''
          bv = b.receivedAt ?? ''
        }
        break
    }
    return dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
  })
}

function SortableHead({
  label,
  sortKey,
  current,
  dir,
  onSort,
  className,
}: {
  label: string
  sortKey: SortKey
  current: SortKey
  dir: SortDir
  onSort: (key: SortKey) => void
  className?: string
}) {
  const active = current === sortKey
  return (
    <TableHead
      className={`cursor-pointer select-none ${className ?? ''}`}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {label}
        {active ? (
          dir === 'asc' ? (
            <IconArrowUp className="size-3 shrink-0 opacity-60" />
          ) : (
            <IconArrowDown className="size-3 shrink-0 opacity-60" />
          )
        ) : (
          <IconSelector className="size-3 shrink-0 opacity-30" />
        )}
      </div>
    </TableHead>
  )
}

// ---------------------------------------------------------------------------
// Category picker — pill-style buttons
// ---------------------------------------------------------------------------

function CategoryPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (cat: CategoryKey) => void
}) {
  const meta = getCategoryMeta(value)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <button
          className={`inline-flex items-center gap-1 whitespace-nowrap rounded-lg border px-2 py-1 text-xs font-medium transition-all hover:opacity-80 ${
            meta.badge || 'border-border text-muted-foreground'
          }`}
        >
          {meta.icon}
          {meta.value === 'none' ? <span className="text-muted-foreground">Categorize</span> : meta.label}
          <IconChevronDown className="size-2.5 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48" onClick={(e) => e.stopPropagation()}>
        {CATEGORIES.map((cat) => (
          <DropdownMenuItem
            key={cat.value}
            className="gap-2 text-sm"
            onSelect={() => onChange(cat.value)}
          >
            <span className={`flex items-center gap-1.5 ${cat.badge ? cat.badge.replace('bg-', 'text-').split(' ')[0] : 'text-muted-foreground'}`}>
              {cat.icon}
            </span>
            {cat.label}
            {cat.value === value && <span className="ml-auto text-xs opacity-50">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="relative mb-5 flex size-14 items-center justify-center rounded-full">
        <div className="absolute inset-0 rounded-full bg-blue-500/10" />
        <IconMailbox className="text-blue-400 relative size-7" />
      </div>
      <p className="text-foreground text-sm font-semibold">No {label} emails</p>
      <p className="text-muted-foreground mt-1.5 max-w-xs text-sm leading-relaxed">
        {label === 'filtered'
          ? 'Emails matching your filter keywords will appear here.'
          : label === 'interested'
          ? 'Mark emails as Interested to track them here.'
          : 'Received emails will appear here after the next sync.'}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Inbound message body
// ---------------------------------------------------------------------------

function InboundBody({
  bodyText,
  bodyHtml,
}: {
  bodyText: string | null
  bodyHtml: string | null
}) {
  const [showQuote, setShowQuote] = useState(false)
  const { reply, quoted, isHtml } = useMemo(
    () => splitQuotedReply(bodyText, bodyHtml),
    [bodyText, bodyHtml],
  )
  const hasReply = reply.trim().length > 0

  return (
    <>
      {isHtml ? (
        hasReply ? (
          <div
            className="prose prose-sm dark:prose-invert max-w-none text-sm"
            dangerouslySetInnerHTML={{ __html: reply }}
          />
        ) : (
          <p className="text-muted-foreground text-sm italic">(no message text)</p>
        )
      ) : (
        <pre className="text-foreground whitespace-pre-wrap font-sans text-sm leading-relaxed">
          {hasReply ? reply : '(empty)'}
        </pre>
      )}

      {quoted && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowQuote((v) => !v)}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs transition-colors"
          >
            <IconChevronDown
              className={`size-3 transition-transform duration-200 ${showQuote ? 'rotate-180' : ''}`}
            />
            {showQuote ? 'Hide quoted text' : 'Show quoted text'}
          </button>
          {showQuote &&
            (isHtml ? (
              <div
                className="border-border/30 mt-2 border-l-2 pl-3 opacity-70 prose prose-sm dark:prose-invert max-w-none text-sm"
                dangerouslySetInnerHTML={{ __html: quoted }}
              />
            ) : (
              <pre className="text-muted-foreground mt-2 whitespace-pre-wrap border-l-2 border-border/30 pl-3 font-sans text-xs leading-relaxed">
                {quoted}
              </pre>
            ))}
        </div>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Email detail + reply sheet — Telegram-style chat view
// ---------------------------------------------------------------------------

function EmailSheet({
  email,
  thread,
  onClose,
  onReplied,
  onCategoryChange,
}: {
  email: InboundRow
  thread: InboundRow[]
  onClose: () => void
  onReplied: (repliedAt: string) => void
  onCategoryChange: (id: number, cat: CategoryKey) => void
}) {
  const [replyBody, setReplyBody] = useState('')
  const [sending, startSending] = useTransition()
  const [outbound, setOutbound] = useState<OutboundMessage[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getOutboundMessages(email.id).then(setOutbound).catch(() => {})
  }, [email.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'instant' as ScrollBehavior })
  }, [outbound])

  function handleSend() {
    if (!replyBody.trim()) return
    startSending(async () => {
      const result = await replyToEmail(email.id, replyBody.trim())
      if (result.ok) {
        toast.success('Reply sent')
        setReplyBody('')
        getOutboundMessages(email.id).then(setOutbound).catch(() => {})
        onReplied(new Date().toISOString())
      } else {
        toast.error(result.error ?? 'Failed to send reply')
      }
    })
  }

  const conversation = [
    ...thread.map((m) => ({ kind: 'inbound' as const, date: m.receivedAt ?? '', data: m })),
    ...outbound.map((m) => ({ kind: 'outbound' as const, date: m.sentAt ?? '', data: m })),
  ].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <Sheet open onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 data-[side=right]:w-[92vw] data-[side=right]:sm:max-w-3xl data-[side=right]:lg:max-w-5xl">
        {/* Header */}
        <SheetHeader className="border-b border-border/60 px-6 py-4">
          <SheetTitle className="truncate text-base font-semibold">{email.subject || '(no subject)'}</SheetTitle>
          <div className="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-x-2 text-xs">
            <span>
              From:{' '}
              <span className="text-foreground font-medium">
                {email.fromName ? `${email.fromName} <${email.fromEmail}>` : email.fromEmail}
              </span>
            </span>
            <span className="text-border">·</span>
            <span>
              To: <span className="text-foreground">{email.toEmail}</span>
            </span>
            {email.connectionLabel && (
              <>
                <span className="text-border">·</span>
                <Badge variant="secondary" className="text-xs font-normal">
                  {email.connectionLabel}
                </Badge>
              </>
            )}
          </div>
          {/* Category row */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {CATEGORIES.filter((c) => c.value !== 'none').map((cat) => {
              const active = email.category === cat.value
              return (
                <button
                  key={cat.value}
                  onClick={() => onCategoryChange(email.id, cat.value)}
                  className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium transition-all duration-200 ${
                    active
                      ? cat.badge
                      : 'border-border text-muted-foreground hover:border-muted-foreground/40 hover:bg-muted/30'
                  }`}
                >
                  {cat.icon}
                  {cat.label}
                </button>
              )
            })}
          </div>
        </SheetHeader>

        {/* Telegram-style conversation thread */}
        <div className="min-h-0 flex-1 overflow-auto px-4 py-5 space-y-3">
          {conversation.length === 0 && (
            <p className="text-muted-foreground text-center text-sm py-8">Loading conversation…</p>
          )}
          {conversation.map((item) => {
            if (item.kind === 'outbound') {
              const msg = item.data
              return (
                <div key={`out-${msg.id}`} className="flex justify-end">
                  <div className="max-w-[80%]">
                    <div className="rounded-2xl rounded-tr-md border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm shadow-sm shadow-blue-500/5">
                      <pre className="text-foreground whitespace-pre-wrap font-sans text-sm leading-relaxed">
                        {msg.body ?? '(empty)'}
                      </pre>
                    </div>
                    <p className="mt-1.5 text-right text-xs text-muted-foreground pr-1">
                      {msg.fromEmail ? `${msg.fromEmail} · ` : ''}{formatDate(msg.sentAt)}
                    </p>
                  </div>
                </div>
              )
            }

            const msg = item.data
            const isHighlighted = msg.id === email.id
            return (
              <div key={`in-${msg.id}`} className="flex justify-start">
                <div className="max-w-[80%]">
                  <div
                    className={`rounded-2xl rounded-tl-md border px-4 py-3 text-sm transition-colors ${
                      isHighlighted
                        ? 'border-blue-500/30 bg-blue-500/5'
                        : 'border-border bg-card'
                    }`}
                  >
                    <InboundBody bodyText={msg.bodyText} bodyHtml={msg.bodyHtml} />
                  </div>
                  <p className="mt-1.5 text-left text-xs text-muted-foreground pl-1">
                    {msg.fromName || msg.fromEmail} · {formatDate(msg.receivedAt)}
                  </p>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {/* Reply form */}
        <div className="border-t border-border/60 bg-muted/10 px-6 py-4 space-y-3">
          <Label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Reply from {email.connectionFromEmail ?? email.toEmail}
          </Label>
          <Textarea
            placeholder="Write your reply..."
            className="min-h-32 resize-none border-border/60 bg-card focus-visible:border-blue-500/50 focus-visible:ring-blue-500/20 transition-colors"
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            disabled={sending}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={sending}>
              Close
            </Button>
            <Button size="sm" onClick={handleSend} disabled={sending || !replyBody.trim()}>
              {sending ? (
                <IconLoader className="size-4 animate-spin" />
              ) : (
                <IconSend className="size-4" />
              )}
              Send Reply
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ---------------------------------------------------------------------------
// Filter keywords dialog
// ---------------------------------------------------------------------------

function FilteredKeywordsDialog({
  initialKeywords,
  onClose,
}: {
  initialKeywords: string
  onClose: () => void
}) {
  const [value, setValue] = useState(initialKeywords)
  const [saving, startSaving] = useTransition()

  function handleSave() {
    startSaving(async () => {
      await saveFilteredKeywords(value)
      toast.success('Filter keywords saved')
      onClose()
    })
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-semibold">Filter keywords</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-muted-foreground text-sm leading-relaxed">
            Emails containing any of these keywords (in subject or body) will be moved to the
            Filtered tab. One keyword per line or separated by commas.
          </p>
          <Textarea
            className="min-h-32 resize-none border-border/60 bg-card font-mono text-sm focus-visible:border-blue-500/50 transition-colors"
            placeholder={"warmup\ntest email\nhello world"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={saving}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving && <IconLoader className="size-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Inbox table
// ---------------------------------------------------------------------------

function LastInteractionCell({ row }: { row: InboundRow }) {
  const repliedAt = row.repliedAt ? new Date(row.repliedAt) : null
  const receivedAt = row.receivedAt ? new Date(row.receivedAt) : null

  const isReply = repliedAt && (!receivedAt || repliedAt > receivedAt)
  const date = isReply ? row.repliedAt : row.receivedAt

  return (
    <div className="flex items-center gap-1.5">
      {isReply ? (
        <IconArrowUp className="size-3 shrink-0 text-blue-400" />
      ) : (
        <IconArrowDown className="size-3 shrink-0 text-emerald-400" />
      )}
      <span className="text-muted-foreground text-sm tabular-nums">{formatDate(date)}</span>
    </div>
  )
}

function InboxTable({
  rows,
  emptyLabel,
  onRowClick,
  onCategoryChange,
  showLastInteraction = false,
}: {
  rows: InboundRow[]
  emptyLabel: string
  onRowClick: (row: InboundRow) => void
  onCategoryChange: (id: number, cat: CategoryKey) => void
  showLastInteraction?: boolean
}) {
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  if (rows.length === 0) return <EmptyState label={emptyLabel} />

  const sorted = sortRows(rows, sortKey, sortDir, showLastInteraction)

  return (
    <Card className="border-border/60 overflow-hidden">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20">
                <TableHead className="w-8 pl-4" />
                <SortableHead label="From" sortKey="from" current={sortKey} dir={sortDir} onSort={handleSort} />
                <SortableHead label="Subject" sortKey="subject" current={sortKey} dir={sortDir} onSort={handleSort} />
                <SortableHead label="Category" sortKey="category" current={sortKey} dir={sortDir} onSort={handleSort} className="w-40" />
                <SortableHead label="Mailbox" sortKey="mailbox" current={sortKey} dir={sortDir} onSort={handleSort} />
                <SortableHead
                  label={showLastInteraction ? 'Last interaction' : 'Received'}
                  sortKey="date"
                  current={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((row) => {
                const isUnread = !row.isRead
                return (
                  <TableRow
                    key={row.id}
                    className={[
                      'cursor-pointer transition-colors',
                      isUnread
                        ? 'border-l-2 border-l-blue-500 bg-blue-500/[0.04] dark:bg-blue-500/[0.06] hover:bg-blue-500/[0.08] dark:hover:bg-blue-500/[0.1]'
                        : 'border-l-2 border-l-transparent hover:bg-muted/25 dark:hover:bg-foreground/[0.04]',
                    ].join(' ')}
                    onClick={() => onRowClick(row)}
                  >
                    <TableCell className="pl-4">
                      {row.isRead ? (
                        <IconMailOpened className="text-muted-foreground size-4" />
                      ) : (
                        <div className="relative">
                          <IconMail className="text-blue-500 size-4" />
                          <span className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-blue-500 ring-2 ring-card" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <p className={`text-sm leading-tight ${isUnread ? 'font-semibold' : 'font-normal'}`}>
                        {row.fromName || row.fromEmail}
                      </p>
                      {row.fromName && (
                        <p className="text-muted-foreground text-xs">{row.fromEmail}</p>
                      )}
                    </TableCell>
                    <TableCell className="max-w-72 truncate text-sm">
                      {row.subject || <span className="text-muted-foreground/30">(no subject)</span>}
                    </TableCell>
                    <TableCell>
                      <CategoryPicker
                        value={row.category}
                        onChange={(cat) => onCategoryChange(row.id, cat)}
                      />
                    </TableCell>
                    <TableCell>
                      {row.connectionLabel ? (
                        <Badge variant="secondary" className="text-xs font-normal">
                          {row.connectionLabel}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground/30 text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {showLastInteraction ? (
                        <LastInteractionCell row={row} />
                      ) : (
                        <span className="text-muted-foreground text-sm tabular-nums">{formatDate(row.receivedAt)}</span>
                      )}
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
// Main view
// ---------------------------------------------------------------------------

export function InboxView({
  emails,
  filteredKeywords,
}: {
  emails: InboundRow[]
  filteredKeywords: string
}) {
  const [search, setSearch] = useState('')
  const [selectedEmail, setSelectedEmail] = useState<InboundRow | null>(null)
  const [showKeywordsDialog, setShowKeywordsDialog] = useState(false)
  const [refreshing, startRefresh] = useTransition()
  const [localEmails, setLocalEmails] = useState<InboundRow[]>(emails)

  const inbox = useMemo(
    () => filterRows(localEmails.filter((e) => !e.isFiltered), search),
    [localEmails, search],
  )
  const interested = useMemo(
    () => filterRows(localEmails.filter((e) => !e.isFiltered && e.category === 'interested'), search),
    [localEmails, search],
  )
  const filtered = useMemo(
    () => filterRows(localEmails.filter((e) => e.isFiltered), search),
    [localEmails, search],
  )

  const unreadCount = localEmails.filter((e) => !e.isFiltered && !e.isRead).length

  function handleRowClick(row: InboundRow) {
    setSelectedEmail(row)
    if (!row.isRead) {
      setLocalEmails((prev) =>
        prev.map((e) => (e.id === row.id ? { ...e, isRead: true } : e)),
      )
      markRead(row.id).catch(() => {})
    }
  }

  function handleCategoryChange(id: number, cat: CategoryKey) {
    setLocalEmails((prev) =>
      prev.map((e) => (e.id === id ? { ...e, category: cat } : e)),
    )
    if (selectedEmail?.id === id) {
      setSelectedEmail((prev) => prev ? { ...prev, category: cat } : prev)
    }
    categorizeEmail(id, cat).catch(() => {
      toast.error('Failed to save category')
    })
  }

  function handleRefresh() {
    startRefresh(async () => {
      const result = await triggerFetch()
      if (result.ok) {
        toast.success('Inbox refreshed')
      } else {
        toast.error(result.error ?? 'Refresh failed')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="relative flex size-9 items-center justify-center rounded-xl bg-blue-500/10">
              <div className="absolute inset-0 rounded-xl bg-blue-500/15 blur-md" />
              <IconMailbox className="text-blue-400 relative size-[18px]" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Inbox</h1>
            {unreadCount > 0 && (
              <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-muted-foreground mt-1.5 ml-12 text-sm">
            All incoming email across your connected mailboxes.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowKeywordsDialog(true)}
          >
            <IconSettings className="size-4" />
            Filter keywords
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <IconLoader className="size-4 animate-spin" />
            ) : (
              <IconRefresh className="size-4" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <IconSearch className="text-muted-foreground absolute left-3.5 top-1/2 size-4 -translate-y-1/2" />
        <Input
          className="pl-10 border-border/60 bg-card focus-visible:border-blue-500/50 focus-visible:ring-blue-500/20 transition-colors"
          placeholder="Search by sender, subject, or content..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="inbox">
        <TabsList variant="line" className="border-b border-border/60">
          <TabsTrigger value="inbox" className="gap-1.5">
            <IconMail className="size-3.5" />
            Inbox
            {unreadCount > 0 && (
              <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg px-1.5 py-0.5 text-xs font-medium tabular-nums transition-colors">
                {unreadCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="interested" className="gap-1.5">
            <IconCircleCheck className="size-3.5" />
            Interested
            {interested.length > 0 && (
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg px-1.5 py-0.5 text-xs font-medium tabular-nums transition-colors">
                {interested.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="filtered" className="gap-1.5">
            <IconFlame className="size-3.5" />
            Filtered
            {filtered.length > 0 && (
              <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-lg px-1.5 py-0.5 text-xs font-medium tabular-nums transition-colors">
                {filtered.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="mt-5">
          <InboxTable
            rows={inbox}
            emptyLabel="inbox"
            onRowClick={handleRowClick}
            onCategoryChange={handleCategoryChange}
          />
        </TabsContent>

        <TabsContent value="interested" className="mt-5">
          <InboxTable
            rows={interested}
            emptyLabel="interested"
            onRowClick={handleRowClick}
            onCategoryChange={handleCategoryChange}
            showLastInteraction
          />
        </TabsContent>

        <TabsContent value="filtered" className="mt-5">
          <InboxTable
            rows={filtered}
            emptyLabel="filtered"
            onRowClick={handleRowClick}
            onCategoryChange={handleCategoryChange}
          />
        </TabsContent>

      </Tabs>

      {selectedEmail && (
        <EmailSheet
          email={selectedEmail}
          thread={localEmails
            .filter((e) => e.fromEmail === selectedEmail.fromEmail)
            .sort((a, b) => (a.receivedAt ?? '').localeCompare(b.receivedAt ?? ''))}
          onClose={() => setSelectedEmail(null)}
          onReplied={(repliedAt) => {
            setLocalEmails((prev) =>
              prev.map((e) =>
                e.id === selectedEmail.id ? { ...e, repliedAt, isRead: true } : e,
              ),
            )
          }}
          onCategoryChange={handleCategoryChange}
        />
      )}

      {showKeywordsDialog && (
        <FilteredKeywordsDialog
          initialKeywords={filteredKeywords}
          onClose={() => setShowKeywordsDialog(false)}
        />
      )}
    </div>
  )
}
