'use client'

import { useState, useTransition, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { getTags, createTag, updateTag, deleteTag } from '@/lib/actions/tags'
import { toast } from 'sonner'
import { Pencil, Trash2, Check, X, Plus, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
  '#6b7280',
]

interface Tag {
  id: string
  name: string
  color: string | null
}

interface TagManagerProps {
  open: boolean
  onClose: () => void
}

export function TagManager({ open, onClose }: TagManagerProps) {
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState(PRESET_COLORS[5])

  // Create state
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(PRESET_COLORS[5])
  const [showCreate, setShowCreate] = useState(false)

  // Confirm delete
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Load tags when dialog opens
  useEffect(() => {
    if (!open) return
    setLoading(true)
    getTags().then(data => {
      setTags(data)
      setLoading(false)
    })
  }, [open])

  function startEdit(tag: Tag) {
    setEditingId(tag.id)
    setEditName(tag.name)
    setEditColor(tag.color ?? PRESET_COLORS[5])
    setDeletingId(null)
  }

  function cancelEdit() {
    setEditingId(null)
  }

  function handleSaveEdit() {
    if (!editName.trim() || !editingId) return
    startTransition(async () => {
      try {
        const updated = await updateTag(editingId, { name: editName.trim(), color: editColor })
        setTags(prev => prev.map(t => t.id === editingId ? updated : t))
        setEditingId(null)
        toast.success('תגית עודכנה')
      } catch {
        toast.error('שגיאה בעדכון התגית')
      }
    })
  }

  function handleCreate() {
    if (!newName.trim()) return
    startTransition(async () => {
      try {
        const created = await createTag({ name: newName.trim(), color: newColor })
        setTags(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
        setNewName('')
        setNewColor(PRESET_COLORS[5])
        setShowCreate(false)
        toast.success(`תגית נוצרה: ${created.name}`)
      } catch {
        toast.error('שגיאה ביצירת התגית')
      }
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteTag(id)
        setTags(prev => prev.filter(t => t.id !== id))
        setDeletingId(null)
        toast.success('תגית נמחקה')
      } catch {
        toast.error('שגיאה במחיקת התגית')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm" dir="rtl">
        <DialogHeader>
          <DialogTitle>ניהול תגיות</DialogTitle>
        </DialogHeader>

        <div className="space-y-1 max-h-72 overflow-y-auto">
          {loading && (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && tags.length === 0 && !showCreate && (
            <p className="text-sm text-muted-foreground text-center py-4">אין תגיות עדיין</p>
          )}

          {tags.map(tag => (
            <div key={tag.id}>
              {editingId === tag.id ? (
                /* ── Edit row ── */
                <div className="space-y-2 rounded-lg border p-2.5">
                  <div className="flex items-center gap-2">
                    <Input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSaveEdit()
                        if (e.key === 'Escape') cancelEdit()
                      }}
                      className="h-7 text-sm"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveEdit}
                      disabled={!editName.trim() || isPending}
                      className="p-1 rounded hover:bg-muted text-green-600 disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="p-1 rounded hover:bg-muted text-muted-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <ColorPicker value={editColor} onChange={setEditColor} />
                </div>
              ) : deletingId === tag.id ? (
                /* ── Delete confirm row ── */
                <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-2.5 py-2">
                  <span className="text-sm flex-1">למחוק &quot;{tag.name}&quot;?</span>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-6 px-2 text-xs"
                    onClick={() => handleDelete(tag.id)}
                    disabled={isPending}
                  >
                    מחק
                  </Button>
                  <button
                    onClick={() => setDeletingId(null)}
                    className="p-1 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                /* ── Normal row ── */
                <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted/50 group">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: tag.color ?? '#6b7280' }}
                  />
                  <span className="text-sm flex-1 truncate">{tag.name}</span>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEdit(tag)}
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => { setDeletingId(tag.id); setEditingId(null) }}
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Create form */}
          {showCreate && (
            <div className="space-y-2 rounded-lg border p-2.5 mt-1">
              <div className="flex items-center gap-2">
                <Input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleCreate()
                    if (e.key === 'Escape') { setShowCreate(false); setNewName('') }
                  }}
                  placeholder="שם התגית..."
                  className="h-7 text-sm"
                  autoFocus
                />
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim() || isPending}
                  className="p-1 rounded hover:bg-muted text-green-600 disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={() => { setShowCreate(false); setNewName('') }}
                  className="p-1 rounded hover:bg-muted text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <ColorPicker value={newColor} onChange={setNewColor} />
            </div>
          )}
        </div>

        {/* Footer */}
        {!showCreate && (
          <button
            onClick={() => { setShowCreate(true); setEditingId(null); setDeletingId(null) }}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mt-1"
          >
            <Plus className="h-4 w-4" />
            תגית חדשה
          </button>
        )}
      </DialogContent>
    </Dialog>
  )
}

/* ── Color picker ── */
function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {PRESET_COLORS.map(c => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className="w-5 h-5 rounded-full transition-transform hover:scale-110"
          style={{
            backgroundColor: c,
            outline: value === c ? '2px solid hsl(var(--foreground))' : 'none',
            outlineOffset: '2px',
            transform: value === c ? 'scale(1.2)' : undefined,
          }}
        />
      ))}
    </div>
  )
}
