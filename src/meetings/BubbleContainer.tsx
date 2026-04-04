/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Bodies,
  Body,
  Composite,
  Constraint,
  Engine,
  Events,
  Mouse,
  MouseConstraint,
  Render,
} from "matter-js";
import {
  createContext,
  HTMLAttributes,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import styles from "./BubbleContainer.module.scss";
import cn from "classnames";

const SIDE_PADDING = 10;
const OBJECT_SPACING = 30;

type Bubble = {
  id: string;
  posX: number;
  posY: number;
  radius: number;
  scale: number;
};

type BubbleContainerContext = {
  bubbles: Record<string, Bubble>;
  dragging: boolean;
  addBubble: (id: string, options: Partial<Bubble>) => Bubble;
  updateBubble: (id: string, updates: Partial<Bubble>) => void;
  removeBubble: (id: string) => void;
  startDragging(ev: React.MouseEvent): void;
};

const BubbleContainerContext = createContext<BubbleContainerContext>({} as any);

export function BubbleContainer({ children }: PropsWithChildren) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bus = useMemo(() => new EventTarget(), []);
  const mouseRef = useRef<Mouse | null>(null);

  const [dragging, setDragging] = useState(false);
  const [bubbles, setBubbles] = useState<Record<string, Bubble>>({});

  const context = useMemo<BubbleContainerContext>(
    () => ({
      bubbles,
      dragging,
      addBubble: (id, options) => {
        let newBubble: Bubble = {
          posX: 40,
          posY: 300,
          radius: 80,
          scale: 1,
          ...options,
          id,
        };
        setBubbles((bubbles) => ({ ...bubbles, [id]: newBubble }));
        setTimeout(() =>
          bus.dispatchEvent(
            new CustomEvent("add-bubble", { detail: newBubble })
          )
        );
        return newBubble;
      },
      updateBubble: (id, updates) => {
        setBubbles((bubbles) => {
          let bubble = bubbles[id];
          if (!bubble) return bubbles;
          let newBubble = { ...bubble, ...updates };
          return { ...bubbles, [id]: newBubble };
        });
        setTimeout(() =>
          bus.dispatchEvent(new CustomEvent("update-bubble", { detail: id }))
        );
      },
      removeBubble: (id) => {
        setTimeout(() =>
          bus.dispatchEvent(new CustomEvent("remove-bubble", { detail: id }))
        );
        setBubbles((bubbles) => {
          let newBubbles = { ...bubbles };
          delete newBubbles[id];
          return newBubbles;
        });
      },
      startDragging: (ev: React.MouseEvent) => {
        setDragging(true);
        (mouseRef.current as any)?.mousedown?.(ev);
      },
    }),
    [bubbles, dragging]
  );

  const contextRef = useRef<BubbleContainerContext>(context);
  contextRef.current = context;

  useEffect(() => {
    if (!overlayRef.current || !canvasRef.current) return;
    const abort = new AbortController();
    const mouse = Mouse.create(overlayRef.current);
    mouseRef.current = mouse;

    // create a renderer
    let w = overlayRef.current.clientWidth;
    let h = overlayRef.current.clientHeight;

    const engine = Engine.create({
      gravity: { x: 0, y: 0 },
    });

    let render = Render.create({
      canvas: canvasRef.current,
      engine: engine,
      bounds: {
        min: { x: 0, y: 0 },
        max: { x: w, y: h },
      },
    });

    let updateDimensions = () => {
      if (!canvasRef.current) return;
      w = canvasRef.current.clientWidth;
      h = canvasRef.current.clientHeight;
      canvasRef.current.width = w;
      canvasRef.current.height = h;
      render.bounds.max.x = w;
      render.bounds.max.y = h;
      render.options.width = w;
      render.options.height = h;
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions, abort);

    let mouseConstraint = MouseConstraint.create(engine, {
      mouse,
      constraint: {
        stiffness: 0.9,
        render: {
          visible: false,
        },
      },
    });
    Events.on(mouseConstraint, "enddrag", () => setDragging(false));
    Events.on(mouseConstraint, "mouseup", () => setDragging(false));

    let bubbleNodes: Record<string, { body: Body; constraint: Constraint }> =
      {};

    let updateConstraints = () => {
      for (let { body, constraint } of Object.values(bubbleNodes)) {
        // find closest point on the resting rectangle
        let padding = SIDE_PADDING + (body.circleRadius || 0);
        let anchors = [
          {
            y: Math.max(padding, Math.min(body.position.y, h - padding)),
            x: padding,
          },
          {
            y: Math.max(padding, Math.min(body.position.y, h - padding)),
            x: w - padding,
          },
          {
            x: Math.max(padding, Math.min(body.position.x, w - padding)),
            y: padding,
          },
          {
            x: Math.max(padding, Math.min(body.position.x, w - padding)),
            y: h - padding,
          },
        ];
        let closestAnchor = anchors.reduce((best, curr) => {
          let bestDist = Math.hypot(
            best.x - body.position.x,
            best.y - body.position.y
          );
          let currDist = Math.hypot(
            curr.x - body.position.x,
            curr.y - body.position.y
          );
          return currDist < bestDist ? curr : best;
        }, anchors[0]);
        constraint.pointB = closestAnchor;
      }
    };

    let addBubbleNodes = (bubble: Bubble) => {
      // create a circle for the bubble
      let body = Bodies.circle(
        bubble.posX,
        bubble.posY,
        bubble.radius * bubble.scale + OBJECT_SPACING / 2
      );
      let constraint = Constraint.create({
        bodyA: body,
        pointB: { x: w / 2, y: h / 2 },
        stiffness: 0.005,
        length: 0,
        damping: 0.1,
      });
      bubbleNodes[bubble.id] = { body, constraint };
      Composite.add(engine.world, [body, constraint]);
      updateConstraints();
    };

    let removeBubbleNodes = (id: string) => {
      let { body, constraint } = bubbleNodes[id] || {};
      if (!body || !constraint) return;
      Composite.remove(engine.world, [body, constraint]);
    };

    for (let bubble of Object.values(contextRef.current.bubbles)) {
      addBubbleNodes(bubble);
    }

    bus.addEventListener(
      "add-bubble",
      (ev) => addBubbleNodes((ev as CustomEvent).detail as Bubble),
      abort
    );

    bus.addEventListener(
      "update-bubble",
      (ev) => {
        let id = (ev as CustomEvent).detail as string;
        let { body } = bubbleNodes[id] || {};
        if (!body) return;
        removeBubbleNodes(id);
        addBubbleNodes(contextRef.current.bubbles[id]);
      },
      abort
    );

    bus.addEventListener(
      "remove-bubble",
      (ev) => removeBubbleNodes((ev as CustomEvent).detail as string),
      abort
    );

    let updateBubbles = () => {
      setBubbles((bubbles) => {
        let newBubbles = { ...bubbles };
        for (let [id, { body }] of Object.entries(bubbleNodes)) {
          let bubble = newBubbles[id];
          if (!bubble) continue;
          bubble.posX = body.position.x;
          bubble.posY = body.position.y;
        }
        return newBubbles;
      });
    };

    updateConstraints();

    Composite.add(engine.world, [mouseConstraint]);

    Render.run(render);
    abort.signal.addEventListener("abort", () => Render.stop(render));

    (function run() {
      if (abort.signal.aborted) return;
      updateConstraints();
      updateBubbles();
      window.requestAnimationFrame(run);
      Engine.update(engine, 1000 / 60);
    })();

    return () => {
      abort.abort();
      Composite.clear(engine.world, false);
      Engine.clear(engine);
    };
  }, []);

  return (
    <BubbleContainerContext.Provider value={context}>
      <div
        className={cn(styles.bubbleContainer, {
          [styles.isDragging]: dragging,
        })}
        style={{}}
        ref={overlayRef}
      >
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          style={{
            opacity: document.location.search.includes("debugphysics")
              ? 0.5
              : 0,
          }}
        />
      </div>
      {children}
    </BubbleContainerContext.Provider>
  );
}

export function useBubble({ radius = 80 }: { radius?: number } = {}): {
  bubble: Bubble;
  setScale: (scale: number | ((scale: number) => number)) => void;
  mouseProps: HTMLAttributes<HTMLElement>;
} {
  let id = useMemo(() => Math.random().toString(36).slice(2), []);
  let ctx = useContext(BubbleContainerContext);

  let ctxRef = useRef<BubbleContainerContext>(ctx);
  ctxRef.current = ctx;

  useEffect(() => {
    ctxRef.current.addBubble(id, { radius });
    return () => ctxRef.current.removeBubble(id);
  }, [id]);

  return {
    bubble: ctxRef.current.bubbles[id] || {
      id,
      posX: -1000,
      posY: -1000,
      radius,
      scale: 1,
    },
    setScale(scale) {
      if (typeof scale === "function") {
        scale = scale(ctxRef.current.bubbles[id]?.scale || 1);
      }
      ctxRef.current.updateBubble(id, { scale });
    },
    mouseProps: {
      onMouseDown: (ev) => ctxRef.current.startDragging(ev),
    },
  };
}
