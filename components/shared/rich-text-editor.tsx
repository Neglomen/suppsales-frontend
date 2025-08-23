// src/components/shared/rich-text-editor.tsx
"use client";

import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { cn } from "@/lib/utils";
import { Bold, Italic, List } from "lucide-react";
import { useEffect } from "react";
import { Button } from "../ui/button";

const Toolbar = ({ editor }: { editor: Editor | null }) => {
  if (!editor) return null;
  return (
    <div className="border border-input bg-transparent rounded-t-md p-1 flex items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={cn("h-7 w-7", editor.isActive("bold") ? "bg-muted" : "")}
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={cn("h-7 w-7", editor.isActive("italic") ? "bg-muted" : "")}
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={cn(
          "h-7 w-7",
          editor.isActive("bulletList") ? "bg-muted" : ""
        )}
      >
        <List className="h-4 w-4" />
      </Button>
    </div>
  );
};

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  onEditorRef?: (editor: Editor) => void;
}

export const RichTextEditor = ({
  value,
  onChange,
  onEditorRef,
}: RichTextEditorProps) => {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose dark:prose-invert max-w-none rounded-b-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-h-[300px]",
      },
    },
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
    onCreate({ editor }) {
      if (onEditorRef) {
        onEditorRef(editor);
      }
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }
    const isSame = editor.getHTML() === value;
    if (isSame) {
      return;
    }

    // Używamy poprawnej składni, przekazując obiekt konfiguracyjny.
    // `emitUpdate: false` zapobiega wywołaniu `onUpdate` i nieskończonej pętli.
    editor.commands.setContent(value, { emitUpdate: false });
  }, [value, editor]);

  return (
    <div className="flex flex-col">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
};
