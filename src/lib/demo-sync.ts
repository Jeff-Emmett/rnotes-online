/**
 * useDemoSync — lightweight React hook for real-time demo data via rSpace
 *
 * Connects to rSpace WebSocket in JSON mode (no Automerge bundle needed).
 * All demo pages share the "demo" community, so changes in one app
 * propagate to every other app viewing the same shapes.
 *
 * Usage:
 *   const { shapes, updateShape, deleteShape, connected, resetDemo } = useDemoSync({
 *     filter: ['folk-note', 'folk-notebook'],  // optional: only these shape types
 *   });
 */

import { useEffect, useRef, useState, useCallback } from 'react';

export interface DemoShape {
  type: string;
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  [key: string]: unknown;
}

interface UseDemoSyncOptions {
  /** Community slug (default: 'demo') */
  slug?: string;
  /** Only subscribe to these shape types */
  filter?: string[];
  /** rSpace server URL (default: auto-detect based on environment) */
  serverUrl?: string;
}

interface UseDemoSyncReturn {
  /** Current shapes (filtered if filter option set) */
  shapes: Record<string, DemoShape>;
  /** Update a shape by ID (partial update merged with existing) */
  updateShape: (id: string, data: Partial<DemoShape>) => void;
  /** Delete a shape by ID */
  deleteShape: (id: string) => void;
  /** Whether WebSocket is connected */
  connected: boolean;
  /** Reset demo to seed state */
  resetDemo: () => Promise<void>;
}

const DEFAULT_SLUG = 'demo';
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30000;
const PING_INTERVAL_MS = 30000;

function getDefaultServerUrl(): string {
  if (typeof window === 'undefined') return 'https://rspace.online';
  // In development, use localhost
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return `http://${window.location.hostname}:3000`;
  }
  return 'https://rspace.online';
}

export function useDemoSync(options?: UseDemoSyncOptions): UseDemoSyncReturn {
  const slug = options?.slug ?? DEFAULT_SLUG;
  const filter = options?.filter;
  const serverUrl = options?.serverUrl ?? getDefaultServerUrl();

  const [shapes, setShapes] = useState<Record<string, DemoShape>>({});
  const [connected, setConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  // Stable filter reference for use in callbacks
  const filterRef = useRef(filter);
  filterRef.current = filter;

  const applyFilter = useCallback((allShapes: Record<string, DemoShape>): Record<string, DemoShape> => {
    const f = filterRef.current;
    if (!f || f.length === 0) return allShapes;
    const filtered: Record<string, DemoShape> = {};
    for (const [id, shape] of Object.entries(allShapes)) {
      if (f.includes(shape.type)) {
        filtered[id] = shape;
      }
    }
    return filtered;
  }, []);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    // Build WebSocket URL
    const wsProtocol = serverUrl.startsWith('https') ? 'wss' : 'ws';
    const host = serverUrl.replace(/^https?:\/\//, '');
    const wsUrl = `${wsProtocol}://${host}/ws/${slug}?mode=json`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      setConnected(true);
      reconnectAttemptRef.current = 0;

      // Start ping keepalive
      pingTimerRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        }
      }, PING_INTERVAL_MS);
    };

    ws.onmessage = (event) => {
      if (!mountedRef.current) return;
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'snapshot' && msg.shapes) {
          setShapes(applyFilter(msg.shapes));
        }
        // pong and error messages are silently handled
      } catch {
        // ignore parse errors
      }
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      setConnected(false);
      cleanup();
      scheduleReconnect();
    };

    ws.onerror = () => {
      // onclose will fire after onerror, so reconnect is handled there
    };
  }, [slug, serverUrl, applyFilter]);

  const cleanup = useCallback(() => {
    if (pingTimerRef.current) {
      clearInterval(pingTimerRef.current);
      pingTimerRef.current = null;
    }
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (!mountedRef.current) return;
    const attempt = reconnectAttemptRef.current;
    const delay = Math.min(RECONNECT_BASE_MS * Math.pow(2, attempt), RECONNECT_MAX_MS);
    reconnectAttemptRef.current = attempt + 1;

    reconnectTimerRef.current = setTimeout(() => {
      if (mountedRef.current) connect();
    }, delay);
  }, [connect]);

  // Connect on mount
  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      cleanup();
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect on unmount
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect, cleanup]);

  const updateShape = useCallback((id: string, data: Partial<DemoShape>) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    // Optimistic local update
    setShapes((prev) => {
      const existing = prev[id];
      if (!existing) return prev;
      const updated = { ...existing, ...data, id };
      const f = filterRef.current;
      if (f && f.length > 0 && !f.includes(updated.type)) return prev;
      return { ...prev, [id]: updated };
    });

    // Send to server
    ws.send(JSON.stringify({ type: 'update', id, data: { ...data, id } }));
  }, []);

  const deleteShape = useCallback((id: string) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    // Optimistic local delete
    setShapes((prev) => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });

    ws.send(JSON.stringify({ type: 'delete', id }));
  }, []);

  const resetDemo = useCallback(async () => {
    const res = await fetch(`${serverUrl}/api/communities/demo/reset`, { method: 'POST' });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Reset failed: ${res.status} ${body}`);
    }
    // The server will broadcast new snapshot via WebSocket
  }, [serverUrl]);

  return { shapes, updateShape, deleteShape, connected, resetDemo };
}
