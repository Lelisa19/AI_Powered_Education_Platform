// frontend/src/modules/platform-website/pages/PlatformLandingPage.tsx
import React, { useState, useEffect } from 'react';
// Importing the existing hero asset.
import heroImage from '../../../assets/hero.png';

interface OnboardingStep {
    id: string;
    stepNumber: number;
    title: string;
    desc: string;
}

interface PlatformFeature {
    id: string;
    number: number;
    title: string;
    desc: string;
}

interface AudienceBenefit {
    id: string;
    title: string;
    desc: string;
    icon: React.ReactNode;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
    {
        id: 'step-contact',
        stepNumber: 1,
        title: 'Initial Consultation',
        desc: 'The school contacts the platform team to discuss institutional requirements and service arrangements.',
    },
    {
        id: 'step-provision',
        stepNumber: 2,
        title: 'Tenant & Domain Provisioning',
        desc: "The platform team agrees on the service and provisions the school's isolated tenant and configured domain.",
    },
    {
        id: 'step-invite',
        stepNumber: 3,
        title: 'Admin Invitation',
        desc: 'The platform team sends an official onboarding invitation to the designated Primary School Admin.',
    },
    {
        id: 'step-setup',
        stepNumber: 4,
        title: 'Account Activation & Guided Setup',
        desc: 'The Primary School Admin activates their account and completes guided school setup.',
    },
    {
        id: 'step-launch',
        stepNumber: 5,
        title: 'Configuration & Launch',
        desc: 'The school configures its public website, branding, and operational settings and begins using the platform.',
    },
];

const PLATFORM_FEATURES: PlatformFeature[] = [
    { id: 'feat-management', number: 1, title: 'School Management', desc: 'Centralized administration for staff, roles, and school operations.' },
    { id: 'feat-learning', number: 2, title: 'Online Learning', desc: 'Deliver and organize course curricula, digital materials, and lessons.' },
    { id: 'feat-live-classes', number: 3, title: 'Live Classrooms', desc: 'Planned virtual classrooms and interactive remote instruction sessions.' },
    { id: 'feat-ai-assistance', number: 4, title: 'AI Learning Assistance', desc: 'Planned intelligent tutoring and study support capabilities for students.' },
    { id: 'feat-assignments', number: 5, title: 'Assignments & Assessments', desc: 'Create, distribute, and evaluate coursework and student assessments.' },
    { id: 'feat-attendance', number: 6, title: 'Attendance Tracking', desc: 'Structured attendance tracking for physical and virtual sessions.' },
    { id: 'feat-grading', number: 7, title: 'Grading & Academic Records', desc: 'Academic performance tracking, grade calculation, and report cards.' },
    { id: 'feat-enrollment', number: 8, title: 'Student Enrollment', desc: 'Admissions and student registration governed by school enrollment policies.' },
    { id: 'feat-billing', number: 9, title: 'Fee & Payment Management', desc: 'Planned digital invoicing and tuition fee tracking for school administration.' },
    { id: 'feat-analytics', number: 10, title: 'Analytics & Reports', desc: 'Data-driven administrative insights into school operations and academic performance.' },
];

const AUDIENCE_BENEFITS: AudienceBenefit[] = [
    {
        id: 'benefit-schools',
        title: 'For Schools',
        desc: 'Achieve centralized management, isolated tenant data, and operational efficiency through unified administration.',
        icon: (
            <svg className="w-8 h-8 text-blue-600 transform -rotate-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
        ),
    },
    {
        id: 'benefit-teachers',
        title: 'For Teachers',
        desc: 'Streamline lesson delivery, coursework evaluation, and tools to monitor student academic progress.',
        icon: (
            <svg className="w-8 h-8 text-blue-600 transform rotate-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
        ),
    },
    {
        id: 'benefit-students',
        title: 'For Students',
        desc: 'Access organized coursework, track personal academic progress, and engage with school resources in a dedicated environment.',
        icon: (
            <svg className="w-8 h-8 text-blue-600 transform -rotate-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
            </svg>
        ),
    },
];

