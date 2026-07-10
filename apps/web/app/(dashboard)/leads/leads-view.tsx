'use client'

import { useState, useTransition, useEffect, useRef, useMemo } from 'react'
import { toast } from 'sonner'
import { Button } from '@workspace/ui/components/button'
import { Badge } from '@workspace/ui/components/badge'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
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
} from '@workspace/ui/components/table'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import {
  IconUpload,
  IconUsers,
  IconFolderOpen,
  IconFolders,
  IconDots,
  IconTrash,
  IconLoader,
  IconCheck,
  IconX,
  IconUserPlus,
  IconSearch,
  IconArrowUp,
  IconArrowDown,
  IconArrowsSort,
  IconChevronLeft,
  IconChevronRight,
  IconFileText,
  IconSparkles,
} from '@tabler/icons-react'
import { parseCSV, detectMapping, mapCSVRows, LEAD_FIELDS } from '@workspace/core/csv'
import type { ColumnMapping } from '@workspace/core/csv'
import { createList, deleteList, importLeads, deleteLead, createLead } from './actions'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ListWithCount = {
  id: number
  name: string
  leadCount: number
  createdAt: string
}

export type LeadRow = {
  id: number
  listId: number
  firstName: string
  lastName: string
  email: string
  company: string
  status: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const LEAD_FIELD_LABELS: Record<(typeof LEAD_FIELDS)[number], string> = {
  firstName: 'First name',
  lastName: 'Last name',
  email: 'Email (required)',
  company: 'Company',
  openingLine: 'Opening line',
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; badge: string; text: string }> = {
  new: {
    label: 'New',
    dot: 'bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.5)]',
    badge: 'bg-sky-500/10 text-sky-400 border-sky-500/15 hover:bg-sky-500/15',
    text: 'text-sky-400',
  },
  contacted: {
    label: 'Contacted',
    dot: 'bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.5)]',
    badge: 'bg-blue-500/10 text-blue-400 border-blue-500/15 hover:bg-blue-500/15',
    text: 'text-blue-400',
  },
  replied: {
    label: 'Replied',
    dot: 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]',
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15 hover:bg-emerald-500/15',
    text: 'text-emerald-400',
  },
  bounced: {
    label: 'Bounced',
    dot: 'bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.5)]',
    badge: 'bg-red-500/10 text-red-400 border-red-500/15 hover:bg-red-500/15',
    text: 'text-red-400',
  },
  unsubscribed: {
    label: 'Unsubscribed',
    dot: 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]',
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/15 hover:bg-amber-500/15',
    text: 'text-amber-400',
  },
}

const STEP_CONFIG: Record<string, { label: string; desc: string }> = {
  upload: { label: 'Upload', desc: 'Select your list and CSV file' },
  map: { label: 'Map Columns', desc: 'Match CSV headers to lead fields' },
  preview: { label: 'Preview', desc: 'Review before importing' },
  done: { label: 'Complete', desc: '' },
}

function getInitials(firstName: string, lastName: string): string {
  const f = firstName?.charAt(0)?.toUpperCase() ?? ''
  const l = lastName?.charAt(0)?.toUpperCase() ?? ''
  return f + l || '?'
}

const AVATAR_COLORS = [
  'bg-blue-500/15 text-blue-400',
  'bg-indigo-500/15 text-indigo-400',
  'bg-violet-500/15 text-violet-400',
  'bg-purple-500/15 text-purple-400',
  'bg-sky-500/15 text-sky-400',
  'bg-teal-500/15 text-teal-400',
  'bg-emerald-500/15 text-emerald-400',
  'bg-cyan-500/15 text-cyan-400',
]

function getAvatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]!
}

