import "./code-editor.css";
import { useRef } from "react";
import Editor from "@monaco-editor/react";
import prettier from "prettier/standalone";
import parserBabel from "prettier/plugins/babel";
import parserEstree from "prettier/plugins/estree";
import type { editor } from "monaco-editor";

interface CodeEditorProps {
  editorInstanceKey: string;
  value: string;
  onChange(value: string): void;
}

export default function CodeEditor({
  editorInstanceKey,
  value,
  onChange,
}: CodeEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleEditorMount = (editorInstance: editor.IStandaloneCodeEditor) => {
    editorRef.current = editorInstance;
  };

  const onFormatClick = async () => {
    if (!editorRef.current) return;

    const unformattedCode = editorRef.current.getValue();
    try {
      let formattedCode = await prettier.format(unformattedCode, {
        parser: "babel",
        plugins: [parserBabel, parserEstree],
        useTabs: false,
        semi: true,
        singleQuote: true,
      });
      formattedCode = formattedCode.replace(/\n$/, "");
      editorRef.current.setValue(formattedCode);
    } catch (err) {
      console.error("Formatting error:", err);
    }
  };

  return (
    <div className="editor-wrapper">
      <button
        className="button button-format is-primary is-small"
        onClick={onFormatClick}
      >
        Format
      </button>
      <Editor
        key={editorInstanceKey}
        onMount={handleEditorMount}
        path={`cells/${editorInstanceKey}.tsx`}
        value={value}
        onChange={(updatedValue) => onChange(updatedValue ?? "")}
        height="100%"
        defaultLanguage="javascript"
        theme="vs-dark"
        options={{
          wordWrap: "on",
          minimap: { enabled: false },
          showUnused: false,
          folding: false,
          lineNumbersMinChars: 3,
          fontSize: 16,
          tabSize: 2,
          scrollBeyondLastLine: false,
          automaticLayout: true,
        }}
      />
    </div>
  );
}
