'use client'

import { useState, useEffect } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { getTags } from '@/lib/actions/tags'
import { Tag, Plus, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TagOption {
  id: string
  name: string
  color: string | null
}

interface TagSelectorProps {
  selectedTagIds: string[]
  onChange: (tagIds: string[]) => void
  disabled?: boolean
}

export function TagSelector({ selectedTagIds, onChange, disabled }: TagSelectorProps) {
  const [open, setOpen] = useState(false)
  const [allTags, setAllTags] = useState<TagOption[]>([])
  const [loading, setLoading] = useState(false)

  // Load tags once when popover opens
  useEffect(() => {
    if (!open || allTags.length > 0) return
    setLoading(true)
    getTags().then(data => {
      setAllTags(data)
      setLoading(false)
    })
  }, [open, allTags.length])

  function toggle(id: string) {
    const next = selectedTagIds.includes(id)
      ? selectedTagIds.filter(x => x !== id)
      : [...selectedTagIds, id]
    onChange(next)
  }

  const selectedTags = allTags.filter(t => selectedTagIds.includes(t.id))

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* Selected tag chips */}
      {selectedTags.map(tag => (
        <span
          key={tag.id}
          className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border"
          style={{
            borderColor: tag.color ?? '#6b7280',
            color: tag.color ?? '#6b7280',
            backgroundColor: tag.color ? `${tag.color}18` : undefined,
          }}
        >
          {tag.name}
          <button
            onClick={() => toggle(tag.id)}
            disabled={disabled}
            className="hover:opacity-70 transition-opacity"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      ))}

      {/* Add tag popover trigger */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          disabled={disabled}
          className={cn(
            'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-dashed',
            'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground transition-colors'
          )}
        >
          <Plus className="h-3 w-3" />
          תגית
        </PopoverTrigger>

        <PopoverContent className="w-48 p-1.5" align="start" side="bottom">
          <div dir="rtl">
            {loading && (
              <div className="flex justify-center py-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
            {!loading && allTags.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                אין תגיות — צור תגיות בסיידבר
              </p>
            )}
            {allTags.map(tag => {
              const selected = selectedTagIds.includes(tag.id)
              return (
                <button
                  key={tag.id}
                  onClick={() => toggle(tag.id)}
                  className={cn(
                    'w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-right transition-colors',
                    selected
                      ? 'bg-muted font-medium'
                      : 'hover:bg-muted/60 text-muted-foreground hover:text-foreground'
                  )}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: tag.color ?? '#6b7280' }}
                  />
                  <span className="flex-1 truncate">{tag.name}</span>
                  {selected && (
                    <X className="h-3 w-3 shrink-0 text-muted-foreground" />
                  )}
                </button>
              )
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
