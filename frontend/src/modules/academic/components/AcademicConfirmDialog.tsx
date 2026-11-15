import React, { useEffect, useRef } from 'react';

interface AcademicModalShellProps {
    title: string;
    subtitle?: string;
    isSubmitting?: boolean;
    onClose: () => void;
    children: React.ReactNode;
    maxWidthClass?: string;
}

export const AcademicModalShell: React.FC<AcademicModalShellProps> = ({
    title,
    subtitle,
    isSubmitting = false,
    onClose,
    children,
    maxWidthClass = 'max-w-lg',
}) => {
    const closeButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const frameId = requestAnimationFrame(() => {
            closeButtonRef.current?.focus();
        });

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !isSubmitting) {
                event.preventDefault();
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            cancelAnimationFrame(frameId);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isSubmitting, onClose]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="academic-modal-title"
        >
            <div
                className={`flex max-h-[90vh] w-full ${maxWidthClass} flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl`}
            >
                <div className="flex items-start justify-between border-b border-gray-200 bg-gray-50 px-5 py-4">
                    <div>
                        <h2
                            id="academic-modal-title"
                            className="text-base font-semibold text-gray-900"
                        >
                            {title}
                        </h2>
                        {subtitle && <p className="mt-1 text-xs text-gray-600">{subtitle}</p>}
                    </div>
                    <button
                        ref={closeButtonRef}
                        type="button"
                        disabled={isSubmitting}
                        onClick={onClose}
                        aria-label="Close modal"
                        className="rounded-md p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50"
                    >
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path
                                fillRule="evenodd"
                                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </button>
                </div>

                <div className="overflow-y-auto p-5">{children}</div>
            </div>
        </div>
    );
};

interface AcademicConfirmDialogProps {
    title: string;
    message: string;
    warningNote?: string;
    confirmLabel: string;
    tone?: 'danger' | 'warning' | 'primary';
    isSubmitting: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}

export const AcademicConfirmDialog: React.FC<AcademicConfirmDialogProps> = ({
    title,
    message,
    warningNote,
    confirmLabel,
    tone = 'danger',
    isSubmitting,
    onCancel,
    onConfirm,
}) => {
    const confirmClasses =
        tone === 'danger'
            ? 'bg-red-600 hover:bg-red-700 focus:ring-red-600'
            : tone === 'warning'
              ? 'bg-amber-700 hover:bg-amber-800 focus:ring-amber-600'
              : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-600';

    return (
        <AcademicModalShell title={title} isSubmitting={isSubmitting} onClose={onCancel}>
            <div className="space-y-4">
                <p className="text-sm text-gray-700">{message}</p>

                {warningNote && (
                    <div
                        role="note"
                        className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"
                    >
                        {warningNote}
                    </div>
                )}

                <div className="flex flex-col-reverse gap-2 border-t border-gray-200 pt-4 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={onCancel}
                        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={onConfirm}
                        className={`rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${confirmClasses}`}
                    >
                        {isSubmitting ? 'Processing...' : confirmLabel}
                    </button>
                </div>
            </div>
        </AcademicModalShell>
    );
};

