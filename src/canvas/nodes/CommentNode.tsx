/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useAuthContext } from "@/auth/AuthProvider";
import { Avatar } from "@/auth/Avatar";
import { IconButton, Popover, Text, Tooltip } from "@radix-ui/themes";
import { Node, NodeProps, useStore } from "@xyflow/react";
import cn from "classnames";
import { ArrowUpIcon, CheckCircle2Icon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useCanvasDataContext } from "../CanvasDataProvider";
import styles from "./CommentNode.module.scss";
import { nodeFactory } from "./node-factory";

export const commentNodes = nodeFactory<CommentNodeData>(
  "comment",
  CommentNode,
  {
    forceProps: (n) => ({ zIndex: 9999, hidden: n?.data?.resolved }),
  },
);

export type CommentNode = ReturnType<(typeof commentNodes)["make"]>;

type CommentMessage = {
  uid: string;
  displayName: string;
  photoURL: string | null;
  text: string;
  timestamp: number;
};

type CommentNodeData = {
  resolved: boolean;
  messages: CommentMessage[];
};

function CommentNode({ id, data, selected }: NodeProps<Node<CommentNodeData>>) {
  const { updateNode, setNodes } = useCanvasDataContext();
  const zoom = useStore((s) => s.transform[2]);
  // const [open, setOpen] = useState(false);
  const open = selected; // TODO: do we need separate states?
  const { messages } = data || {};

  // delete on closing an empty comment
  useEffect(() => {
    if (!selected && !messages?.length) {
      setNodes((n) => n.filter((node) => node.id !== id));
    }
  }, [id, open, messages]);

  return (
    <Popover.Root open={open}>
      <Popover.Trigger>
        <div
          className={cn(styles.commentNode, "no-screenshot", {
            [styles.isSelected]: selected,
          })}
          style={{
            transform: `scale(${1 / zoom}) translate(50%, -50%)`,
          }}
        >
          {!!messages?.length && <Avatar src={messages[0].photoURL} />}
        </div>
      </Popover.Trigger>
      <Popover.Content side="left" style={{ padding: 0 }}>
        <CommentPopover
          messages={messages}
          onClose={() => {
            updateNode(id, { selected: false });
          }}
          onResolve={() => {
            updateNode(id, {
              selected: false,
              hidden: true,
              data: { ...data, resolved: true } satisfies CommentNodeData,
            });
          }}
          onAddMessage={(msg) => {
            updateNode(id, {
              data: {
                ...data,
                messages: [...(messages || []), msg],
              } satisfies CommentNodeData,
            });
            if (messages?.length === 0) {
              // setOpen(false);
              updateNode(id, { selected: false });
            }
          }}
        />
      </Popover.Content>
    </Popover.Root>
  );
}

function CommentPopover({
  messages,
  onAddMessage,
  onClose,
  onResolve,
}: {
  messages: CommentMessage[];
  onAddMessage: (message: CommentMessage) => void;
  onClose?: () => void;
  onResolve?: () => void;
}) {
  let [newMessage, setNewMessage] = useState("");
  const { user } = useAuthContext();
  if (!user) return null;
  const { uid, displayName, email, photoURL } = user;

  return (
    <div className={styles.popover}>
      {!!messages?.length && (
        <>
          <div className={styles.header}>
            <Text weight="bold" size="2" style={{ flexGrow: 1 }}>
              Comment
            </Text>
            <div className={styles.headerButtons}>
              <Tooltip content="Resolve comment">
                <IconButton
                  variant="ghost"
                  color="gray"
                  size="2"
                  radius="full"
                  onClick={() => onResolve?.()}
                >
                  <CheckCircle2Icon size={20} />
                </IconButton>
              </Tooltip>
              <IconButton
                variant="ghost"
                color="gray"
                size="2"
                radius="full"
                onClick={() => onClose?.()}
              >
                <XIcon size={20} />
              </IconButton>
            </div>
          </div>
          <div className={styles.messages}>
            {messages.map((msg, i) => (
              <div key={i} className={styles.message}>
                <Avatar className={styles.messageAvatar} src={msg.photoURL} />
                <Text size="1" color="gray" className={styles.messageAuthor}>
                  {msg.displayName}
                </Text>
                <div className={styles.messageText}>{msg.text}</div>
              </div>
            ))}
          </div>
        </>
      )}
      <form
        onSubmit={(ev) => {
          ev.preventDefault();
          if (!newMessage.trim()) return;
          onAddMessage({
            uid,
            displayName: displayName || email || "N/A",
            photoURL,
            text: newMessage,
            timestamp: Date.now(),
          });
          setNewMessage("");
        }}
      >
        <div className={styles.newMessageContainer}>
          <textarea
            name="comment"
            value={newMessage}
            className={styles.newMessageInput}
            autoFocus
            placeholder={messages?.length ? "Reply" : "Add a comment"}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(ev) => {
              if (ev.key === "Escape") {
                ev.preventDefault();
                onClose?.();
              } else if (ev.key === "Enter" && !ev.ctrlKey && !ev.altKey) {
                ev.preventDefault();
                ev.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <IconButton
            className={styles.sendButton}
            variant="soft"
            disabled={!newMessage.trim()}
            color="gray"
            type="submit"
            radius="full"
            onClick={() => {}}
          >
            <ArrowUpIcon size={16} />
          </IconButton>
        </div>
      </form>
    </div>
  );
}
