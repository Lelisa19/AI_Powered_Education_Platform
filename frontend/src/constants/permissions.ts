export const PERMISSIONS = {
    SCHOOL_PROFILE: {
        READ: 'school_profile.read',
        UPDATE: 'school_profile.update',
        UPDATE_BRANDING: 'school_profile.update_branding',
    },
    WEBSITE: {
        READ: 'website.read',
        UPDATE: 'website.update',
        PUBLISH: 'website.publish',
    },
    SCHOOL_ADMINS: {
        READ: 'school_admins.read',
        INVITE: 'school_admins.invite',
        UPDATE: 'school_admins.update',
        DISABLE: 'school_admins.disable',
        REVOKE_INVITATION: 'school_admins.revoke_invitation',
        MANAGE_PERMISSIONS: 'school_admins.manage_permissions',
    },
    STUDENTS: {
        READ: 'students.read',
        CREATE: 'students.create',
        UPDATE: 'students.update',
        DELETE: 'students.delete',
        DISABLE: 'students.disable',
        APPROVE: 'students.approve',
    },
    TEACHERS: {
        READ: 'teachers.read',
        CREATE: 'teachers.create',
        UPDATE: 'teachers.update',
        DELETE: 'teachers.delete',
        INVITE: 'teachers.invite',
        DISABLE: 'teachers.disable',
        MANAGE_PERMISSIONS: 'teachers.manage_permissions',
    },
    COURSES: {
        READ: 'courses.read',
        CREATE: 'courses.create',
        UPDATE: 'courses.update',
        DELETE: 'courses.delete',
        ASSIGN_TEACHERS: 'courses.assign_teachers',
    },
    PROGRAMS: {
        READ: 'programs.read',
        CREATE: 'programs.create',
        UPDATE: 'programs.update',
        DELETE: 'programs.delete',
        ASSIGN_COURSES: 'programs.assign_courses',
        ASSIGN_TEACHERS: 'programs.assign_teachers',
    },
    ENROLLMENTS: {
        READ: 'enrollments.read',
        CREATE: 'enrollments.create',
        UPDATE: 'enrollments.update',
        CANCEL: 'enrollments.cancel',
        APPROVE: 'enrollments.approve',
        APPROVE_PROGRAM_CHANGE: 'enrollments.approve_program_change',
    },
    ACADEMIC_YEARS: {
        READ: 'academic_years.read',
        CREATE: 'academic_years.create',
        UPDATE: 'academic_years.update',
        ACTIVATE: 'academic_years.activate',
        DELETE: 'academic_years.delete',
    },
    TERMS: {
        READ: 'terms.read',
        CREATE: 'terms.create',
        UPDATE: 'terms.update',
        ACTIVATE: 'terms.activate',
        DELETE: 'terms.delete',
    },
    CLASSES: {
        READ: 'classes.read',
        CREATE: 'classes.create',
        UPDATE: 'classes.update',
        DELETE: 'classes.delete',
    },
    SECTIONS: {
        READ: 'sections.read',
        CREATE: 'sections.create',
        UPDATE: 'sections.update',
        DELETE: 'sections.delete',
    },
    PAYMENTS: {
        READ: 'payments.read',
        CREATE: 'payments.create',
        VERIFY: 'payments.verify',
        REJECT: 'payments.reject',
        REFUND: 'payments.refund',
    },
    REPORTS: {
        READ: 'reports.read',
        EXPORT: 'reports.export',
    },
    ATTENDANCE: {
        READ: 'attendance.read',
        CREATE: 'attendance.create',
        UPDATE: 'attendance.update',
    },
    ASSIGNMENTS: {
        READ: 'assignments.read',
        CREATE: 'assignments.create',
        UPDATE: 'assignments.update',
        DELETE: 'assignments.delete',
        GRADE: 'assignments.grade',
    },
    ASSESSMENTS: {
        READ: 'assessments.read',
        CREATE: 'assessments.create',
        UPDATE: 'assessments.update',
        DELETE: 'assessments.delete',
        GRADE: 'assessments.grade',
    },
    ANNOUNCEMENTS: {
        READ: 'announcements.read',
        CREATE: 'announcements.create',
        UPDATE: 'announcements.update',
        DELETE: 'announcements.delete',
        PUBLISH: 'announcements.publish',
    },
    NOTIFICATIONS: {
        READ: 'notifications.read',
        SEND: 'notifications.send',
        MANAGE: 'notifications.manage',
    },
    SETTINGS: {
        READ: 'settings.read',
        UPDATE: 'settings.update',
    },
    SUPPORT: {
        READ: 'support.read',
        CREATE: 'support.create',
        REPLY: 'support.reply',
        CLOSE: 'support.close',
    },
    AUDIT_LOGS: {
        READ: 'audit_logs.read',
    },
    USERS: {
        READ: 'users.read',
        CREATE: 'users.create',
        UPDATE: 'users.update',
        DISABLE: 'users.disable',
    },
    ROLES: {
        READ: 'roles.read',
        MANAGE: 'roles.manage',
    },
} as const;

