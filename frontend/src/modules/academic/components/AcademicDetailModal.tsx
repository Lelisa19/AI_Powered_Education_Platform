import React from 'react';
import {
    formatAcademicTimestamp,
    formatIsoDateDisplay,
} from '../schemas/academic-structure-schema';
import type {
    AcademicClass,
    AcademicSection,
    AcademicTerm,
    AcademicYear,
} from '../types/academic-structure.types';
import { AcademicModalShell } from './AcademicConfirmDialog';
import {
    AcademicCalendarStatusBadge,
    AcademicUnitStatusBadge,
} from './AcademicStatusBadge';

export type AcademicDetailSubject =
    | { kind: 'year'; record: AcademicYear }
    | { kind: 'term'; record: AcademicTerm }
    | { kind: 'class'; record: AcademicClass }
    | { kind: 'section'; record: AcademicSection };

interface AcademicDetailModalProps {
    subject: AcademicDetailSubject;
    academicYears: readonly AcademicYear[];
    terms: readonly AcademicTerm[];
    classes: readonly AcademicClass[];
    sections: readonly AcademicSection[];
    onClose: () => void;
    onOpenTermsForYear?: (yearId: string) => void;
    onOpenSectionsForClass?: (classId: string) => void;
}

export const AcademicDetailModal: React.FC<AcademicDetailModalProps> = ({
    subject,
    academicYears,
    terms,
    classes,
    sections,
    onClose,
    onOpenTermsForYear,
    onOpenSectionsForClass,
}) => {
    if (subject.kind === 'year') {
        const year = subject.record;
        const relatedTerms = terms.filter((t) => t.academicYearId === year.id);
        const updatedLabel = formatAcademicTimestamp(year.updatedAt);

        return (
            <AcademicModalShell
                title={`Academic Year Details: ${year.name}`}
                onClose={onClose}
                maxWidthClass="max-w-xl"
            >
                <div className="space-y-4 text-sm text-gray-700">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-3">
                        <AcademicCalendarStatusBadge status={year.status} />
                        {updatedLabel && (
                            <span className="text-xs text-gray-500">Updated: {updatedLabel}</span>
                        )}
                    </div>

                    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                            <dt className="text-xs font-medium text-gray-500">Start Date</dt>
                            <dd className="font-medium text-gray-900">
                                {formatIsoDateDisplay(year.startDate)}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs font-medium text-gray-500">End Date</dt>
                            <dd className="font-medium text-gray-900">
                                {formatIsoDateDisplay(year.endDate)}
                            </dd>
                        </div>
                        {year.description && (
                            <div className="sm:col-span-2">
                                <dt className="text-xs font-medium text-gray-500">Description</dt>
                                <dd className="mt-0.5 text-gray-800">{year.description}</dd>
                            </div>
                        )}
                    </dl>

                    <div className="rounded-md border border-gray-200 bg-gray-50 p-3.5">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-700">
                                Associated Terms (
                                {relatedTerms.length > 0 ? relatedTerms.length : year.termCount ?? 0}
                                )
                            </h3>
                            {onOpenTermsForYear && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        onClose();
                                        onOpenTermsForYear(year.id);
                                    }}
                                    className="text-xs font-semibold text-blue-700 hover:underline"
                                >
                                    Manage Terms
                                </button>
                            )}
                        </div>

                        {relatedTerms.length > 0 ? (
                            <ul className="mt-2 space-y-1.5 text-xs">
                                {relatedTerms.map((term) => (
                                    <li
                                        key={term.id}
                                        className="flex items-center justify-between rounded border border-gray-200 bg-white px-2.5 py-1.5"
                                    >
                                        <span className="font-medium text-gray-900">
                                            {term.name}
                                        </span>
                                        <span className="text-gray-600">
                                            {term.startDate} – {term.endDate}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="mt-1.5 text-xs text-gray-500">
                                {(year.termCount ?? 0) > 0
                                    ? 'Switch to the Terms tab for this academic year to view full period details.'
                                    : 'No terms loaded for this academic year yet.'}
                            </p>
                        )}
                    </div>
                </div>
            </AcademicModalShell>
        );
    }

    if (subject.kind === 'term') {
        const term = subject.record;
        const parentYear =
            academicYears.find((y) => y.id === term.academicYearId) ?? null;

        return (
            <AcademicModalShell title={`Term Details: ${term.name}`} onClose={onClose}>
                <div className="space-y-4 text-sm text-gray-700">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                        <AcademicCalendarStatusBadge status={term.status} />
                        <span className="text-xs text-gray-600">
                            Academic Year:{' '}
                            <strong>{parentYear?.name || term.academicYearName || term.academicYearId}</strong>
                        </span>
                    </div>

                    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                            <dt className="text-xs font-medium text-gray-500">Start Date</dt>
                            <dd className="font-medium text-gray-900">
                                {formatIsoDateDisplay(term.startDate)}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs font-medium text-gray-500">End Date</dt>
                            <dd className="font-medium text-gray-900">
                                {formatIsoDateDisplay(term.endDate)}
                            </dd>
                        </div>
                        {parentYear && (
                            <div className="sm:col-span-2">
                                <dt className="text-xs font-medium text-gray-500">
                                    Parent Academic Year Window
                                </dt>
                                <dd className="text-xs text-gray-700">
                                    {formatIsoDateDisplay(parentYear.startDate)} –{' '}
                                    {formatIsoDateDisplay(parentYear.endDate)}
                                </dd>
                            </div>
                        )}
                        {term.description && (
                            <div className="sm:col-span-2">
                                <dt className="text-xs font-medium text-gray-500">Description</dt>
                                <dd className="mt-0.5 text-gray-800">{term.description}</dd>
                            </div>
                        )}
                    </dl>
                </div>
            </AcademicModalShell>
        );
    }

    if (subject.kind === 'class') {
        const cls = subject.record;
        const relatedSections = sections.filter((s) => s.classId === cls.id);

        return (
            <AcademicModalShell
                title={`Class / Grade Level: ${cls.name}`}
                onClose={onClose}
                maxWidthClass="max-w-xl"
            >
                <div className="space-y-4 text-sm text-gray-700">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-3">
                        <AcademicUnitStatusBadge status={cls.status} />
                        <span className="text-xs text-gray-500">
                            Display Order: <strong>{cls.displayOrder}</strong>
                        </span>
                    </div>

                    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                            <dt className="text-xs font-medium text-gray-500">Class Code</dt>
                            <dd className="font-medium text-gray-900">{cls.code || '—'}</dd>
                        </div>
                        <div>
                            <dt className="text-xs font-medium text-gray-500">Total Sections</dt>
                            <dd className="font-medium text-gray-900">
                                {relatedSections.length > 0
                                    ? relatedSections.length
                                    : cls.sectionCount ?? 0}
                            </dd>
                        </div>
                        {cls.description && (
                            <div className="sm:col-span-2">
                                <dt className="text-xs font-medium text-gray-500">Description</dt>
                                <dd className="mt-0.5 text-gray-800">{cls.description}</dd>
                            </div>
                        )}
                    </dl>

                    <div className="rounded-md border border-gray-200 bg-gray-50 p-3.5">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-700">
                                Sections
                            </h3>
                            {onOpenSectionsForClass && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        onClose();
                                        onOpenSectionsForClass(cls.id);
                                    }}
                                    className="text-xs font-semibold text-blue-700 hover:underline"
                                >
                                    Manage Sections
                                </button>
                            )}
                        </div>

                        {relatedSections.length > 0 ? (
                            <ul className="mt-2 space-y-1.5 text-xs">
                                {relatedSections.map((sec) => (
                                    <li
                                        key={sec.id}
                                        className="flex items-center justify-between rounded border border-gray-200 bg-white px-2.5 py-1.5"
                                    >
                                        <span className="font-medium text-gray-900">
                                            {sec.name}
                                            {sec.code ? ` (${sec.code})` : ''}
                                        </span>
                                        <span className="text-gray-600">
                                            {sec.capacity ? `Cap: ${sec.capacity}` : sec.status}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="mt-1.5 text-xs text-gray-500">
                                No sections loaded for this class yet.
                            </p>
                        )}
                    </div>
                </div>
            </AcademicModalShell>
        );
    }

    const sec = subject.record;
    const parentClass = classes.find((c) => c.id === sec.classId) ?? null;

    return (
        <AcademicModalShell title={`Section Details: ${sec.name}`} onClose={onClose}>
            <div className="space-y-4 text-sm text-gray-700">
                <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                    <AcademicUnitStatusBadge status={sec.status} />
                    <span className="text-xs text-gray-600">
                        Parent Class:{' '}
                        <strong>{parentClass?.name || sec.className || sec.classId}</strong>
                    </span>
                </div>

                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                        <dt className="text-xs font-medium text-gray-500">Section Code</dt>
                        <dd className="font-medium text-gray-900">{sec.code || '—'}</dd>
                    </div>
                    <div>
                        <dt className="text-xs font-medium text-gray-500">Capacity Limit</dt>
                        <dd className="font-medium text-gray-900">
                            {typeof sec.capacity === 'number' ? sec.capacity : 'Not configured'}
                        </dd>
                    </div>
                    {sec.description && (
                        <div className="sm:col-span-2">
                            <dt className="text-xs font-medium text-gray-500">Description</dt>
                            <dd className="mt-0.5 text-gray-800">{sec.description}</dd>
                        </div>
                    )}
                </dl>
            </div>
        </AcademicModalShell>
    );
};

