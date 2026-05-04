import { createContext, useCallback, useContext, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";

// A promise-based replacement for window.confirm().
//
// Usage:
//   const { confirm } = useContext(ConfirmContext);
//   if (!(await confirm({ title: "Delete?", message: "...", danger: true }))) return;
//
// One <ConfirmDialog/> instance lives at the app root. The provider exposes a
// single async `confirm()` that opens the dialog and resolves with true/false.

export const ConfirmContext = createContext({
  confirm: async () => false,
});

export function ConfirmProvider({ children }) {
  const [state, setState] = useState({
    open: false,
    title: "",
    message: "",
    confirmText: "Confirm",
    cancelText: "Cancel",
    danger: false,
  });
  const resolveRef = useRef(null);

  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({
        open: true,
        title: options.title || "Are you sure?",
        message: options.message || "",
        confirmText: options.confirmText || "Confirm",
        cancelText: options.cancelText || "Cancel",
        danger: !!options.danger,
      });
    });
  }, []);

  const close = (result) => {
    setState((s) => ({ ...s, open: false }));
    if (resolveRef.current) {
      resolveRef.current(result);
      resolveRef.current = null;
    }
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state.open &&
        createPortal(
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-surface-900/60 backdrop-blur-sm animate-fade-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            onClick={() => close(false)}
          >
          <div
            className="card max-w-sm w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              {state.danger && (
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 flex items-center justify-center shrink-0">
                  <AlertTriangle size={18} />
                </div>
              )}
              <div className="min-w-0">
                <h3 id="confirm-title" className="font-display font-semibold text-lg">
                  {state.title}
                </h3>
                {state.message && (
                  <p className="text-sm text-surface-600 dark:text-surface-300 mt-1 leading-relaxed">
                    {state.message}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button onClick={() => close(false)} className="btn-ghost">
                {state.cancelText}
              </button>
              <button
                onClick={() => close(true)}
                className={state.danger ? "btn-danger" : "btn-primary"}
                autoFocus
              >
                {state.confirmText}
              </button>
            </div>
          </div>
        </div>,
          document.body
        )}
    </ConfirmContext.Provider>
  );
}

// Convenience hook so consumers can do `const confirm = useConfirm();`.
export function useConfirm() {
  return useContext(ConfirmContext).confirm;
}
