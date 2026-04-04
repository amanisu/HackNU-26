/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Flex, Tooltip } from "@radix-ui/themes";
import {
  Children,
  cloneElement,
  createContext,
  DependencyList,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CommandPalette } from "./CommandPalette";
import { Shortcut } from "./Shortcut";

const IS_MAC = navigator.userAgent.includes("Mac");

export const CTRL_OR_CMD_PROP = IS_MAC ? "metaKey" : "ctrlKey";

export type CommandConfig = {
  label: string;
  name?: string; // for manual invocation
  keyName: string;
  ctrlOrCmd?: boolean;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  disabled?: boolean;
  availableDuringTextEntry?: boolean;
};

type Registration = {
  id: string;
  config: CommandConfig;
};

type CommandContext = {
  registrations: Registration[];
  register: (config: CommandConfig) => string;
  unregister: (id: string) => void;
  bus: EventTarget;
};

export const CommandContext = createContext<CommandContext>(
  {} as CommandContext
);

export function useCommand(
  config: CommandConfig,
  handler: Function,
  deps: DependencyList
) {
  const callback = useCallback(handler, deps);
  const { register, unregister, bus } = useContext(CommandContext);

  useEffect(() => {
    let abort = new AbortController();
    let id = register(config);
    abort.signal.addEventListener("abort", () => unregister(id));
    bus.addEventListener(
      "command",
      (ev) => {
        if ((ev as CustomEvent).detail === id) {
          callback();
        }
      },
      abort
    );
    return () => abort.abort();
  }, [callback, JSON.stringify(config)]);
}

export function useCommandInvoker(name: string) {
  const { bus, registrations } = useContext(CommandContext);
  let finder = (name: string) =>
    registrations.find((r) => r.config.name === name);
  let finderRef = useRef(finder);
  finderRef.current = finder;
  return () => {
    let activeReg = finderRef.current(name);
    if (!activeReg) {
      console.warn(`Command not registered: ${name}`);
      return;
    }
    bus.dispatchEvent(new CustomEvent("command", { detail: activeReg.id }));
  };
}

export const Command = forwardRef<
  HTMLElement,
  React.PropsWithChildren<React.HTMLAttributes<HTMLElement>> &
    CommandConfig & {
      tooltip?: "default" | "none" | "shortcut-only";
      sendEnterKey?: boolean;
    }
>(
  (
    {
      children,
      keyName,
      ctrlOrCmd,
      ctrl,
      alt,
      shift,
      label,
      meta,
      disabled,
      tooltip,
      sendEnterKey,
      availableDuringTextEntry,
      ...props
    },
    ref,
  ) => {
    let child = Children.only(children);
    const elRef = useRef<HTMLElement>();
    const config: CommandConfig = {
      keyName,
      ctrlOrCmd,
      ctrl,
      alt,
      shift,
      label,
      disabled,
      meta,
      availableDuringTextEntry,
    };
    useCommand(config, () => {
      if (sendEnterKey) {
        elRef.current?.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "Enter",
            bubbles: true,
            cancelable: true,
          }),
        );
      } else {
        elRef.current?.click();
      }
    }, [sendEnterKey]);

    if (!child || typeof child !== "object" || !("props" in child)) {
      console.warn(child);
      console.warn("Command must have a single child with an onClick prop");
      return child;
    }

    let cloned = cloneElement(child, {
      ...props,
      ref: (node: any) => {
        elRef.current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
    });

    return tooltip === "none" ? (
      cloned
    ) : (
      <Tooltip
        content={
          <Flex as="span" gap="2" align="center">
            {tooltip !== "shortcut-only" && label}
            <Shortcut
              variant={tooltip === "shortcut-only" ? "ghost" : undefined}
              config={config}
            />
          </Flex>
        }
      >
        {cloned}
      </Tooltip>
    );
  },
);

export function CommandProvider({ children }: React.PropsWithChildren) {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const bus = useMemo(() => new EventTarget(), []);
  const nextId = useRef(0);

  const context = useMemo<CommandContext>(
    () => ({
      register: (config: CommandConfig) => {
        let id = nextId.current++;
        setRegistrations((registrations) => [
          ...registrations,
          { id: String(id), config },
        ]);
        return String(id);
      },
      unregister: (id: string) => {
        setRegistrations((registrations) =>
          registrations.filter((r) => r.id !== id)
        );
      },
      registrations,
      bus,
    }),
    [registrations]
  );

  // keyboard shortcuts
  useEffect(() => {
    let abort = new AbortController();
    window.addEventListener(
      "keydown",
      (ev) => {
        const isEnteringText =
          document.activeElement?.tagName === "INPUT" ||
          document.activeElement?.tagName === "TEXTAREA" ||
          ((document.activeElement?.closest(".monaco-editor") ||
            (document.activeElement as any)?.["contentEditable"] === "true") &&
            !ev.ctrlKey &&
            !ev.altKey &&
            !ev.metaKey);

        function mod(test: boolean | undefined, signal: boolean) {
          return test === undefined || test === signal;
        }

        function countMods(config: CommandConfig) {
          return (
            Number(Boolean(config.ctrlOrCmd)) +
            Number(Boolean(config.ctrl)) +
            Number(Boolean(config.shift)) +
            Number(Boolean(config.alt)) +
            Number(Boolean(config.meta))
          );
        }

        for (let { id, config } of registrations.sort(
          (a, b) => countMods(b.config) - countMods(a.config)
        )) {
          let code = ev.code.replace(/^Key/, "");
          if (
            !config.disabled &&
            (!isEnteringText || config.availableDuringTextEntry) &&
            (config.keyName.toLowerCase() === ev.key.toLowerCase() ||
              config.keyName.toLowerCase() === code.toLowerCase()) &&
            mod(config.ctrlOrCmd, ev[CTRL_OR_CMD_PROP]) &&
            mod(config.ctrl, ev.ctrlKey) &&
            mod(config.shift, ev.shiftKey) &&
            mod(config.alt, ev.altKey) &&
            mod(config.meta, ev.metaKey)
          ) {
            bus.dispatchEvent(new CustomEvent("command", { detail: id }));
            ev.preventDefault();
            return;
          }
        }
      },
      abort
    );
    return () => abort.abort();
  }, [registrations]);

  return (
    <CommandContext.Provider value={context}>
      <CommandPalette />
      {children}
    </CommandContext.Provider>
  );
}
