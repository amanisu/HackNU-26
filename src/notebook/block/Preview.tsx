/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { debounce } from "@/util/debounce";
import { Attrs } from "@tiptap/pm/model";
import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import LogLine from "./LogLine";
import { Spinner } from "@radix-ui/themes";

const html = `
<html>
  <head>
    <body>
      <div id = "root"></div>
      <script>
        const process = {env: {NODE_ENV: "production"}}
      </script>
      <script id="sc"></script>
      <script>
        let hist = [];

        const handleError = (error) => {
          const root = document.querySelector('#root');
          root.innerHTML = '<div style="color: red;"><h4>Runtime Error</h4>' + error + '</div>';
          console.error(error);
          hist.push(["ERR", error.toString()]);
        }

        window.addEventListener('error', (event) => {
          // handle asynchronous run-time error
          handleError(event.error)
        });

        const origConsoleLog = window.console.log;

        console.log = function (...args) {
          hist.push(["LOG", ...args.map(anythingToString)]);
          origConsoleLog(...args)
        }
        console.info = function (...args) {
          hist.push(["INFO", ...args.map(anythingToString)]);
          origConsoleLog(...args)
        }
        console.error = function (...args) {
          hist.push(["ERR", ...args.map(anythingToString)]);
          origConsoleLog(...args)
        }
        console.warn = function (...args) {
          hist.push(["WARN", ...args.map(anythingToString)]);
          origConsoleLog(...args)
        }

        const html = (...args) => {
          hist.push(["HTML", ...args.map(anythingToString)]);
        }

        const anythingToString = (anything) => {
          if (typeof anything === 'string') {
            return anything;
          } else if (typeof anything === 'number') {
            return anything.toString();
          } else if (typeof anything === 'function') {
            return "[Function]";
          } else {
            return JSON.stringify(anything);
          }
        };

        window.addEventListener("message", (event) => {
            const { code, id } = event.data;
            hist = [];
            if (code) {
              (async () => {
                try {
                  eval(code);
                  const startDate = new Date();
                  const result = await window.codeRunner();
                  const endDate = new Date();
                  hist.unshift(['TIME', (endDate - startDate)]);
                  let isHtml = (result && typeof result === 'object' && result.__is_html);
                  if (result !== undefined && !isHtml) {
                    hist.push(['RESULT', anythingToString(result)]);
                  }
                  window.parent.postMessage({
                    id,
                    result: hist,
                    height: isHtml ? document.documentElement.offsetHeight : 0
                  }, "*");
                } catch(error) {
                  handleError(error);
                }
              })();
            }
          }, false)
      </script>
    </body>
  </head>
</html>
`;

const Preview = ({
  input,
  attributes,
  updateAttributes,
}: {
  input: string;
  attributes: Attrs;
  updateAttributes: (updates: Attrs) => void;
}) => {
  const iframe = useRef<HTMLIFrameElement>(null);
  const id = useId();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(
    () => (attributes.result && JSON.parse(attributes.result)) || []
  );
  const [previewHeight, setPreviewHeight] = useState(0);
  const { runId, language } = attributes || {};

  useEffect(() => {
    if (!runId) return;
    compile();
  }, [runId]);

  useEffect(() => {
    if (!runId || !result?.length) {
      return;
    }

    updateAttributes({
      result: JSON.stringify(result),
      runId,
    });
  }, [result, runId]);

  useEffect(() => {
    window.addEventListener("message", (event) => {
      if (event.data.id === id) {
        console.log("Message received", event.data);
        setResult(event.data.result || []);
        setPreviewHeight(event.data.height || 0);
      }
    });
  }, []);

  const compile = useCallback(
    debounce(async () => {
      console.log("Compiling", input);
      input = input.trim();
      if (!input) return;

      setLoading(true);
      let output = input;
      let error = undefined as string | undefined;
      if (error) {
        setResult([["ERR", error.toString()]]);
      } else {
        let code = `window.codeRunner = async function () { \n${output}\n }`;
        if (language === "html") {
          code = `
          window.codeRunner = async function () {
            document.getElementById('root').innerHTML = ${JSON.stringify(
              output
            )};
            
            Array.from(document.getElementById('root').querySelectorAll("script"))
              .forEach(oldScriptEl => {
                const newScriptEl = document.createElement("script");
                Array.from(oldScriptEl.attributes).forEach(attr => {
                  newScriptEl.setAttribute(attr.name, attr.value) 
                });

                const scriptText = document.createTextNode(oldScriptEl.innerHTML);
                newScriptEl.appendChild(scriptText);

                oldScriptEl.parentNode.replaceChild(newScriptEl, oldScriptEl);
              });

            return { __is_html: true };
          };
          `;
        }
        iframe.current?.contentWindow?.postMessage({ id, language, code }, "*");
      }
      setLoading(false);
    }),
    [input, language]
  );

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <iframe
        title="preview"
        ref={iframe}
        sandbox="allow-scripts"
        srcDoc={html}
        style={
          previewHeight
            ? {
                height: previewHeight,
                width: "100%",
                border: 0,
                opacity: 1,
              }
            : {
                position: "fixed",
                opacity: 0,
                pointerEvents: "none",
                left: 0,
                top: "100vh",
              }
        }
      />
      {loading ? (
        <Spinner />
      ) : (
        result?.map(([type, ...args]: any, i: number) => (
          <LogLine key={i} type={type} args={args} />
        ))
      )}
    </div>
  );
};

export default React.memo(Preview);