// Utility type to extract all leaf node string values from the PERMISSIONS object
type LeafValues<T> = T[keyof T];
export type PermissionKey = LeafValues<{
    [K in keyof typeof PERMISSIONS]: LeafValues<(typeof PERMISSIONS)[K]>;
}>;

export const SCHOOL_ADMIN_ROUTE_PERMISSIONS = {
    PROFILE: [
        PERMISSIONS.SCHOOL_PROFILE.READ,
        PERMISSIONS.SCHOOL_PROFILE.UPDATE,
        PERMISSIONS.SCHOOL_PROFILE.UPDATE_BRANDING,
    ],
    WEBSITE: [PERMISSIONS.WEBSITE.READ],
    ACADEMIC_STRUCTURE: [
        PERMISSIONS.ACADEMIC_YEARS.READ,
        PERMISSIONS.TERMS.READ,
        PERMISSIONS.CLASSES.READ,
        PERMISSIONS.SECTIONS.READ,
    ],
    SETTINGS: [PERMISSIONS.SETTINGS.READ],
    STAFF: [
        PERMISSIONS.SCHOOL_ADMINS.READ,
        PERMISSIONS.TEACHERS.READ,
        PERMISSIONS.USERS.READ,
    ],
    STUDENTS: [
        PERMISSIONS.STUDENTS.READ,
        PERMISSIONS.STUDENTS.APPROVE,
        PERMISSIONS.ENROLLMENTS.APPROVE_PROGRAM_CHANGE,
    ],
    TEACHERS: [PERMISSIONS.TEACHERS.READ],
    PROGRAMS_COURSES: [PERMISSIONS.PROGRAMS.READ, PERMISSIONS.COURSES.READ],
    FINANCE: [PERMISSIONS.REPORTS.READ, PERMISSIONS.PAYMENTS.READ],
} as const;

export const SCHOOL_ACCOUNTANT_ROUTE_PERMISSIONS = {
    PAYMENTS: [
        PERMISSIONS.PAYMENTS.READ,
        PERMISSIONS.PAYMENTS.VERIFY,
    ],
    STUDENTS: [
        PERMISSIONS.PAYMENTS.READ,
        PERMISSIONS.STUDENTS.READ,
    ],
    REPORTS: [
        PERMISSIONS.REPORTS.READ,
    ],
} as const;

export const ALL_SCHOOL_PERMISSIONS: readonly PermissionKey[] = Object.values(PERMISSIONS).flatMap(
    (group) => Object.values(group)
);

const SCHOOL_PERMISSION_SET = new Set<string>(ALL_SCHOOL_PERMISSIONS);

export function isSchoolPermissionKey(permission: unknown): permission is PermissionKey {
    return typeof permission === 'string' && SCHOOL_PERMISSION_SET.has(permission);
}