// ---------------------------------------------------------------------------
// Status Badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status]
  if (!config) {
    return (
      <Badge variant="outline" className="rounded-md border-border text-xs text-muted-foreground">
        {status}
      </Badge>
    )
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium ${config.badge}`}>
      <span className={`size-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Lead row actions
// ---------------------------------------------------------------------------

function LeadRowActions({ lead }: { lead: LeadRow }) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      await deleteLead(lead.id)
      toast.success('Lead removed')
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
          disabled={isPending}
        >
          {isPending ? (
            <IconLoader className="size-4 animate-spin" />
          ) : (
            <IconDots className="size-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem variant="destructive" onSelect={handleDelete} className="gap-2">
          <IconTrash className="size-3.5 text-destructive" />
          Delete lead
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ---------------------------------------------------------------------------
// List table row
// ---------------------------------------------------------------------------

function ListTableRow({
  list,
  onImport,
  onAddLead,
}: {
  list: ListWithCount
  onImport: () => void
  onAddLead: () => void
}) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      await deleteList(list.id)
      toast.success(`"${list.name}" deleted`)
    })
  }

  return (
    <TableRow className="border-border/50 transition-colors hover:bg-muted/30">
      <TableCell className="py-3.5 font-medium text-sm">{list.name}</TableCell>
      <TableCell className="py-3.5 text-muted-foreground text-sm">
        {list.leadCount} {list.leadCount === 1 ? 'lead' : 'leads'}
      </TableCell>
      <TableCell className="py-3.5 text-muted-foreground text-xs">
        {new Date(list.createdAt).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })}
      </TableCell>
      <TableCell className="py-3.5">
        <div className="flex items-center justify-end gap-1.5">
          <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-lg text-xs" onClick={onAddLead}>
            <IconUserPlus className="size-3.5" />
            Add lead
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-lg text-xs" onClick={onImport}>
            <IconUpload className="size-3.5" />
            Import CSV
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
                disabled={isPending}
              >
                {isPending ? (
                  <IconLoader className="size-4 animate-spin" />
                ) : (
                  <IconDots className="size-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem variant="destructive" onSelect={handleDelete} className="gap-2">
                <IconTrash className="size-3.5 text-destructive" />
                Delete list
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  )
}

// ---------------------------------------------------------------------------
// New list dialog
// ---------------------------------------------------------------------------

function NewListDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [name, setName] = useState('')
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (open) setName('')
  }, [open])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      try {
        await createList(name)
        toast.success('List created')
        onOpenChange(false)
      } catch {
        toast.error('Failed to create list')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm border-border/60">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-base font-semibold">Create new list</DialogTitle>
          <p className="text-xs text-muted-foreground">Organize your leads into a named group.</p>
        </DialogHeader>
        <form id="new-list-form" onSubmit={handleSubmit} className="grid gap-4 pt-2">
          <div className="grid gap-2">
            <Label htmlFor="list-name" className="text-xs font-medium text-foreground-secondary">
              List name
            </Label>
            <Input
              id="list-name"
              placeholder="Q2 Prospects"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              className="h-9 rounded-lg text-sm"
            />
          </div>
        </form>
        <DialogFooter showCloseButton>
          <Button
            type="submit"
            form="new-list-form"
            disabled={isPending || !name.trim()}
            className="h-9 rounded-lg"
          >
            {isPending && <IconLoader className="size-3.5 animate-spin" />}
            Create list
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// New lead dialog
// ---------------------------------------------------------------------------

function NewLeadDialog({
  open,
  onOpenChange,
  lists,
  defaultListId,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  lists: ListWithCount[]
  defaultListId?: number
}) {
  const [listId, setListId] = useState('')
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [company, setCompany] = useState('')
  const [openingLine, setOpeningLine] = useState('')
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (open) {
      setListId(defaultListId ? String(defaultListId) : lists[0] ? String(lists[0].id) : '')
      setEmail('')
      setFirstName('')
      setLastName('')
      setCompany('')
      setOpeningLine('')
    }
  }, [open, defaultListId, lists])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      try {
        await createLead({
          listId: Number(listId),
          email,
          firstName,
          lastName,
          company,
          openingLine,
        })
        toast.success('Lead added')
        onOpenChange(false)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to add lead')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-border/60">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-base font-semibold">Add new lead</DialogTitle>
          <p className="text-xs text-muted-foreground">Manually add a contact to a lead list.</p>
        </DialogHeader>
        <form id="new-lead-form" onSubmit={handleSubmit} className="grid gap-4 pt-1">
          <div className="grid gap-2">
            <Label htmlFor="lead-list" className="text-xs font-medium text-foreground-secondary">
              List
            </Label>
            <Select value={listId} onValueChange={setListId} required>
              <SelectTrigger id="lead-list" className="h-9 rounded-lg">
                <SelectValue placeholder="Select a list…" />
              </SelectTrigger>
              <SelectContent>
                {lists.map((l) => (
                  <SelectItem key={l.id} value={String(l.id)}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="lead-email" className="text-xs font-medium text-foreground-secondary">
              Email <span className="text-muted-foreground">(required)</span>
            </Label>
            <Input
              id="lead-email"
              type="email"
              placeholder="jane@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="h-9 rounded-lg text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="lead-first" className="text-xs font-medium text-foreground-secondary">
                First name
              </Label>
              <Input
                id="lead-first"
                placeholder="Jane"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="h-9 rounded-lg text-sm"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lead-last" className="text-xs font-medium text-foreground-secondary">
                Last name
              </Label>
              <Input
                id="lead-last"
                placeholder="Smith"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="h-9 rounded-lg text-sm"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="lead-company" className="text-xs font-medium text-foreground-secondary">
              Company
            </Label>
            <Input
              id="lead-company"
              placeholder="Acme Corp"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="h-9 rounded-lg text-sm"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="lead-opening" className="text-xs font-medium text-foreground-secondary">
              Opening line
            </Label>
            <Input
              id="lead-opening"
              placeholder="Loved your recent post on…"
              value={openingLine}
              onChange={(e) => setOpeningLine(e.target.value)}
              className="h-9 rounded-lg text-sm"
            />
          </div>
        </form>
        <DialogFooter showCloseButton>
          <Button
            type="submit"
            form="new-lead-form"
            disabled={isPending || !email.trim() || !listId}
            className="h-9 rounded-lg"
          >
            {isPending && <IconLoader className="size-3.5 animate-spin" />}
            Add lead
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Import CSV wizard dialog
// ---------------------------------------------------------------------------

type WizardStep = 'upload' | 'map' | 'preview' | 'done'

const WIZARD_STEPS: WizardStep[] = ['upload', 'map', 'preview', 'done']

function ImportWizardDialog({
  open,
  onOpenChange,
  lists,
  defaultListId,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  lists: ListWithCount[]
  defaultListId?: number
}) {
  const [step, setStep] = useState<WizardStep>('upload')
  const [listId, setListId] = useState<string>('')
  const [newListName, setNewListName] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<ColumnMapping>({})
  const [importResult, setImportResult] = useState<{ inserted: number; skipped: number } | null>(null)
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setStep('upload')
      setListId(defaultListId ? String(defaultListId) : '')
      setNewListName('')
      setHeaders([])
      setRawRows([])
      setMapping({})
      setImportResult(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [open, defaultListId])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const { headers: h, rows: r, errors } = parseCSV(text)
      if (errors.length > 0) {
        toast.error(`CSV error: ${errors[0]}`)
        return
      }
      if (h.length === 0) {
        toast.error('No columns detected in CSV')
        return
      }
      setHeaders(h)
      setRawRows(r)
      setMapping(detectMapping(h))
    }
    reader.readAsText(file)
  }

  function handleImport() {
    startTransition(async () => {
      try {
        let targetListId: number
        if (listId === 'new') {
          targetListId = await createList(newListName.trim())
        } else {
          targetListId = Number(listId)
        }
        const allMapped = mapCSVRows(rawRows, mapping)
        const result = await importLeads(targetListId, allMapped)
        setImportResult(result)
        setStep('done')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Import failed')
      }
    })
  }

  const canProceedFromUpload =
    rawRows.length > 0 &&
    (listId === 'new' ? newListName.trim().length > 0 : listId !== '')

  const previewLeads =
    step === 'preview' || step === 'done' ? mapCSVRows(rawRows.slice(0, 5), mapping) : []

  const totalMapped = step === 'preview' ? mapCSVRows(rawRows, mapping).length : 0

  const currentStepIndex = WIZARD_STEPS.indexOf(step)
  const progressPct = step === 'done' ? 100 : ((currentStepIndex + 1) / WIZARD_STEPS.length) * 100

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-2xl border-border/60"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
              <IconFileText className="size-4 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">Import CSV</DialogTitle>
              {step !== 'done' && (
                <p className="text-xs text-muted-foreground">{STEP_CONFIG[step]?.desc}</p>
              )}
            </div>
          </div>

          {/* Step indicator */}
          {step !== 'done' && (
            <div className="flex items-center gap-1.5 pt-1">
              {WIZARD_STEPS.filter((s) => s !== 'done').map((s, idx) => {
                const isActive = s === step
                const isPast = idx < currentStepIndex
                return (
                  <div key={s} className="flex items-center gap-1.5 flex-1">
                    <div className="flex items-center gap-1.5">
                      <div
                        className={`flex size-5 items-center justify-center rounded-full text-[10px] font-semibold transition-colors ${
                          isPast
                            ? 'bg-primary text-primary-foreground'
                            : isActive
                              ? 'bg-primary/15 text-primary ring-1 ring-primary/30'
                              : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {isPast ? <IconCheck className="size-3" /> : idx + 1}
                      </div>
                      <span
                        className={`hidden sm:inline text-[11px] font-medium transition-colors ${
                          isActive ? 'text-foreground' : 'text-muted-foreground'
                        }`}
                      >
                        {STEP_CONFIG[s]?.label}
                      </span>
                    </div>
                    {idx < 2 && (
                      <div className="flex-1 h-px bg-border/60">
                        <div
                          className="h-full bg-primary/60 transition-all duration-300"
                          style={{ width: isPast ? '100%' : '0%' }}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Progress bar */}
          {step !== 'done' && (
            <div className="h-0.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary/70 transition-all duration-300 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          )}
        </DialogHeader>

        {/* Step 1 — Upload */}
        {step === 'upload' && (
          <div className="grid gap-4 pt-1">
            <div className="grid gap-2">
              <Label className="text-xs font-medium text-foreground-secondary">
                Import into list
              </Label>
              <Select value={listId} onValueChange={setListId}>
                <SelectTrigger className="h-9 rounded-lg">
                  <SelectValue placeholder="Select a list…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">+ Create new list</SelectItem>
                  {lists.map((l) => (
                    <SelectItem key={l.id} value={String(l.id)}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {listId === 'new' && (
              <div className="grid gap-2">
                <Label htmlFor="import-list-name" className="text-xs font-medium text-foreground-secondary">
                  New list name
                </Label>
                <Input
                  id="import-list-name"
                  placeholder="Q2 Prospects"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  autoFocus
                  className="h-9 rounded-lg text-sm"
                />
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="import-file" className="text-xs font-medium text-foreground-secondary">
                CSV file
              </Label>
              <div className="relative">
                <Input
                  ref={fileInputRef}
                  id="import-file"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  className="h-9 rounded-lg text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-primary hover:file:bg-primary/15"
                />
              </div>
              {rawRows.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {rawRows.length} rows · {headers.length} columns detected
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step 2 — Map columns */}
        {step === 'map' && (
          <div className="grid gap-3 pt-1">
            <div className="flex items-start gap-2 rounded-lg bg-muted/30 border border-border/40 p-3">
              <IconSparkles className="size-4 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Map CSV columns to lead fields. Only <span className="font-medium text-foreground">Email</span> is required for a successful import.
              </p>
            </div>
            {LEAD_FIELDS.map((field) => {
              const isMapped = !!mapping[field]
              const isRequired = field === 'email'
              return (
                <div
                  key={field}
                  className="grid grid-cols-[140px_1fr_28px] items-center gap-3"
                >
                  <Label className="text-xs font-medium text-foreground-secondary truncate">
                    {LEAD_FIELD_LABELS[field]}
                  </Label>
                  <Select
                    value={mapping[field] ?? '__skip__'}
                    onValueChange={(v) =>
                      setMapping((prev) => ({
                        ...prev,
                        [field]: v === '__skip__' ? undefined : v,
                      }))
                    }
                  >
                    <SelectTrigger className="h-8 rounded-lg text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__skip__">— Skip —</SelectItem>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isMapped ? (
                    <IconCheck className="size-4 shrink-0 text-emerald-400" />
                  ) : isRequired ? (
                    <IconX className="size-4 shrink-0 text-red-400" />
                  ) : (
                    <IconX className="size-4 shrink-0 text-muted-foreground/25" />
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Step 3 — Preview */}
        {step === 'preview' && (
          <div className="grid gap-3 pt-1">
            <p className="text-xs text-muted-foreground">
              {totalMapped} lead{totalMapped !== 1 ? 's' : ''} ready to import. Showing first {Math.min(5, previewLeads.length)}.
            </p>
            <div className="overflow-x-auto rounded-lg border border-border/50">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[11px] font-semibold text-muted-foreground h-9">First</TableHead>
                    <TableHead className="text-[11px] font-semibold text-muted-foreground h-9">Last</TableHead>
                    <TableHead className="text-[11px] font-semibold text-muted-foreground h-9">Email</TableHead>
                    <TableHead className="text-[11px] font-semibold text-muted-foreground h-9">Company</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewLeads.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-muted-foreground py-8 text-center text-xs"
                      >
                        No valid rows found. Make sure the Email column is mapped.
                      </TableCell>
                    </TableRow>
                  ) : (
                    previewLeads.map((lead, i) => (
                      <TableRow key={i} className="border-border/30">
                        <TableCell className="text-xs py-2.5">{lead.firstName || '—'}</TableCell>
                        <TableCell className="text-xs py-2.5">{lead.lastName || '—'}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground py-2.5">{lead.email}</TableCell>
                        <TableCell className="text-xs text-muted-foreground py-2.5">{lead.company || '—'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Done */}
        {step === 'done' && importResult && (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/15">
              <div className="flex size-8 items-center justify-center rounded-full bg-emerald-500/15">
                <IconCheck className="size-5 text-emerald-400" />
              </div>
            </div>
            <p className="text-sm font-semibold">Import complete</p>
            <p className="text-xs text-muted-foreground text-center max-w-[280px]">
              {importResult.inserted} lead{importResult.inserted !== 1 ? 's' : ''} imported
              {importResult.skipped > 0 &&
                `, ${importResult.skipped} duplicate${importResult.skipped !== 1 ? 's' : ''} skipped`}
              .
            </p>
          </div>
        )}

        <DialogFooter>
          {step !== 'upload' && step !== 'done' && (
            <Button
              variant="outline"
              onClick={() => setStep(step === 'map' ? 'upload' : 'map')}
              disabled={isPending}
              className="h-9 rounded-lg"
            >
              Back
            </Button>
          )}
          {step === 'upload' && (
            <Button onClick={() => setStep('map')} disabled={!canProceedFromUpload} className="h-9 rounded-lg">
              Next
            </Button>
          )}
          {step === 'map' && (
            <Button onClick={() => setStep('preview')} disabled={!mapping.email} className="h-9 rounded-lg">
              Next — Preview
            </Button>
          )}
          {step === 'preview' && (
            <Button onClick={handleImport} disabled={isPending || totalMapped === 0} className="h-9 rounded-lg">
              {isPending && <IconLoader className="size-3.5 animate-spin" />}
              Import {totalMapped} lead{totalMapped !== 1 ? 's' : ''}
            </Button>
          )}
          {step === 'done' && (
            <Button onClick={() => onOpenChange(false)} className="h-9 rounded-lg">
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Manage lists dialog
// ---------------------------------------------------------------------------

function ManageListsDialog({
  open,
  onOpenChange,
  lists,
  onImport,
  onAddLead,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  lists: ListWithCount[]
  onImport: (listId: number) => void
  onAddLead: (listId: number) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl border-border/60">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-base font-semibold">Manage lists</DialogTitle>
          <p className="text-xs text-muted-foreground">
            View, add leads to, or delete your lead lists.
          </p>
        </DialogHeader>
        {lists.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14">
            <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/8 border border-primary/10">
              <IconUsers className="size-7 text-primary/70" />
            </div>
            <p className="mb-1 text-sm font-medium">No lists yet</p>
            <p className="max-w-[260px] text-center text-xs text-muted-foreground leading-relaxed">
              Create a list to start organizing and tracking your outreach contacts.
            </p>
          </div>
        ) : (
          <div className="overflow-y-auto max-h-[60vh] rounded-lg border border-border/50">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[11px] font-semibold text-muted-foreground h-10">List name</TableHead>
                  <TableHead className="text-[11px] font-semibold text-muted-foreground h-10">Leads</TableHead>
                  <TableHead className="text-[11px] font-semibold text-muted-foreground h-10">Created</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lists.map((list) => (
                  <ListTableRow
                    key={list.id}
                    list={list}
                    onAddLead={() => onAddLead(list.id)}
                    onImport={() => onImport(list.id)}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Sortable head
// ---------------------------------------------------------------------------

type SortKey = 'name' | 'email' | 'company' | 'list' | 'status'
type SortDir = 'asc' | 'desc'

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

function SortableHead({
  label,
  sortKey,
  activeKey,
  dir,
  onSort,
}: {
  label: string
  sortKey: SortKey
  activeKey: SortKey
  dir: SortDir
  onSort: (key: SortKey) => void
}) {
  const isActive = activeKey === sortKey
  return (
    <TableHead>
      <button
        type="button"
        className={`flex items-center gap-1.5 rounded-md px-1 py-0.5 transition-colors ${
          isActive
            ? 'text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        onClick={() => onSort(sortKey)}
      >
        <span className="text-[11px] font-semibold uppercase tracking-wider">{label}</span>
        {isActive ? (
          dir === 'asc' ? (
            <IconArrowUp className="size-3.5 text-primary" />
          ) : (
            <IconArrowDown className="size-3.5 text-primary" />
          )
        ) : (
          <IconArrowsSort className="size-3.5 opacity-40" />
        )}
      </button>
    </TableHead>
  )
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export function LeadsView({
  lists,
  leads,
}: {
  lists: ListWithCount[]
  leads: LeadRow[]
}) {
  const [addListOpen, setAddListOpen] = useState(false)
  const [manageListsOpen, setManageListsOpen] = useState(false)
  const [addLeadOpen, setAddLeadOpen] = useState(false)
  const [addLeadDefaultListId, setAddLeadDefaultListId] = useState<number | undefined>(undefined)
  const [importOpen, setImportOpen] = useState(false)
  const [importDefaultListId, setImportDefaultListId] = useState<number | undefined>(undefined)

  const [search, setSearch] = useState('')
  const [listFilter, setListFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  const listNameMap = useMemo(() => new Map(lists.map((l) => [l.id, l.name])), [lists])

  function openAddLead(listId?: number) {
    setAddLeadDefaultListId(listId)
    setAddLeadOpen(true)
  }

  function openImport(listId?: number) {
    setImportDefaultListId(listId)
    setImportOpen(true)
  }

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPage(1)
  }

  const filteredLeads = useMemo(() => {
    const q = search.trim().toLowerCase()
    return leads.filter((lead) => {
      if (listFilter !== 'all' && String(lead.listId) !== listFilter) return false
      if (statusFilter !== 'all' && lead.status !== statusFilter) return false
      if (q) {
        const haystack = [lead.firstName, lead.lastName, lead.email, lead.company]
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [leads, search, listFilter, statusFilter])

  const sortedLeads = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1
    return [...filteredLeads].sort((a, b) => {
      let av = ''
      let bv = ''
      switch (sortKey) {
        case 'name':
          av = `${a.firstName} ${a.lastName}`.trim().toLowerCase()
          bv = `${b.firstName} ${b.lastName}`.trim().toLowerCase()
          break
        case 'email':
          av = a.email.toLowerCase()
          bv = b.email.toLowerCase()
          break
        case 'company':
          av = a.company.toLowerCase()
          bv = b.company.toLowerCase()
          break
        case 'list':
          av = (listNameMap.get(a.listId) ?? '').toLowerCase()
          bv = (listNameMap.get(b.listId) ?? '').toLowerCase()
          break
        case 'status':
          av = a.status.toLowerCase()
          bv = b.status.toLowerCase()
          break
      }
      return av < bv ? -1 * dir : av > bv ? 1 * dir : 0
    })
  }, [filteredLeads, sortKey, sortDir, listNameMap])

  const totalPages = Math.max(1, Math.ceil(sortedLeads.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pagedLeads = sortedLeads.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  function updateSearch(value: string) {
    setSearch(value)
    setPage(1)
  }

  function updateListFilter(value: string) {
    setListFilter(value)
    setPage(1)
  }

  function updateStatusFilter(value: string) {
    setStatusFilter(value)
    setPage(1)
  }

  function updatePageSize(value: string) {
    setPageSize(Number(value))
    setPage(1)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Leads</h1>
          <p className="text-xs text-muted-foreground">
            Manage your lead lists and contacts.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="gap-2 h-9 rounded-lg border-border/60"
            onClick={() => setManageListsOpen(true)}
          >
            <IconFolders className="size-4 text-muted-foreground" />
            <span className="text-sm">Manage lists</span>
          </Button>
          <Button
            variant="outline"
            className="gap-2 h-9 rounded-lg border-border/60"
            onClick={() => setAddListOpen(true)}
          >
            <IconFolderOpen className="size-4 text-muted-foreground" />
            <span className="text-sm">New list</span>
          </Button>
          <Button
            variant="outline"
            className="gap-2 h-9 rounded-lg border-border/60"
            onClick={() => openAddLead()}
            disabled={lists.length === 0}
          >
            <IconUserPlus className="size-4 text-muted-foreground" />
            <span className="text-sm">Add lead</span>
          </Button>
          <Button
            className="gap-2 h-9 rounded-lg shadow-[0_0_12px_rgba(59,130,246,0.15)]"
            onClick={() => openImport()}
          >
            <IconUpload className="size-4" />
            <span className="text-sm">Import CSV</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/40 bg-muted/8 p-2">
        <div className="relative flex-1 min-w-[200px]">
          <IconSearch className="text-muted-foreground/70 absolute left-3 top-1/2 size-3.5 -translate-y-1/2" />
          <Input
            className="h-8 rounded-lg border-border/50 pl-8 text-xs focus:border-primary/40 focus:ring-1 focus:ring-primary/20"
            placeholder="Search by name, email, or company..."
            value={search}
            onChange={(e) => updateSearch(e.target.value)}
          />
        </div>
        <Select value={listFilter} onValueChange={updateListFilter}>
          <SelectTrigger className="h-8 w-[160px] rounded-lg border-border/50 text-xs">
            <SelectValue placeholder="List" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All lists</SelectItem>
            {lists.map((l) => (
              <SelectItem key={l.id} value={String(l.id)}>
                {l.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={updateStatusFilter}>
          <SelectTrigger className="h-8 w-[150px] rounded-lg border-border/50 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="replied">Replied</SelectItem>
            <SelectItem value="bounced">Bounced</SelectItem>
            <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
          </SelectContent>
        </Select>
        <span className="ml-auto whitespace-nowrap text-[11px] text-muted-foreground tabular-nums">
          {sortedLeads.length} {sortedLeads.length === 1 ? 'lead' : 'leads'}
        </span>
      </div>

      {/* Table card */}
      <Card className="border-border/50 overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-border/60">
                <SortableHead
                  label="Name"
                  sortKey="name"
                  activeKey={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                />
                <SortableHead
                  label="Email"
                  sortKey="email"
                  activeKey={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                />
                <SortableHead
                  label="Company"
                  sortKey="company"
                  activeKey={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                />
                <SortableHead
                  label="List"
                  sortKey="list"
                  activeKey={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                />
                <SortableHead
                  label="Status"
                  sortKey="status"
                  activeKey={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                />
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedLeads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/40 text-muted-foreground/40">
                        <IconUsers className="size-6" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground-secondary">
                          {leads.length === 0
                            ? 'No leads yet'
                            : 'No results found'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 max-w-[260px] mx-auto">
                          {leads.length === 0
                            ? 'Import a CSV or add a lead manually to get started.'
                            : 'Try adjusting your search or filters.'}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                pagedLeads.map((lead) => {
                  const displayName = [lead.firstName, lead.lastName].filter(Boolean).join(' ') || '—'
                  const initials = getInitials(lead.firstName, lead.lastName)
                  const avatarColor = getAvatarColor(displayName)
                  return (
                    <TableRow
                      key={lead.id}
                      className="border-border/30 transition-colors hover:bg-muted/20"
                    >
                      <TableCell className="py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${avatarColor}`}
                          >
                            {initials}
                          </div>
                          <span className="text-sm font-medium truncate max-w-[180px]">
                            {displayName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 text-xs text-muted-foreground font-mono">
                        {lead.email}
                      </TableCell>
                      <TableCell className="py-3 text-xs text-muted-foreground">
                        {lead.company || <span className="text-muted-foreground/50">—</span>}
                      </TableCell>
                      <TableCell className="py-3 text-xs text-muted-foreground">
                        {listNameMap.get(lead.listId) ?? <span className="text-muted-foreground/50">—</span>}
                      </TableCell>
                      <TableCell className="py-3">
                        <StatusBadge status={lead.status} />
                      </TableCell>
                      <TableCell className="py-3">
                        <LeadRowActions lead={lead} />
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Rows per page</span>
          <Select value={String(pageSize)} onValueChange={updatePageSize}>
            <SelectTrigger className="h-8 w-[64px] rounded-lg border-border/50 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground tabular-nums">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-8 rounded-lg border-border/50"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <IconChevronLeft className="size-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8 rounded-lg border-border/50"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <IconChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <ManageListsDialog
        open={manageListsOpen}
        onOpenChange={setManageListsOpen}
        lists={lists}
        onAddLead={(id) => {
          setManageListsOpen(false)
          openAddLead(id)
        }}
        onImport={(id) => {
          setManageListsOpen(false)
          openImport(id)
        }}
      />
      <NewListDialog open={addListOpen} onOpenChange={setAddListOpen} />
      <NewLeadDialog
        open={addLeadOpen}
        onOpenChange={setAddLeadOpen}
        lists={lists}
        defaultListId={addLeadDefaultListId}
      />
      <ImportWizardDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        lists={lists}
        defaultListId={importDefaultListId}
      />
    </div>
  )
}