export const PlatformLandingPage: React.FC = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [hasImageError, setHasImageError] = useState(false);
    const [contactNotice, setContactNotice] = useState<string | null>(null);

    const toggleMobileMenu = () => setIsMobileMenuOpen(prev => !prev);
    const closeMobileMenu = () => setIsMobileMenuOpen(false);

    // Keyboard accessibility: Escape key closes the mobile navigation menu
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isMobileMenuOpen) {
                setIsMobileMenuOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isMobileMenuOpen]);

    const handleContactClick = () => {
        setContactNotice(
            'Online inquiry form integration is currently in progress. Direct inquiries and school onboarding consultations are conducted through designated platform representatives.'
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900 selection:bg-blue-100">
            {/* 1. HEADER */}
            <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex-shrink-0 flex items-center">
                            <span className="text-xl font-bold text-blue-700 tracking-tight">EduPlatform</span>
                        </div>

                        {/* Desktop Navigation */}
                        <nav className="hidden md:flex space-x-8" aria-label="Platform Navigation">
                            <a href="#home" className="text-gray-600 hover:text-blue-600 font-medium text-sm transition-colors">Home</a>
                            <a href="#features" className="text-gray-600 hover:text-blue-600 font-medium text-sm transition-colors">Features</a>
                            <a href="#benefits" className="text-gray-600 hover:text-blue-600 font-medium text-sm transition-colors">Benefits</a>
                            <a href="#how-it-works" className="text-gray-600 hover:text-blue-600 font-medium text-sm transition-colors">How It Works</a>
                            <a href="#contact" className="text-gray-600 hover:text-blue-600 font-medium text-sm transition-colors">Contact</a>
                        </nav>

                        {/* Mobile menu button */}
                        <div className="md:hidden flex items-center">
                            <button
                                type="button"
                                onClick={toggleMobileMenu}
                                aria-expanded={isMobileMenuOpen}
                                aria-controls="mobile-navigation-menu"
                                aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                                className="text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md p-2"
                            >
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                    {isMobileMenuOpen ? (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    ) : (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                    )}
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Navigation */}
                {isMobileMenuOpen && (
                    <div id="mobile-navigation-menu" className="md:hidden bg-white border-b border-gray-200 shadow-lg">
                        <nav className="px-4 pt-2 pb-4 space-y-1 sm:px-6" aria-label="Mobile Navigation">
                            <a href="#home" onClick={closeMobileMenu} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 transition-colors">Home</a>
                            <a href="#features" onClick={closeMobileMenu} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 transition-colors">Features</a>
                            <a href="#benefits" onClick={closeMobileMenu} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 transition-colors">Benefits</a>
                            <a href="#how-it-works" onClick={closeMobileMenu} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 transition-colors">How It Works</a>
                            <a href="#contact" onClick={closeMobileMenu} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 transition-colors">Contact</a>
                        </nav>
                    </div>
                )}
            </header>

            {/* 2. HERO SECTION */}
            <section id="home" className="pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 mb-6 leading-tight">
                    One Platform to <span className="text-blue-600">Manage, Teach,</span> and <span className="text-blue-600">Grow</span> Your School.
                </h1>
                <p className="mt-4 max-w-2xl mx-auto text-lg md:text-xl text-gray-500 mb-10">
                    Seamlessly manage academic activities, online learning, communication, and administration in one highly integrated ecosystem.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4 mb-16">
                    <a href="#contact" className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-medium text-lg hover:bg-blue-700 transition-colors shadow-sm">
                        Contact Our Team
                    </a>
                    <a href="#features" className="inline-block bg-white text-gray-700 border border-gray-300 px-8 py-3 rounded-lg font-medium text-lg hover:bg-gray-50 transition-colors shadow-sm">
                        Explore Features
                    </a>
                </div>

                {/* React-based hero image fallback */}
                <div className={`relative mx-auto w-full max-w-5xl rounded-xl shadow-2xl bg-white border border-gray-200 overflow-hidden ${hasImageError ? 'min-h-[400px] flex items-center justify-center bg-gray-100' : ''}`}>
                    {!hasImageError ? (
                        <img
                            src={heroImage}
                            alt="EduPlatform Dashboard Preview"
                            className="w-full h-auto object-cover"
                            onError={() => setHasImageError(true)}
                        />
                    ) : (
                        <span className="text-gray-400">Dashboard Preview (hero.png)</span>
                    )}
                </div>
            </section>

            {/* 3. PLATFORM OVERVIEW */}
            <section className="py-20 bg-white border-y border-gray-100">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl font-bold text-gray-900 mb-6 tracking-tight">Bridging Administration and Learning</h2>
                    <p className="text-lg text-gray-600 leading-relaxed">
                        Our platform eliminates the friction between back-office management and the classroom experience. By unifying school administration with a state-of-the-art digital learning environment, we empower educators to focus on teaching while providing administrators with the tools they need to operate efficiently.
                    </p>
                </div>
            </section>

            {/* 4. MAIN FEATURES */}
            <section id="features" className="py-24 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Powerful Features for Modern Schools</h2>
                        <p className="mt-4 text-lg text-gray-500">Everything you need to run your institution effectively.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                        {PLATFORM_FEATURES.map((feature) => (
                            <div key={feature.id} className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg hover:border-blue-100 transition-all group">
                                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-4 font-bold group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                    {feature.number}
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                                <p className="text-sm text-gray-500 leading-relaxed">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 5. BENEFITS */}
            <section id="benefits" className="py-24 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-3xl font-bold text-center text-gray-900 mb-16 tracking-tight">Who Benefits?</h2>

                    <div className="grid md:grid-cols-3 gap-12 lg:gap-16">
                        {AUDIENCE_BENEFITS.map((benefit) => (
                            <div key={benefit.id} className="text-center">
                                <div className="w-16 h-16 mx-auto bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
                                    {benefit.icon}
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-3">{benefit.title}</h3>
                                <p className="text-gray-600 leading-relaxed">{benefit.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 6. HOW IT WORKS */}
            <section id="how-it-works" className="py-24 bg-gray-50 border-t border-gray-100">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-3xl font-bold text-center text-gray-900 mb-20 tracking-tight">How It Works</h2>

                    <div className="space-y-16 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-blue-200 before:to-transparent">
                        {ONBOARDING_STEPS.map((step) => (
                            <div key={step.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-blue-600 text-white font-bold shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                                    {step.stepNumber}
                                </div>
                                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 rounded-2xl bg-white border border-gray-100 shadow-sm">
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h3>
                                    <p className="text-gray-600">{step.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 7. CALL TO ACTION / CONTACT */}
            <section id="contact" className="py-24 bg-blue-700 text-white">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold mb-6 tracking-tight">Ready to Transform Your School?</h2>
                    <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
                        Connect with our team to learn how EduPlatform can support your institution.
                    </p>
                    <button
                        type="button"
                        onClick={handleContactClick}
                        className="bg-white text-blue-700 px-8 py-3.5 rounded-lg font-bold text-lg hover:bg-gray-50 transition-colors shadow-lg shadow-blue-900/20 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-700"
                    >
                        Contact Our Team
                    </button>

                    {contactNotice && (
                        <div
                            role="status"
                            className="mt-6 mx-auto max-w-xl rounded-lg bg-blue-800/90 border border-blue-400/40 p-4 text-sm text-blue-100 text-center shadow-inner"
                        >
                            {contactNotice}
                        </div>
                    )}
                </div>
            </section>

            {/* 8. FOOTER */}
            <footer className="bg-gray-900 text-gray-400 py-12 border-t border-gray-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                        <div className="md:col-span-2">
                            <span className="text-2xl font-bold text-white mb-4 block tracking-tight">EduPlatform</span>
                            <p className="text-sm max-w-sm leading-relaxed">
                                The integrated educational management and learning platform built for modern schools and skill-training institutions.
                            </p>
                        </div>
                        <div>
                            <h4 className="text-white font-semibold mb-4">Navigation</h4>
                            <ul className="space-y-3 text-sm">
                                <li><a href="#home" className="hover:text-white transition-colors">Home</a></li>
                                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                                <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-white font-semibold mb-4">Contact</h4>
                            <ul className="space-y-3 text-sm">
                                <li><a href="#contact" className="hover:text-white transition-colors">Sales & Onboarding Inquiries</a></li>
                                <li><a href="#contact" className="hover:text-white transition-colors">Support Inquiries</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center text-sm gap-4">
                        <p>&copy; {new Date().getFullYear()} EduPlatform. All rights reserved.</p>
                        <div className="space-x-6 text-gray-500">
                            <span>Privacy Policy</span>
                            <span>Terms of Service</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};
