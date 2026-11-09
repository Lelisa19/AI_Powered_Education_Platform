// frontend/src/modules/website-builder/components/sections/SchoolProgramsSection.tsx
import React, { useState } from 'react';
import type { FeaturedProgram } from '../../types/website.types';

export interface SchoolProgramsSectionProps {
    programs: FeaturedProgram[];
}

const ProgramCard: React.FC<{ program: FeaturedProgram }> = ({ program }) => {
    const [imageError, setImageError] = useState(false);
    const hasImage = Boolean(program.imageUrl && program.imageUrl.trim() !== '' && !imageError);
    const hasCategory = Boolean(program.category && program.category.trim() !== '');

    return (
        <article
            className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow"
            aria-labelledby={`program-title-${program.id}`}
        >
            {hasImage && (
                <div className="h-48 w-full overflow-hidden bg-gray-100">
                    <img
                        src={program.imageUrl!.trim()}
                        alt={program.title}
                        className="h-full w-full object-cover"
                        onError={() => setImageError(true)}
                    />
                </div>
            )}

            <div className="flex flex-1 flex-col p-6">
                {hasCategory && (
                    <div className="mb-2">
                        <span
                            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                            style={{
                                color: 'var(--school-primary, #1E40AF)',
                                backgroundColor: 'color-mix(in srgb, var(--school-primary, #1E40AF) 10%, transparent)',
                            }}
                        >
                            {program.category!.trim()}
                        </span>
                    </div>
                )}

                <h3
                    id={`program-title-${program.id}`}
                    className="text-xl font-bold tracking-tight text-gray-900"
                >
                    {program.title}
                </h3>

                <p className="mt-3 text-sm text-gray-600 leading-relaxed flex-1">
                    {program.description}
                </p>
            </div>
        </article>
    );
};

export const SchoolProgramsSection: React.FC<SchoolProgramsSectionProps> = ({ programs }) => {
    const hasPrograms = programs && programs.length > 0;

    return (
        <section
            id="programs"
            className="scroll-mt-20 bg-gray-50 py-16 sm:py-20 lg:py-24 border-t border-gray-200"
            aria-labelledby="programs-heading"
        >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-3xl text-center mb-12 sm:mb-16">
                    <h2
                        id="programs-heading"
                        className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl"
                    >
                        Featured Academic Programs
                    </h2>
                    <p className="mt-4 text-base sm:text-lg text-gray-600">
                        Explore our featured curricula and academic pathways designed for student growth.
                    </p>
                    <div
                        className="mx-auto mt-4 h-1 w-16 rounded-full"
                        style={{ backgroundColor: 'var(--school-primary, #1E40AF)' }}
                        aria-hidden="true"
                    />
                </div>

                {hasPrograms ? (
                    <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                        {programs.map((program) => (
                            <ProgramCard key={program.id} program={program} />
                        ))}
                    </div>
                ) : (
                    <div className="mx-auto max-w-md rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-500">
                        <p className="text-base font-medium text-gray-700">No programs currently published.</p>
                        <p className="mt-1 text-sm text-gray-500">
                            Academic offerings and course details will appear here once published.
                        </p>
                    </div>
                )}
            </div>
        </section>
    );
};

