import type { ReactNode } from "react";
import { Modal } from "./Modal";
import { AlertTriangle, Loader2 } from "@/components/MathIcon";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: ReactNode;
  confirmText?: string;
  cancelText?: string;
  /** 风格：danger 红色 / primary 黑色 */
  variant?: "danger" | "primary";
  /** 确认按钮是否处于 loading 状态（由调用方控制） */
  loading?: boolean;
}

/**
 * 统一确认弹窗：用于删除等需要二次确认的危险操作。
 * - 危险操作按钮使用红色
 * - 取消按钮使用 outline 风格
 */
export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "确认",
  cancelText = "取消",
  variant = "danger",
  loading = false,
}: ConfirmDialogProps) {
  const handleConfirm = async () => {
    await onConfirm();
  };

  const isDanger = variant === "danger";

  return (
    <Modal
      isOpen={isOpen}
      onClose={loading ? () => {} : onClose}
      title={title}
      size="sm"
      closeOnOverlayClick={!loading}
    >
      <div className="flex gap-3">
        <div
          className={cn(
            "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
            isDanger
              ? "bg-red-100 text-red-600"
              : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          )}
        >
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0 pt-1">
          <div className="text-sm text-zinc-600 dark:text-zinc-300 break-words whitespace-pre-line">
            {message}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 mt-6">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg border border-zinc-300 bg-transparent text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed btn-press"
        >
          {cancelText}
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={loading}
          className={cn(
            "inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed btn-press",
            isDanger
              ? "bg-red-600 hover:bg-red-700"
              : "bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          )}
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? "处理中..." : confirmText}
        </button>
      </div>
    </Modal>
  );
}
