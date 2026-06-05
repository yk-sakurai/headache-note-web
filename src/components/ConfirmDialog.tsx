"use client";
import Button from "./Button";

interface ConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title = "確認",
  message,
  confirmText = "OK",
  cancelText = "キャンセル",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* オーバーレイ背景 */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onCancel}
      />
      
      {/* ダイアログ本体 */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        {/* タイトル */}
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {title}
        </h2>
        
        {/* メッセージ */}
        <p className="text-gray-700 mb-6">
          {message}
        </p>
        
        {/* ボタン */}
        <div className="flex justify-end gap-3">
          <Button
            onClick={onCancel}
            variant="secondary"
          >
            {cancelText}
          </Button>
          <Button
            onClick={onConfirm}
            variant="primary"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
