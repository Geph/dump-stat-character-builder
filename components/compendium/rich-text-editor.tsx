"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Bold, Italic, List, ListOrdered, RemoveFormatting, Table2, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  addTableColumn,
  addTableRow,
  deleteTable,
  getSelectedTable,
  insertTableAtSelection,
  isHtml,
  toEditorHtml,
} from "@/lib/compendium/rich-text-html"

type RichTextEditorProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  minHeightClass?: string
}

const EDITOR_CONTENT_CLASS =
  "px-4 py-3 text-sm text-foreground focus:outline-none resize-y overflow-auto empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_table]:w-full [&_table]:border-collapse [&_table]:my-3 [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1.5 [&_td]:align-top [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1.5 [&_th]:font-semibold [&_th]:bg-muted/40 [&_th]:align-top"

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Enter description…",
  className,
  minHeightClass = "min-h-[6rem]",
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const lastValueRef = useRef(value)
  const [activeTable, setActiveTable] = useState<HTMLTableElement | null>(null)

  useEffect(() => {
    const el = editorRef.current
    if (!el) return
    if (lastValueRef.current === value && el.innerHTML) return
    lastValueRef.current = value
    el.innerHTML = toEditorHtml(value)
  }, [value])

  useEffect(() => {
    const el = editorRef.current
    if (!el || el.innerHTML) return
    el.innerHTML = toEditorHtml(value)
  }, [])

  const sync = useCallback(() => {
    const el = editorRef.current
    if (!el) return
    const html = el.innerHTML.replace(/<br>\s*$/, "").trim()
    const normalized = html === "<br>" || html === "<p><br></p>" ? "" : html
    lastValueRef.current = normalized
    onChange(normalized)
  }, [onChange])

  const refreshTableState = useCallback(() => {
    setActiveTable(getSelectedTable(editorRef.current))
  }, [])

  useEffect(() => {
    document.addEventListener("selectionchange", refreshTableState)
    return () => document.removeEventListener("selectionchange", refreshTableState)
  }, [refreshTableState])

  const runCommand = (command: string, arg?: string) => {
    editorRef.current?.focus()
    document.execCommand(command, false, arg)
    sync()
    refreshTableState()
  }

  const insertTable = () => {
    const el = editorRef.current
    if (!el) return
    insertTableAtSelection(el, 3, 2)
    sync()
    refreshTableState()
  }

  const mutateTable = (fn: (table: HTMLTableElement) => void) => {
    const table = getSelectedTable(editorRef.current) ?? activeTable
    if (!table) return
    fn(table)
    sync()
    refreshTableState()
  }

  return (
    <div className={cn("rounded-lg border-2 border-border bg-background overflow-hidden", className)}>
      <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/40 px-2 py-1.5">
        <ToolbarButton title="Bold" onClick={() => runCommand("bold")}>
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Italic" onClick={() => runCommand("italic")}>
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Bullet list" onClick={() => runCommand("insertUnorderedList")}>
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Numbered list" onClick={() => runCommand("insertOrderedList")}>
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Insert table (3×2)" onClick={insertTable}>
          <Table2 className="h-4 w-4" />
        </ToolbarButton>
        {activeTable && (
          <>
            <span className="mx-1 h-5 w-px bg-border" aria-hidden />
            <ToolbarButton title="Add row" onClick={() => mutateTable(addTableRow)}>
              <span className="text-[10px] font-bold leading-none">+R</span>
            </ToolbarButton>
            <ToolbarButton title="Add column" onClick={() => mutateTable(addTableColumn)}>
              <span className="text-[10px] font-bold leading-none">+C</span>
            </ToolbarButton>
            <ToolbarButton title="Delete table" onClick={() => mutateTable(deleteTable)}>
              <Trash2 className="h-4 w-4" />
            </ToolbarButton>
          </>
        )}
        <ToolbarButton title="Clear formatting" onClick={() => runCommand("removeFormat")}>
          <RemoveFormatting className="h-4 w-4" />
        </ToolbarButton>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={sync}
        onBlur={sync}
        onKeyUp={refreshTableState}
        onMouseUp={refreshTableState}
        data-placeholder={placeholder}
        className={cn(EDITOR_CONTENT_CLASS, minHeightClass)}
      />
    </div>
  )
}

function ToolbarButton({
  children,
  title,
  onClick,
}: {
  children: React.ReactNode
  title: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
    >
      {children}
    </button>
  )
}

/** Read-only HTML / plain-text description renderer. */
export function RichTextContent({
  html,
  className,
  fallback = "No description available.",
}: {
  html: string | null | undefined
  className?: string
  fallback?: string
}) {
  if (!html?.trim()) {
    return <p className={cn("text-sm text-muted-foreground", className)}>{fallback}</p>
  }

  if (isHtml(html)) {
    return (
      <div
        className={cn(
          "text-sm text-muted-foreground prose-like [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2",
          "[&_table]:w-full [&_table]:border-collapse [&_table]:my-3",
          "[&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1.5 [&_td]:align-top",
          "[&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1.5 [&_th]:font-semibold [&_th]:bg-muted/40 [&_th]:align-top",
          className,
        )}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    )
  }

  return <p className={cn("text-sm text-muted-foreground whitespace-pre-wrap", className)}>{html}</p>
}

export { isHtml, toEditorHtml }
