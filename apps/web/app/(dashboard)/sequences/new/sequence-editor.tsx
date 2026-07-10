'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@workspace/ui/components/card'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import { Textarea } from '@workspace/ui/components/textarea'
import { Separator } from '@workspace/ui/components/separator'
import { Badge } from '@workspace/ui/components/badge'
import { Checkbox } from '@workspace/ui/components/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import {
  IconPlus,
  IconEye,
  IconPencil,
  IconArrowLeft,
  IconDeviceFloppy,
  IconTrash,
} from '@tabler/icons-react'
import { expandSpintax } from '@workspace/core/spintax'
import { renderVariables } from '@workspace/core/variables'
import { createSequence, updateSequence } from '../actions'

type LeadPreview = {
  id: number
  firstName: string
  lastName: string
  email: string
  company: string
  openingLine: string
  customFields: Record<string, string> | null
}

type Step = {
  subject: string
  body: string
  delayDays: number
  sameThread: boolean
}

const DEMO_LEAD: LeadPreview = {
  id: -1,
  firstName: 'Sarah',
  lastName: 'Chen',
  email: 'sarah@acmecorp.com',
  company: 'Acme Corp',
  openingLine: 'I noticed Acme just closed your Series B — congrats!',
  customFields: {},
}

function makeVars(lead: LeadPreview) {
  return {
    firstName: lead.firstName,
    lastName: lead.lastName,
    email: lead.email,
    company: lead.company,
    openingLine: lead.openingLine,
    ...(lead.customFields ?? {}),
  }
}

type SequenceEditorProps = {
  leads: LeadPreview[]
  editId?: number
  initialName?: string
  initialSteps?: Step[]
}