export type SchoolPermissionCategory =
    | 'SCHOOL_PROFILE'
    | 'WEBSITE'
    | 'SCHOOL_ADMINS'
    | 'STUDENTS'
    | 'TEACHERS'
    | 'COURSES'
    | 'PROGRAMS'
    | 'ENROLLMENTS'
    | 'ACADEMIC_YEARS'
    | 'TERMS'
    | 'CLASSES'
    | 'SECTIONS'
    | 'PAYMENTS'
    | 'REPORTS'
    | 'ATTENDANCE'
    | 'ASSIGNMENTS'
    | 'ASSESSMENTS'
    | 'ANNOUNCEMENTS'
    | 'NOTIFICATIONS'
    | 'SETTINGS'
    | 'SUPPORT'
    | 'AUDIT_LOGS'
    | 'USERS'
    | 'ROLES';

export interface SchoolPermissionDefinition {
    key: PermissionKey;
    category: SchoolPermissionCategory;
    label: string;
    description: string;
}

export const SCHOOL_PERMISSION_DEFINITIONS: readonly SchoolPermissionDefinition[] = [
    { key: PERMISSIONS.SCHOOL_PROFILE.READ, category: 'SCHOOL_PROFILE', label: 'View School Profile', description: 'View foundational school identity, contact, and location details.' },
    { key: PERMISSIONS.SCHOOL_PROFILE.UPDATE, category: 'SCHOOL_PROFILE', label: 'Update School Profile', description: 'Edit school profile identity, description, contact details, and address.' },
    { key: PERMISSIONS.SCHOOL_PROFILE.UPDATE_BRANDING, category: 'SCHOOL_PROFILE', label: 'Manage School Branding', description: 'Upload school logos/favicons and configure school brand colors.' },

    { key: PERMISSIONS.WEBSITE.READ, category: 'WEBSITE', label: 'View School Website Content', description: 'Inspect school public website sections and publication configuration.' },
    { key: PERMISSIONS.WEBSITE.UPDATE, category: 'WEBSITE', label: 'Edit School Website Content', description: 'Update hero, about, featured programs, contact, and social links for the school website.' },
    { key: PERMISSIONS.WEBSITE.PUBLISH, category: 'WEBSITE', label: 'Publish School Website', description: 'Publish or update live visibility of public school website changes.' },

    { key: PERMISSIONS.SCHOOL_ADMINS.READ, category: 'SCHOOL_ADMINS', label: 'View School Administrators', description: 'View School Admin accounts and pending administrator invitations.' },
    { key: PERMISSIONS.SCHOOL_ADMINS.INVITE, category: 'SCHOOL_ADMINS', label: 'Invite School Administrators', description: 'Send invitations to additional School Admin accounts.' },
    { key: PERMISSIONS.SCHOOL_ADMINS.UPDATE, category: 'SCHOOL_ADMINS', label: 'Update School Administrators', description: 'Update School Admin account details.' },
    { key: PERMISSIONS.SCHOOL_ADMINS.DISABLE, category: 'SCHOOL_ADMINS', label: 'Disable School Administrators', description: 'Activate or disable School Admin accounts.' },
    { key: PERMISSIONS.SCHOOL_ADMINS.REVOKE_INVITATION, category: 'SCHOOL_ADMINS', label: 'Revoke Admin Invitations', description: 'Revoke pending School Admin invitations before activation.' },
    { key: PERMISSIONS.SCHOOL_ADMINS.MANAGE_PERMISSIONS, category: 'SCHOOL_ADMINS', label: 'Manage School Admin Permissions', description: 'Configure granted permissions for School Admin accounts.' },

    { key: PERMISSIONS.STUDENTS.READ, category: 'STUDENTS', label: 'View Students', description: 'View student directory, profiles, and academic track details.' },
    { key: PERMISSIONS.STUDENTS.CREATE, category: 'STUDENTS', label: 'Create Students', description: 'Register or create student records from school administration.' },
    { key: PERMISSIONS.STUDENTS.UPDATE, category: 'STUDENTS', label: 'Update Students', description: 'Edit student profile details and emergency contact metadata.' },
    { key: PERMISSIONS.STUDENTS.DELETE, category: 'STUDENTS', label: 'Delete Students', description: 'Remove student records where permitted by school policy.' },
    { key: PERMISSIONS.STUDENTS.DISABLE, category: 'STUDENTS', label: 'Disable Students', description: 'Activate or suspend student portal access.' },
    { key: PERMISSIONS.STUDENTS.APPROVE, category: 'STUDENTS', label: 'Approve Student Registrations', description: 'Review and approve or reject self-registered student accounts.' },

    { key: PERMISSIONS.TEACHERS.READ, category: 'TEACHERS', label: 'View Teachers', description: 'View teacher directory, assignments, and account status.' },
    { key: PERMISSIONS.TEACHERS.CREATE, category: 'TEACHERS', label: 'Create Teachers', description: 'Create teacher profile records.' },
    { key: PERMISSIONS.TEACHERS.UPDATE, category: 'TEACHERS', label: 'Update Teachers', description: 'Edit teacher account details and profile information.' },
    { key: PERMISSIONS.TEACHERS.DELETE, category: 'TEACHERS', label: 'Delete Teachers', description: 'Remove inactive teacher records where permitted.' },
    { key: PERMISSIONS.TEACHERS.INVITE, category: 'TEACHERS', label: 'Invite Teachers', description: 'Send and manage invitations for new teacher accounts.' },
    { key: PERMISSIONS.TEACHERS.DISABLE, category: 'TEACHERS', label: 'Disable Teachers', description: 'Activate or deactivate teacher accounts.' },
    { key: PERMISSIONS.TEACHERS.MANAGE_PERMISSIONS, category: 'TEACHERS', label: 'Manage Teacher Permissions', description: 'Manage functional permissions assigned to teachers.' },

    { key: PERMISSIONS.COURSES.READ, category: 'COURSES', label: 'View Courses', description: 'View reusable courses and course metadata.' },
    { key: PERMISSIONS.COURSES.CREATE, category: 'COURSES', label: 'Create Courses', description: 'Create standalone reusable courses.' },
    { key: PERMISSIONS.COURSES.UPDATE, category: 'COURSES', label: 'Update Courses', description: 'Modify course definitions and syllabus details.' },
    { key: PERMISSIONS.COURSES.DELETE, category: 'COURSES', label: 'Delete Courses', description: 'Archive or delete unused courses.' },
    { key: PERMISSIONS.COURSES.ASSIGN_TEACHERS, category: 'COURSES', label: 'Assign Course Teachers', description: 'Assign or unassign teachers to standalone reusable courses.' },

    { key: PERMISSIONS.PROGRAMS.READ, category: 'PROGRAMS', label: 'View Programs', description: 'View grade-based academic and skill-based programs.' },
    { key: PERMISSIONS.PROGRAMS.CREATE, category: 'PROGRAMS', label: 'Create Programs', description: 'Create grade-based or skill-based programs.' },
    { key: PERMISSIONS.PROGRAMS.UPDATE, category: 'PROGRAMS', label: 'Update Programs', description: 'Update program configuration and status.' },
    { key: PERMISSIONS.PROGRAMS.DELETE, category: 'PROGRAMS', label: 'Delete Programs', description: 'Archive or delete programs without active enrollments.' },
    { key: PERMISSIONS.PROGRAMS.ASSIGN_COURSES, category: 'PROGRAMS', label: 'Assign Courses to Programs', description: 'Link reusable courses across one or more programs.' },
    { key: PERMISSIONS.PROGRAMS.ASSIGN_TEACHERS, category: 'PROGRAMS', label: 'Assign Teachers to Program Courses', description: 'Assign one or more teachers to courses within specific programs.' },

    { key: PERMISSIONS.ENROLLMENTS.READ, category: 'ENROLLMENTS', label: 'View Enrollments', description: 'View student enrollments across grade-based and skill programs.' },
    { key: PERMISSIONS.ENROLLMENTS.CREATE, category: 'ENROLLMENTS', label: 'Create Enrollments', description: 'Enroll students in grade-based or skill programs and sections.' },
    { key: PERMISSIONS.ENROLLMENTS.UPDATE, category: 'ENROLLMENTS', label: 'Update Enrollments', description: 'Update enrollment status or section placement.' },
    { key: PERMISSIONS.ENROLLMENTS.CANCEL, category: 'ENROLLMENTS', label: 'Cancel Enrollments', description: 'Cancel or withdraw student enrollments.' },
    { key: PERMISSIONS.ENROLLMENTS.APPROVE, category: 'ENROLLMENTS', label: 'Approve Enrollments', description: 'Approve or reject pending student enrollment applications.' },
    { key: PERMISSIONS.ENROLLMENTS.APPROVE_PROGRAM_CHANGE, category: 'ENROLLMENTS', label: 'Approve Grade Program Changes', description: 'Approve or reject mid-year grade-based program transfer requests.' },

    { key: PERMISSIONS.ACADEMIC_YEARS.READ, category: 'ACADEMIC_YEARS', label: 'View Academic Years', description: 'View configured school academic years.' },
    { key: PERMISSIONS.ACADEMIC_YEARS.CREATE, category: 'ACADEMIC_YEARS', label: 'Create Academic Years', description: 'Define new school academic years.' },
    { key: PERMISSIONS.ACADEMIC_YEARS.UPDATE, category: 'ACADEMIC_YEARS', label: 'Update Academic Years', description: 'Edit academic year names and date boundaries.' },
    { key: PERMISSIONS.ACADEMIC_YEARS.ACTIVATE, category: 'ACADEMIC_YEARS', label: 'Activate Academic Years', description: 'Set or transition academic year lifecycle status.' },
    { key: PERMISSIONS.ACADEMIC_YEARS.DELETE, category: 'ACADEMIC_YEARS', label: 'Delete Academic Years', description: 'Delete unused academic years without dependent terms.' },

    { key: PERMISSIONS.TERMS.READ, category: 'TERMS', label: 'View Terms / Semesters', description: 'View terms and semesters within academic years.' },
    { key: PERMISSIONS.TERMS.CREATE, category: 'TERMS', label: 'Create Terms / Semesters', description: 'Create terms or semesters inside an academic year.' },
    { key: PERMISSIONS.TERMS.UPDATE, category: 'TERMS', label: 'Update Terms / Semesters', description: 'Edit term schedules and metadata.' },
    { key: PERMISSIONS.TERMS.ACTIVATE, category: 'TERMS', label: 'Activate Terms / Semesters', description: 'Set or transition active academic term or semester status.' },
    { key: PERMISSIONS.TERMS.DELETE, category: 'TERMS', label: 'Delete Terms / Semesters', description: 'Delete unused academic terms or semesters.' },

    { key: PERMISSIONS.CLASSES.READ, category: 'CLASSES', label: 'View Classes / Grade Levels', description: 'View school classes and grade levels.' },
    { key: PERMISSIONS.CLASSES.CREATE, category: 'CLASSES', label: 'Create Classes / Grade Levels', description: 'Create classes or grade levels.' },
    { key: PERMISSIONS.CLASSES.UPDATE, category: 'CLASSES', label: 'Update Classes / Grade Levels', description: 'Edit class metadata and program associations.' },
    { key: PERMISSIONS.CLASSES.DELETE, category: 'CLASSES', label: 'Delete Classes / Grade Levels', description: 'Remove unused classes or grade levels.' },

    { key: PERMISSIONS.SECTIONS.READ, category: 'SECTIONS', label: 'View Sections / Groups', description: 'View class sections and student cohorts.' },
    { key: PERMISSIONS.SECTIONS.CREATE, category: 'SECTIONS', label: 'Create Sections / Groups', description: 'Create sections or student groups inside classes.' },
    { key: PERMISSIONS.SECTIONS.UPDATE, category: 'SECTIONS', label: 'Update Sections / Groups', description: 'Edit section capacity, advisors, and roster assignments.' },
    { key: PERMISSIONS.SECTIONS.DELETE, category: 'SECTIONS', label: 'Delete Sections / Groups', description: 'Remove unused sections or student groups.' },

    { key: PERMISSIONS.PAYMENTS.READ, category: 'PAYMENTS', label: 'View Payments', description: 'View school payment records and fee statuses.' },
    { key: PERMISSIONS.PAYMENTS.CREATE, category: 'PAYMENTS', label: 'Record Payments', description: 'Create payment entries.' },
    { key: PERMISSIONS.PAYMENTS.VERIFY, category: 'PAYMENTS', label: 'Verify Payments', description: 'Verify submitted offline or online student payments.' },
    { key: PERMISSIONS.PAYMENTS.REJECT, category: 'PAYMENTS', label: 'Reject Payments', description: 'Reject invalid payment submissions.' },
    { key: PERMISSIONS.PAYMENTS.REFUND, category: 'PAYMENTS', label: 'Refund Payments', description: 'Process payment refunds.' },

    { key: PERMISSIONS.REPORTS.READ, category: 'REPORTS', label: 'View School Reports', description: 'View school academic, enrollment, attendance, and operational reports.' },
    { key: PERMISSIONS.REPORTS.EXPORT, category: 'REPORTS', label: 'Export School Reports', description: 'Export authorized school reports.' },

    { key: PERMISSIONS.ATTENDANCE.READ, category: 'ATTENDANCE', label: 'View Attendance', description: 'View student attendance records.' },
    { key: PERMISSIONS.ATTENDANCE.CREATE, category: 'ATTENDANCE', label: 'Record Attendance', description: 'Submit attendance entries.' },
    { key: PERMISSIONS.ATTENDANCE.UPDATE, category: 'ATTENDANCE', label: 'Update Attendance', description: 'Edit attendance records.' },

    { key: PERMISSIONS.ASSIGNMENTS.READ, category: 'ASSIGNMENTS', label: 'View Assignments', description: 'View course assignments and submissions.' },
    { key: PERMISSIONS.ASSIGNMENTS.CREATE, category: 'ASSIGNMENTS', label: 'Create Assignments', description: 'Create coursework assignments.' },
    { key: PERMISSIONS.ASSIGNMENTS.UPDATE, category: 'ASSIGNMENTS', label: 'Update Assignments', description: 'Modify coursework assignments.' },
    { key: PERMISSIONS.ASSIGNMENTS.DELETE, category: 'ASSIGNMENTS', label: 'Delete Assignments', description: 'Remove coursework assignments.' },
    { key: PERMISSIONS.ASSIGNMENTS.GRADE, category: 'ASSIGNMENTS', label: 'Grade Assignments', description: 'Evaluate and grade student assignments.' },

    { key: PERMISSIONS.ASSESSMENTS.READ, category: 'ASSESSMENTS', label: 'View Assessments', description: 'View exams, quizzes, and assessment results.' },
    { key: PERMISSIONS.ASSESSMENTS.CREATE, category: 'ASSESSMENTS', label: 'Create Assessments', description: 'Create assessments and quizzes.' },
    { key: PERMISSIONS.ASSESSMENTS.UPDATE, category: 'ASSESSMENTS', label: 'Update Assessments', description: 'Update assessment configurations.' },
    { key: PERMISSIONS.ASSESSMENTS.DELETE, category: 'ASSESSMENTS', label: 'Delete Assessments', description: 'Delete draft assessments.' },
    { key: PERMISSIONS.ASSESSMENTS.GRADE, category: 'ASSESSMENTS', label: 'Grade Assessments', description: 'Score student assessments.' },

    { key: PERMISSIONS.ANNOUNCEMENTS.READ, category: 'ANNOUNCEMENTS', label: 'View Announcements', description: 'Read school announcements and broadcast history.' },
    { key: PERMISSIONS.ANNOUNCEMENTS.CREATE, category: 'ANNOUNCEMENTS', label: 'Create Announcements', description: 'Draft targeted or school-wide announcements.' },
    { key: PERMISSIONS.ANNOUNCEMENTS.UPDATE, category: 'ANNOUNCEMENTS', label: 'Update Announcements', description: 'Edit draft or scheduled announcements.' },
    { key: PERMISSIONS.ANNOUNCEMENTS.DELETE, category: 'ANNOUNCEMENTS', label: 'Delete Announcements', description: 'Delete announcements.' },
    { key: PERMISSIONS.ANNOUNCEMENTS.PUBLISH, category: 'ANNOUNCEMENTS', label: 'Publish Announcements', description: 'Publish announcements to selected school audiences.' },

    { key: PERMISSIONS.NOTIFICATIONS.READ, category: 'NOTIFICATIONS', label: 'View Notifications', description: 'View school notifications feed.' },
    { key: PERMISSIONS.NOTIFICATIONS.SEND, category: 'NOTIFICATIONS', label: 'Send Notifications', description: 'Trigger school-level operational notifications.' },
    { key: PERMISSIONS.NOTIFICATIONS.MANAGE, category: 'NOTIFICATIONS', label: 'Manage Notifications', description: 'Configure notification delivery settings and templates.' },

    { key: PERMISSIONS.SETTINGS.READ, category: 'SETTINGS', label: 'View School Settings', description: 'View school regional, notification, registration, and operational settings.' },
    { key: PERMISSIONS.SETTINGS.UPDATE, category: 'SETTINGS', label: 'Update School Settings', description: 'Modify school operational configuration.' },

    { key: PERMISSIONS.SUPPORT.READ, category: 'SUPPORT', label: 'View Support Tickets', description: 'View support tickets submitted by the school to platform support.' },
    { key: PERMISSIONS.SUPPORT.CREATE, category: 'SUPPORT', label: 'Create Support Tickets', description: 'Submit new support requests to platform support.' },
    { key: PERMISSIONS.SUPPORT.REPLY, category: 'SUPPORT', label: 'Reply to Support Tickets', description: 'Post follow-up messages on active school support tickets.' },
    { key: PERMISSIONS.SUPPORT.CLOSE, category: 'SUPPORT', label: 'Close Support Tickets', description: 'Mark resolved school support tickets as closed.' },

    { key: PERMISSIONS.AUDIT_LOGS.READ, category: 'AUDIT_LOGS', label: 'View School Audit Logs', description: 'Inspect read-only activity and audit logs for the school tenant.' },

    { key: PERMISSIONS.USERS.READ, category: 'USERS', label: 'View School Users', description: 'View school user accounts across roles.' },
    { key: PERMISSIONS.USERS.CREATE, category: 'USERS', label: 'Create School Users', description: 'Create school user accounts.' },
    { key: PERMISSIONS.USERS.UPDATE, category: 'USERS', label: 'Update School Users', description: 'Update user profile details.' },
    { key: PERMISSIONS.USERS.DISABLE, category: 'USERS', label: 'Disable School Users', description: 'Disable or reactivate school user accounts.' },

    { key: PERMISSIONS.ROLES.READ, category: 'ROLES', label: 'View School Roles', description: 'View school role and permission definitions.' },
    { key: PERMISSIONS.ROLES.MANAGE, category: 'ROLES', label: 'Manage School Roles', description: 'Manage role permission templates within the school.' },
];

