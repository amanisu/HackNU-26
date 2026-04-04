/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Edge, Node, XYPosition } from "@xyflow/react";
import { child, DatabaseReference, onValue, set } from "firebase/database";
import React, {
  createContext,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { nodeFactories } from "./factories";
import { RootNodeData } from "./nodes/RootNode";

type SerializedCanvasData = {
  nodes: Record<
    string,
    {
      type: string | null;
      position: { x: number; y: number };
      data: any;
    }
  >;
  edges: Record<
    string,
    {
      type: string | null;
      source: string;
      target: string;
      data: any;
    }
  >;
};

export type AICursor = XYPosition;

export type CanvasDataContext = {
  dataLoading: boolean;
  nodes: Node[];
  edges: Edge[];
  commentMode: boolean;
  aiCursor: AICursor | null;
  setAiCursor: React.Dispatch<React.SetStateAction<AICursor | null>>;
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  getNode: (id: string) => Node | undefined;
  addNodes: (...newNodes: Node[]) => void;
  updateNode: (id: string, updates: Partial<Node>) => void;
  addEdges: (...newEdges: Edge[]) => void;
  inspectingNode?: string;
  inspectNode: (id: string) => void;
  closeInspector: () => void;
  toggleCommentMode: (on?: boolean) => void;
};

const CanvasDataContext = createContext<CanvasDataContext>(
  {} as CanvasDataContext,
);

export function useCanvasDataContext() {
  return useContext(CanvasDataContext);
}

export function CanvasDataProvider({
  dataRef,
  children,
}: React.PropsWithChildren<{
  dataRef: DatabaseReference;
}>) {
  const [dataLoading, setDataLoading] = useState(true);
  const [nodes, setNodesRaw] = useState<Node[]>([]);
  const [edges, setEdgesRaw] = useState<Edge[]>([]);
  const [commentMode, setCommentMode] = useState(false);
  const [aiCursor, setAiCursor] = useState<XYPosition | null>(null);
  const [inspectingNode, setInspectingNode] = useState<string | undefined>();

  // Sync canvas from RTDB
  useEffect(() => {
    let unsub = onValue(dataRef, (ss) => {
      let { nodes, edges }: SerializedCanvasData = ss.val() || {
        nodes: [],
        edges: [],
      };
      setNodesRaw((existingNodes) => {
        let newNodes: Node[] = [];
        let newIds = new Set();
        let existingById = Object.fromEntries(
          existingNodes.map((n) => [n.id, n]),
        );
        for (let [id, n] of Object.entries(nodes || {})) {
          newIds.add(id);
          let rawNode = {
            ...existingById[id], // could be empty
            id,
            type: n.type || undefined,
            data: n.data || undefined,
            position: n.position,
          };
          newNodes.push(nodeFactories[n.type || ""]?.make(rawNode) || rawNode);
        }
        return newNodes;
      });
      setEdgesRaw((existingEdges) => {
        let newEdges: Edge[] = [];
        let newIds = new Set();
        let existingById = Object.fromEntries(
          existingEdges.map((e) => [e.id, e]),
        );
        for (let [id, e] of Object.entries(edges || {})) {
          newIds.add(id);
          newEdges.push({
            ...existingById[id], // could be empty
            id,
            type: "floating",
            data: e.data || undefined,
            source: e.source,
            target: e.target,
          });
        }
        return newEdges;
      });
      setDataLoading(false);
    });
    return () => unsub();
  }, [String(dataRef)]);

  const setNodes = useCallback(
    (updates: SetStateAction<Node[]>) => {
      setNodesRaw((nodes) => {
        let newNodes = typeof updates === "function" ? updates(nodes) : updates;
        // sync to DB
        let valToSet = Object.fromEntries(
          newNodes.map((n) => [
            n.id,
            {
              type: n.type || null,
              data: JSON.parse(JSON.stringify(n.data || null)), // remove undefineds
              position: n.position,
            },
          ]),
        ) satisfies SerializedCanvasData["nodes"];
        let vals = Object.values(valToSet);
        if (
          vals.length === 1 &&
          vals[0].type === "root" &&
          !(vals[0].data as RootNodeData)?.prompt
        ) {
          valToSet = null as any; // this is an empty project
        }
        set(child(dataRef, "nodes"), valToSet);
        return newNodes;
      });
    },
    [String(dataRef), setNodesRaw],
  );

  const setEdges = useCallback(
    (updates: React.SetStateAction<Edge[]>) => {
      setEdgesRaw((edges) => {
        let newEdges = typeof updates === "function" ? updates(edges) : updates;
        // sync to DB
        set(
          child(dataRef, "edges"),
          Object.fromEntries(
            newEdges.map((e) => [
              e.id,
              {
                source: e.source,
                target: e.target,
                type: e.type || null,
                data: e.data || null,
              },
            ]),
          ) satisfies SerializedCanvasData["edges"],
        );
        return newEdges;
      });
    },
    [String(dataRef), setNodesRaw],
  );

  let context = useMemo<CanvasDataContext>(
    () => ({
      dataLoading,
      nodes,
      edges,
      setNodes,
      setEdges,
      addNodes: (...nodes: Node[]) => setNodes((n) => [...n, ...nodes]),
      addEdges: (...edges: Edge[]) => setEdges((e) => [...e, ...edges]),
      getNode: (id: string) => nodes.find((n) => n.id === id),
      updateNode: (id: string, updates: Partial<Node>) =>
        setNodes((nodes) =>
          nodes.map((n) =>
            n.id === id
              ? {
                  ...n,
                  ...updates,
                  data: {
                    ...n.data,
                    ...updates.data,
                  },
                }
              : n,
          ),
        ),
      aiCursor,
      setAiCursor,
      inspectingNode,
      inspectNode: (id: string) => setInspectingNode(id),
      closeInspector: () => setInspectingNode(undefined),
      commentMode,
      toggleCommentMode: (on) =>
        setCommentMode((cm) => (typeof on === "boolean" ? on : !cm)),
    }),
    [nodes, edges, inspectingNode, commentMode, aiCursor],
  );

  return (
    <CanvasDataContext.Provider value={context}>
      {children}
    </CanvasDataContext.Provider>
  );
}
