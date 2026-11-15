import React from 'react';
import { DashboardOverviewCard } from '../../../../components/Dashboards/DashboardOverviewCard';
import { WEBSITE_CMS_LIMITS } from '../../schemas/website-cms-schema';
import type {
    FeaturedProgramFormItem,
    WebsiteCmsFormValues,
    WebsiteCmsValidationErrors,
} from '../../types/website.types';

interface WebsiteProgramsEditorProps {
    values: WebsiteCmsFormValues;
    errors: WebsiteCmsValidationErrors;
    disabled: boolean;
    onHeadingChange: (value: string) => void;
    onAddProgram: () => void;
    onUpdateProgram: (
        programId: string,
        field: keyof Omit<FeaturedProgramFormItem, 'id'>,
        value: string
    ) => void;
    onMoveProgram: (index: number, direction: 'up' | 'down') => void;
    onRemoveProgram: (programId: string) => void;
}

export const WebsiteProgramsEditor: React.FC<WebsiteProgramsEditorProps> = ({
    values,
    errors,
    disabled,
    onHeadingChange,
    onAddProgram,
    onUpdateProgram,
    onMoveProgram,
    onRemoveProgram,
}) => {
    const canAddMore =
        !disabled && values.featuredPrograms.length < WEBSITE_CMS_LIMITS.MAX_FEATURED_PROGRAMS;

    return (
        <DashboardOverviewCard title="Featured Programs Highlight">
            <div className="space-y-6">
                <div
                    role="note"
                    className="rounded-md border border-blue-200 bg-blue-50 p-3.5 text-xs text-blue-900"
                >
                    Public showcase content only: these cards highlight programs for website visitors.
                    Authoritative academic programs, courses, classes, and enrollments are managed
                    separately in Academic Management.
                </div>

                <div>
                    <label
                        htmlFor="cms-programs-heading"
                        className="block text-sm font-medium text-gray-800"
                    >
                        Section Heading (Optional)
                    </label>
                    <input
                        id="cms-programs-heading"
                        type="text"
                        disabled={disabled}
                        value={values.featuredProgramsHeading}
                        maxLength={WEBSITE_CMS_LIMITS.PROGRAMS_HEADING_MAX}
                        onChange={(e) => onHeadingChange(e.target.value)}
                        placeholder="Featured Academic Programs"
                        className="mt-1.5 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100 disabled:text-gray-500"
                    />
                    {errors.featuredProgramsHeading ? (
                        <p role="alert" className="mt-1 text-xs text-red-600">
                            {errors.featuredProgramsHeading}
                        </p>
                    ) : (
                        <p className="mt-1 text-xs text-gray-500">
                            Defaults to &ldquo;Featured Academic Programs&rdquo; when blank.
                        </p>
                    )}
                </div>

                <div className="flex flex-col gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900">
                            Featured Entries ({values.featuredPrograms.length}/
                            {WEBSITE_CMS_LIMITS.MAX_FEATURED_PROGRAMS})
                        </h3>
                        <p className="text-xs text-gray-500">
                            Order determines card sequence on your public website.
                        </p>
                    </div>

                    <button
                        type="button"
                        disabled={!canAddMore}
                        onClick={onAddProgram}
                        className="inline-flex items-center justify-center rounded-md bg-blue-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        + Add Featured Program
                    </button>
                </div>

                {errors.featuredProgramsLimit && (
                    <p role="alert" className="text-xs text-red-600">
                        {errors.featuredProgramsLimit}
                    </p>
                )}

                {values.featuredPrograms.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                        <p className="text-sm font-medium text-gray-700">
                            No featured program cards configured.
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                            Add highlights for your key departments, tracks, or training programs.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {values.featuredPrograms.map((item, index) => {
                            const itemErrors = errors.programItems?.[item.id] ?? {};
                            return (
                                <div
                                    key={item.id}
                                    className="rounded-lg border border-gray-200 bg-gray-50/70 p-4 shadow-sm"
                                >
                                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-3">
                                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                                            Card #{index + 1}
                                        </span>

                                        <div className="flex flex-wrap items-center gap-2">
                                            <button
                                                type="button"
                                                disabled={disabled || index === 0}
                                                onClick={() => onMoveProgram(index, 'up')}
                                                aria-label={`Move program card ${index + 1} up`}
                                                className="rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                                            >
                                                Move Up
                                            </button>
                                            <button
                                                type="button"
                                                disabled={
                                                    disabled ||
                                                    index === values.featuredPrograms.length - 1
                                                }
                                                onClick={() => onMoveProgram(index, 'down')}
                                                aria-label={`Move program card ${index + 1} down`}
                                                className="rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                                            >
                                                Move Down
                                            </button>
                                            <button
                                                type="button"
                                                disabled={disabled}
                                                onClick={() => onRemoveProgram(item.id)}
                                                aria-label={`Remove program card ${index + 1}`}
                                                className="rounded border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div>
                                            <label
                                                htmlFor={`program-title-${item.id}`}
                                                className="block text-xs font-medium text-gray-700"
                                            >
                                                Title <span className="text-red-600">*</span>
                                            </label>
                                            <input
                                                id={`program-title-${item.id}`}
                                                type="text"
                                                disabled={disabled}
                                                value={item.title}
                                                maxLength={WEBSITE_CMS_LIMITS.PROGRAM_TITLE_MAX}
                                                onChange={(e) =>
                                                    onUpdateProgram(item.id, 'title', e.target.value)
                                                }
                                                placeholder="e.g., Applied STEM Honors Track"
                                                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100 disabled:text-gray-500"
                                            />
                                            {itemErrors.title && (
                                                <p role="alert" className="mt-1 text-xs text-red-600">
                                                    {itemErrors.title}
                                                </p>
                                            )}
                                        </div>

                                        <div>
                                            <label
                                                htmlFor={`program-category-${item.id}`}
                                                className="block text-xs font-medium text-gray-700"
                                            >
                                                Category Badge (Optional)
                                            </label>
                                            <input
                                                id={`program-category-${item.id}`}
                                                type="text"
                                                disabled={disabled}
                                                value={item.category}
                                                maxLength={WEBSITE_CMS_LIMITS.PROGRAM_CATEGORY_MAX}
                                                onChange={(e) =>
                                                    onUpdateProgram(
                                                        item.id,
                                                        'category',
                                                        e.target.value
                                                    )
                                                }
                                                placeholder="e.g., Science & Technology"
                                                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100 disabled:text-gray-500"
                                            />
                                            {itemErrors.category && (
                                                <p role="alert" className="mt-1 text-xs text-red-600">
                                                    {itemErrors.category}
                                                </p>
                                            )}
                                        </div>

                                        <div className="sm:col-span-2">
                                            <label
                                                htmlFor={`program-description-${item.id}`}
                                                className="block text-xs font-medium text-gray-700"
                                            >
                                                Summary Description <span className="text-red-600">*</span>
                                            </label>
                                            <textarea
                                                id={`program-description-${item.id}`}
                                                rows={3}
                                                disabled={disabled}
                                                value={item.description}
                                                maxLength={WEBSITE_CMS_LIMITS.PROGRAM_DESCRIPTION_MAX}
                                                onChange={(e) =>
                                                    onUpdateProgram(
                                                        item.id,
                                                        'description',
                                                        e.target.value
                                                    )
                                                }
                                                placeholder="Concise overview of curriculum highlights and student outcomes."
                                                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100 disabled:text-gray-500"
                                            />
                                            <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                                                <span>
                                                    {itemErrors.description && (
                                                        <span role="alert" className="text-red-600">
                                                            {itemErrors.description}
                                                        </span>
                                                    )}
                                                </span>
                                                <span>
                                                    {item.description.length}/
                                                    {WEBSITE_CMS_LIMITS.PROGRAM_DESCRIPTION_MAX}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="sm:col-span-2">
                                            <label
                                                htmlFor={`program-image-${item.id}`}
                                                className="block text-xs font-medium text-gray-700"
                                            >
                                                Cover Image URL (Optional)
                                            </label>
                                            <input
                                                id={`program-image-${item.id}`}
                                                type="url"
                                                disabled={disabled}
                                                value={item.imageUrl}
                                                maxLength={WEBSITE_CMS_LIMITS.IMAGE_URL_MAX}
                                                onChange={(e) =>
                                                    onUpdateProgram(
                                                        item.id,
                                                        'imageUrl',
                                                        e.target.value
                                                    )
                                                }
                                                placeholder="https://cdn.example.edu/program-cover.jpg"
                                                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100 disabled:text-gray-500"
                                            />
                                            {itemErrors.imageUrl && (
                                                <p role="alert" className="mt-1 text-xs text-red-600">
                                                    {itemErrors.imageUrl}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </DashboardOverviewCard>
    );
};