export const PLATFORM_PERMISSIONS = {
    ADMINS_MANAGE: 'platform.admins.manage',
    TENANTS_MANAGE: 'platform.tenants.manage',
    ONBOARDING_MANAGE: 'platform.onboarding.manage',
    DOMAINS_MANAGE: 'platform.domains.manage',
    SETTINGS_MANAGE: 'platform.settings.manage',
    AUDIT_LOGS_VIEW: 'platform.audit_logs.view',
    SUPPORT_MANAGE: 'platform.support.manage',
    MONITORING_ACCESS: 'platform.monitoring.access',
} as const;

export type PlatformPermissionKey =
    typeof PLATFORM_PERMISSIONS[keyof typeof PLATFORM_PERMISSIONS];

export const ALL_PLATFORM_PERMISSIONS: readonly PlatformPermissionKey[] =
    Object.values(PLATFORM_PERMISSIONS);

const PLATFORM_PERMISSION_SET = new Set<string>(ALL_PLATFORM_PERMISSIONS);

export type PermissionArrayValidationResult<T extends string> =
    | { valid: true; keys: T[] }
    | { valid: false; reason: 'NOT_ARRAY' | 'INVALID_KEY' | 'DUPLICATE' };

function validatePermissionArray<T extends string>(
    value: unknown,
    isValidKey: (item: unknown) => item is T
): PermissionArrayValidationResult<T> {
    if (!Array.isArray(value)) {
        return { valid: false, reason: 'NOT_ARRAY' };
    }

    const seen = new Set<string>();
    const validated: T[] = [];

    for (const item of value) {
        if (!isValidKey(item)) {
            return { valid: false, reason: 'INVALID_KEY' };
        }
        if (seen.has(item)) {
            return { valid: false, reason: 'DUPLICATE' };
        }
        seen.add(item);
        validated.push(item);
    }

    return { valid: true, keys: validated };
}

