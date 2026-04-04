/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  forwardRef,
  PropsWithChildren,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import styles from "./InlineMenu.module.scss";

import cn from "classnames";
import { LucideIcon } from "lucide-react";

export type InlineMenuRef = {
  onKeyDown: ({ event }: { event: KeyboardEvent }) => boolean;
};

type Item =
  | string
  | {
      id: string;
      title: React.ReactNode;
      description?: string;
      icon?: LucideIcon;
    };

export type InlineMenuProps = {
  items: Item[];
  command: ({ id }: { id: string }) => void;
};

export const InlineMenu = forwardRef<InlineMenuRef, InlineMenuProps>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = props.items[index];

    if (item) {
      props.command({ id: typeof item === "string" ? item : item.id });
    }
  };

  const upHandler = () => {
    setSelectedIndex(
      (selectedIndex + props.items.length - 1) % props.items.length
    );
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useEffect(() => setSelectedIndex(0), [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === "ArrowUp") {
        upHandler();
        return true;
      }

      if (event.key === "ArrowDown") {
        downHandler();
        return true;
      }

      if (event.key === "Enter") {
        enterHandler();
        return true;
      }

      return false;
    },
  }));

  return (
    <InlineMenuPopup>
      {props.items.length ? (
        props.items.map((item, index) => {
          let Icon = typeof item === "string" ? undefined : item.icon;
          return (
            <InlineMenuItem
              key={index}
              selected={index === selectedIndex}
              onMouseEnter={() => setSelectedIndex(index)}
              onClick={() => selectItem(index)}
              description={
                typeof item === "string" ? undefined : item.description
              }
              icon={Icon ? <Icon size={18} /> : undefined}
            >
              {typeof item === "string" ? item : item.title}
            </InlineMenuItem>
          );
        })
      ) : (
        <div className={styles.item}>No result</div>
      )}
    </InlineMenuPopup>
  );
});

export const InlineMenuPopup = forwardRef<HTMLDivElement, PropsWithChildren>(
  ({ children }, ref) => {
    return (
      <div ref={ref} className={styles.inlineMenu}>
        {children}
      </div>
    );
  }
);

export function InlineMenuItem({
  className,
  children,
  selected,
  description,
  icon,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
  icon?: React.ReactNode;
  description?: React.ReactNode;
}) {
  return (
    <button
      {...props}
      className={cn(className, styles.item, {
        [styles.isSelected]: selected,
      })}
      type="button"
    >
      <span className={styles.title}>{children}</span>
      {icon && <div className={styles.icon}>{icon}</div>}
      {description && <div className={styles.description}>{description}</div>}
    </button>
  );
}
