import { useEffect, useState } from 'react';

export interface ToastMessage {
  icon: string;
  title: string;
  body: string;
}

interface Shown extends ToastMessage {
  id: number;
}

const listeners = new Set<(t: ToastMessage) => void>();

/** Show a toast wherever the user is. Safe to call outside React. */
export function toast(msg: ToastMessage): void {
  listeners.forEach((l) => l(msg));
}

const DURATION_MS = 4000;

export function Toasts() {
  const [items, setItems] = useState<Shown[]>([]);

  useEffect(() => {
    let next = 0;
    const timers: number[] = [];
    const onToast = (m: ToastMessage) => {
      const id = next++;
      setItems((list) => [...list, { ...m, id }]);
      timers.push(window.setTimeout(() => setItems((list) => list.filter((x) => x.id !== id)), DURATION_MS));
    };
    listeners.add(onToast);
    return () => {
      listeners.delete(onToast);
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="toasts" aria-live="polite">
      {items.map((m) => (
        <div key={m.id} className="toast" role="status">
          <span className="toast-icon" aria-hidden>
            {m.icon}
          </span>
          <span>
            <strong className="block">{m.title}</strong>
            <span>{m.body}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