export type SchoolPermissionArrayValidationResult =
    PermissionArrayValidationResult<PermissionKey>;

export function validateSchoolPermissionArray(
    value: unknown
): SchoolPermissionArrayValidationResult {
    return validatePermissionArray(value, isSchoolPermissionKey);
}

export function isPlatformPermissionKey(permission: unknown): permission is PlatformPermissionKey {
    return typeof permission === 'string' && PLATFORM_PERMISSION_SET.has(permission);
}

export type PlatformPermissionArrayValidationResult =
    PermissionArrayValidationResult<PlatformPermissionKey>;

export function validatePlatformPermissionArray(
    value: unknown
): PlatformPermissionArrayValidationResult {
    return validatePermissionArray(value, isPlatformPermissionKey);
}

export interface PlatformPermissionDefinition {
    key: PlatformPermissionKey;
    label: string;
    description: string;
}

export const PLATFORM_PERMISSION_DEFINITIONS: readonly PlatformPermissionDefinition[] = [
    {
        key: PLATFORM_PERMISSIONS.ADMINS_MANAGE,
        label: 'Manage Platform Administrators',
        description: 'Invite platform administrators, revoke invitations, and manage administrator status.',
    },
    {
        key: PLATFORM_PERMISSIONS.TENANTS_MANAGE,
        label: 'Manage School Tenants',
        description: 'Provision, view, activate, and deactivate school tenant accounts.',
    },
    {
        key: PLATFORM_PERMISSIONS.ONBOARDING_MANAGE,
        label: 'Manage School Onboarding',
        description: 'Review and guide initial school onboarding and primary admin activation.',
    },
    {
        key: PLATFORM_PERMISSIONS.DOMAINS_MANAGE,
        label: 'Manage Domains',
        description: 'Configure and verify custom and subdomain mappings for school tenants.',
    },
    {
        key: PLATFORM_PERMISSIONS.SETTINGS_MANAGE,
        label: 'Manage Platform Settings',
        description: 'Configure global platform operational settings and defaults.',
    },
    {
        key: PLATFORM_PERMISSIONS.AUDIT_LOGS_VIEW,
        label: 'View Audit Logs',
        description: 'Inspect platform-wide administrative activity and security audit logs.',
    },
    {
        key: PLATFORM_PERMISSIONS.SUPPORT_MANAGE,
        label: 'Manage Support Operations',
        description: 'Handle platform support inquiries and tenant operational assistance.',
    },
    {
        key: PLATFORM_PERMISSIONS.MONITORING_ACCESS,
        label: 'Access System Monitoring',
        description: 'View platform health status, service metrics, and operational diagnostics.',
    },
];
