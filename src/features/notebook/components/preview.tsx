import "./preview.css";
import { useEffect, useRef } from "react";

interface PreviewProps {
  code: string;
  err: string;
}

const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Document</title>
    </head>
    <body>
      <div id="root"></div>
      <script>
        const formatError = (value) => {
          if (value instanceof Error) {
            return value.message;
          }

          if (typeof value === 'string') {
            return value;
          }

          try {
            return JSON.stringify(value);
          } catch {
            return String(value);
          }
        };

        const handleError = (err) => {
          const root = document.querySelector('#root');
          root.innerHTML = '<div style="color: red;"><h4>Runtime Error</h4>' + formatError(err) + '</div>';
          console.error(err);
        };

        window.addEventListener('error', (event) => {
          event.preventDefault();
          handleError(event.error ?? event.message);
        });

        window.addEventListener('unhandledrejection', (event) => {
          event.preventDefault();
          handleError(event.reason);
        });

        window.addEventListener('message', (event) => {
          try{
            eval(event.data);
          } catch(err){
            handleError(err);
          }
        }, false);
      </script>
    </body>
    </html>
  `;

export default function Preview({ code, err }: PreviewProps) {
  const iframe = useRef<HTMLIFrameElement | null>(null);
  const shouldShowHint = !code && !err;

  useEffect(() => {
    if (!iframe.current) {
      return;
    }

    iframe.current.srcdoc = html;
    const timer = window.setTimeout(() => {
      iframe.current?.contentWindow?.postMessage(code, "*");
    }, 50);

    return () => {
      window.clearTimeout(timer);
    };
  }, [code]);

  return (
    <div className="preview-wrapper">
      <iframe
        title="code-preview"
        ref={iframe}
        sandbox="allow-scripts"
        srcDoc={html}
      />
      {shouldShowHint && (
        <div className="preview-empty-state">
          Export a React component or call <code>show(...)</code> to render
          output here.
        </div>
      )}
      {err && <div className="preview-error">{err}</div>}
    </div>
  );
}