export function SequenceEditor({
  leads,
  editId,
  initialName = '',
  initialSteps,
}: SequenceEditorProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState(initialName)
  const [steps, setSteps] = useState<Step[]>(
    initialSteps?.length
      ? initialSteps
      : [{ subject: '', body: '', delayDays: 0, sameThread: false }]
  )
  const [activeStep, setActiveStep] = useState(0)
  const [selectedLeadId, setSelectedLeadId] = useState<string>(
    leads.length > 0 ? String(leads[0]!.id) : 'demo'
  )

  const previewLead =
    selectedLeadId === 'demo'
      ? DEMO_LEAD
      : (leads.find((l) => String(l.id) === selectedLeadId) ?? DEMO_LEAD)

  const currentStep =
    steps[activeStep] ?? { subject: '', body: '', delayDays: 0, sameThread: false }
  const isFollowUp = activeStep > 0
  const threadedSubject = isFollowUp && currentStep.sameThread
  const vars = makeVars(previewLead)
  const renderedBody = renderVariables(expandSpintax(currentStep.body), vars)

  let rootIndex = activeStep
  while (rootIndex > 0 && steps[rootIndex]?.sameThread) rootIndex--
  const rootSubject = renderVariables(
    expandSpintax(steps[rootIndex]?.subject ?? ''),
    vars
  )
  const renderedSubject = threadedSubject
    ? `Re: ${rootSubject.replace(/^\s*(re:\s*)+/i, '')}`
    : renderVariables(expandSpintax(currentStep.subject), vars)

  function addStep() {
    setSteps((prev) => [
      ...prev,
      { subject: '', body: '', delayDays: 1, sameThread: true },
    ])
    setActiveStep(steps.length)
  }

  function removeStep(index: number) {
    if (steps.length === 1) return
    setSteps((prev) => prev.filter((_, i) => i !== index))
    setActiveStep((prev) => Math.min(prev, steps.length - 2))
  }

  function updateStep(field: keyof Step, value: string | number | boolean) {
    setSteps((prev) =>
      prev.map((s, i) => (i === activeStep ? { ...s, [field]: value } : s))
    )
  }

  function handleSave() {
    if (!name.trim()) {
      toast.error('Please enter a sequence name')
      return
    }
    startTransition(async () => {
      if (editId !== undefined) {
        await updateSequence(editId, { name: name.trim(), steps })
      } else {
        await createSequence({ name: name.trim(), steps })
      }
      toast.success('Sequence saved')
      router.push('/sequences')
    })
  }

  return (
    <div className="relative space-y-6">
      {/* Header */}
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-[min(var(--radius-4xl),20px)] bg-gradient-to-r from-blue-500/10 to-transparent p-6 border border-white/5">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/sequences')}
            className="shrink-0"
          >
            <IconArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {editId !== undefined ? 'Edit sequence' : 'New sequence'}
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Build your outreach cadence step by step.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Input
            className="w-64 bg-white/5 border-white/10"
            placeholder="Sequence name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button
            className="gap-2 bg-blue-600 hover:bg-blue-500"
            onClick={handleSave}
            disabled={isPending}
          >
            <IconDeviceFloppy className="size-4" />
            Save
          </Button>
        </div>
      </div>

      {/* Step progress bar */}
      <Card className="bg-[oklch(0.08_0.018_260)] border-white/5">
        <CardContent className="py-5">
          <div className="flex items-center">
            {steps.map((step, i) => {
              const isActive = activeStep === i
              const isCompleted =
                step.subject.trim() !== '' || step.body.trim() !== ''

              return (
                <div key={i} className="flex items-center">
                  {i > 0 && (
                    <div className="mx-2 h-px w-8 shrink-0 bg-white/10 transition-all duration-300" />
                  )}
                  <div className="relative">
                    <button
                      onClick={() => setActiveStep(i)}
                      className={[
                        'flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-all duration-200',
                        isActive
                          ? 'border-[3px] border-blue-500 bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                          : isCompleted
                            ? 'border-2 border-green-500 bg-green-500 text-white'
                            : 'border border-white/10 bg-transparent text-muted-foreground hover:border-white/30 hover:text-foreground',
                      ].join(' ')}
                    >
                      {isCompleted && !isActive ? (
                        <svg
                          className="size-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        i + 1
                      )}
                    </button>
                    {steps.length > 1 && isActive && (
                      <button
                        onClick={() => removeStep(i)}
                        className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-white text-[10px] leading-none hover:bg-red-400 transition-colors"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Connector before + */}
            <div className="mx-2 h-px w-8 shrink-0 bg-white/10 transition-all duration-300" />

            {/* Add step button */}
            <button
              onClick={addStep}
              className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-white/10 text-muted-foreground transition-all hover:border-blue-500 hover:text-blue-500"
            >
              <IconPlus className="size-4" />
            </button>
          </div>

          {isFollowUp && (
            <div className="mt-4 space-y-3">
              <p className="text-muted-foreground text-xs">
                Send{' '}
                <input
                  type="number"
                  min={1}
                  value={currentStep.delayDays || 1}
                  onChange={(e) =>
                    updateStep('delayDays', Math.max(1, Number(e.target.value)))
                  }
                  className="mx-1 inline-w-12 w-12 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-center text-xs"
                />{' '}
                {currentStep.delayDays === 1 ? 'day' : 'days'} after email{' '}
                {activeStep}
              </p>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <Checkbox
                  checked={currentStep.sameThread}
                  onCheckedChange={(checked) =>
                    updateStep('sameThread', checked === true)
                  }
                  className="mt-0.5"
                />
                <span className="text-sm">
                  <span className="font-medium">Send in the same thread</span>
                  <span className="text-muted-foreground block text-xs">
                    Delivered as a reply to email {activeStep} (
                    <code className="font-mono">Re:</code> the original subject) so
                    it threads in the recipient&apos;s inbox.
                  </span>
                </span>
              </label>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Editor + Preview */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Editor */}
        <div className="space-y-4">
          <Card className="bg-[oklch(0.08_0.018_260)]/80 backdrop-blur-xl border-white/5 rounded-[min(var(--radius-4xl),20px)]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <IconPencil className="size-4 text-blue-400" />
                <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                  Email {activeStep + 1}
                </span>
              </CardTitle>
              <CardDescription className="text-xs">
                Use{' '}
                <code className="font-mono text-xs rounded bg-white/5 px-1 py-0.5">
                  {'{a|b|c}'}
                </code>{' '}
                for spintax and{' '}
                <code className="font-mono text-xs rounded bg-white/5 px-1 py-0.5">
                  {'{{variable|fallback}}'}
                </code>{' '}
                for personalization.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="subject"
                  className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                >
                  Subject line
                </Label>
                <Input
                  id="subject"
                  value={currentStep.subject}
                  onChange={(e) => updateStep('subject', e.target.value)}
                  disabled={threadedSubject}
                  className="font-mono text-sm bg-white/5 border-white/10"
                  placeholder="Subject with {spintax|options} and {{variables}}"
                />
                {threadedSubject && (
                  <p className="text-muted-foreground text-[11px]">
                    Ignored while &ldquo;same thread&rdquo; is on — this reply reuses
                    email {activeStep}&apos;s subject.
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="body"
                  className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                >
                  Email body
                </Label>
                <Textarea
                  id="body"
                  value={currentStep.body}
                  onChange={(e) => updateStep('body', e.target.value)}
                  className="font-mono min-h-64 resize-y text-sm bg-white/5 border-white/10"
                  placeholder={`Hi {{firstName|there}},\n\nYour message here...`}
                />
              </div>
            </CardContent>
          </Card>

          {/* Syntax reference */}
          <Card className="bg-[oklch(0.08_0.018_260)] border-white/5 rounded-[min(var(--radius-4xl),20px)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                Syntax reference
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                <div className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/5 p-3">
                  <Badge
                    variant="secondary"
                    className="font-mono shrink-0 bg-white/10 text-white border-0"
                  >
                    {'{a|b|c}'}
                  </Badge>
                  <span className="text-muted-foreground text-xs">
                    Random variant picked per send. Nest freely.
                  </span>
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/5 p-3">
                  <Badge
                    variant="secondary"
                    className="font-mono shrink-0 bg-white/10 text-white border-0"
                  >
                    {'{{var}}'}
                  </Badge>
                  <span className="text-muted-foreground text-xs">
                    Replaced with the lead&apos;s field value.
                  </span>
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/5 p-3">
                  <Badge
                    variant="secondary"
                    className="font-mono shrink-0 bg-white/10 text-white border-0"
                  >
                    {'{{var|fallback}}'}
                  </Badge>
                  <span className="text-muted-foreground text-xs">
                    Uses fallback when the field is empty.
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Available variables */}
          <Card className="bg-[oklch(0.08_0.018_260)] border-white/5 rounded-[min(var(--radius-4xl),20px)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                Available variables
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'firstName',
                  'lastName',
                  'email',
                  'company',
                  'openingLine',
                ].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => {
                      const tag = `{{${v}}}`
                      const el = document.getElementById(
                        'body'
                      ) as HTMLTextAreaElement | null
                      if (el) {
                        const start = el.selectionStart
                        const end = el.selectionEnd
                        const val = el.value
                        const next = val.slice(0, start) + tag + val.slice(end)
                        updateStep('body', next)
                        setTimeout(() => {
                          el.focus()
                          el.setSelectionRange(
                            start + tag.length,
                            start + tag.length
                          )
                        }, 0)
                      } else {
                        updateStep('body', currentStep.body + tag)
                      }
                    }}
                    className="font-mono text-xs rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-muted-foreground transition-all hover:border-blue-500 hover:text-blue-400 cursor-pointer"
                  >
                    {`{{${v}}}`}
                  </button>
                ))}
              </div>
              <p className="text-muted-foreground mt-2 text-[11px]">
                Click to insert at cursor. Variable names are case-insensitive.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        <Card className="bg-[oklch(0.08_0.018_260)]/80 backdrop-blur-xl border-white/5 rounded-[min(var(--radius-4xl),20px)]">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <IconEye className="size-4 text-blue-400" />
              Live preview
            </CardTitle>
            <CardDescription className="text-xs">
              Spintax expanded + variables rendered for the selected lead.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Lead selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Preview lead
              </Label>
              <Select value={selectedLeadId} onValueChange={setSelectedLeadId}>
                <SelectTrigger className="w-full bg-white/5 border-white/10">
                  <SelectValue placeholder="Select a lead" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="demo">Sample lead (Sarah Chen)</SelectItem>
                  {leads.map((l) => (
                    <SelectItem key={l.id} value={String(l.id)}>
                      {l.firstName} {l.lastName}{' '}
                      {l.company ? `— ${l.company}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator className="bg-white/10" />

            {/* Rendered email */}
            <div className="space-y-4">
              <div>
                <p className="text-muted-foreground mb-1.5 text-xs font-medium uppercase tracking-widest">
                  Subject
                </p>
                <div className="rounded-lg border border-white/5 bg-white/5 p-3">
                  <p className="text-sm font-medium">
                    {renderedSubject || (
                      <span className="text-muted-foreground italic">
                        No subject yet
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground mb-1.5 text-xs font-medium uppercase tracking-widest">
                  Body
                </p>
                <div className="rounded-lg border border-white/5 bg-white/5 p-4">
                  <pre className="font-sans text-sm leading-relaxed whitespace-pre-wrap">
                    {renderedBody || (
                      <span className="text-muted-foreground italic">
                        No body yet
                      </span>
                    )}
                  </pre>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
