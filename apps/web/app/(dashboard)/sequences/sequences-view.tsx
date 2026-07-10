'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'
import { Card, CardContent } from '@workspace/ui/components/card'
import { Button } from '@workspace/ui/components/button'
import { Badge } from '@workspace/ui/components/badge'
import { IconMailFast, IconPencil, IconTrash } from '@tabler/icons-react'
import { deleteSequence } from './actions'

type SequenceRow = {
  id: number
  name: string
  stepCount: number
  createdAt: string
}

export function SequencesView({ sequences }: { sequences: SequenceRow[] }) {
  const [isPending, startTransition] = useTransition()

  function handleDelete(id: number, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    startTransition(async () => {
      await deleteSequence(id)
      toast.success('Sequence deleted')
    })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Sequences</h1>
        <p className="text-muted-foreground">
          Manage your outreach sequences and email cadences.
        </p>
      </div>

      {sequences.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-muted/50 p-3 mb-4">
              <IconMailFast className="text-muted-foreground/60 size-8" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No sequences yet</h3>
            <p className="text-muted-foreground text-sm mb-4 text-center max-w-sm">
              Create your first sequence to start sending personalized outreach
              at scale.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">Name</TableHead>
                <TableHead className="font-semibold">Steps</TableHead>
                <TableHead className="font-semibold">Created</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sequences.map((seq) => (
                <TableRow key={seq.id}>
                  <TableCell className="font-medium">{seq.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="gap-1">
                      {seq.stepCount} {seq.stepCount === 1 ? 'email' : 'emails'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(seq.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/sequences/${seq.id}`}>
                          <IconPencil className="size-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        disabled={isPending}
                        onClick={() => handleDelete(seq.id, seq.name)}
                      >
                        <IconTrash className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
