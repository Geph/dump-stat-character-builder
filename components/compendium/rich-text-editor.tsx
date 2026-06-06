"use client"

import { useCallback, useEffect, useRef } from "react"
import { Bold, Italic, List, ListOrdered, RemoveFormatting } from "lucide-react"
import { cn } from "@/lib/utils"

type RichTextEditorProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  minHeightClass?: string
}

function isHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value)
}

function toEditorHtml(value: string): string {
  if (!value?.trim()) return ""
  if (isHtml(value)) return value
  const escaped = value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
  return escaped
    .split(/\n{2,}/)
    .map((block) => `<p>${block.replace(/\n/g, "<br>")}</p>`)
    .join("")
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Enter description…",
  className,
  minHeightClass = "min-h-[6rem]",
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const lastValueRef = useRef(value)

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

  const runCommand = (command: string, arg?: string) => {
    editorRef.current?.focus()
    document.execCommand(command, false, arg)
    sync()
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
        data-placeholder={placeholder}
        className={cn(
          "px-4 py-3 text-sm text-foreground focus:outline-none resize-y overflow-auto",
          "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground",
          "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_p:last-child]:mb-0",
          minHeightClass,
        )}
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
          className,
        )}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    )
  }

  return <p className={cn("text-sm text-muted-foreground whitespace-pre-wrap", className)}>{html}</p>
}
