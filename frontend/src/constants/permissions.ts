export const PERMISSIONS = {
    STUDENTS: {
        READ: 'students.read',
        CREATE: 'students.create',
        UPDATE: 'students.update',
        DELETE: 'students.delete',
    },
    TEACHERS: {
        READ: 'teachers.read',
        CREATE: 'teachers.create',
        UPDATE: 'teachers.update',
        DELETE: 'teachers.delete',
    },
    COURSES: {
        READ: 'courses.read',
        CREATE: 'courses.create',
        UPDATE: 'courses.update',
        DELETE: 'courses.delete',
    },
    PROGRAMS: {
        READ: 'programs.read',
        CREATE: 'programs.create',
        UPDATE: 'programs.update',
        DELETE: 'programs.delete',
    },
    ENROLLMENTS: {
        READ: 'enrollments.read',
        CREATE: 'enrollments.create',
        UPDATE: 'enrollments.update',
        CANCEL: 'enrollments.cancel',
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
    SETTINGS: {
        READ: 'settings.read',
        UPDATE: 'settings.update',
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
export type PermissionKey = typeof PERMISSIONS[keyof typeof PERMISSIONS][keyof typeof PERMISSIONS[keyof typeof PERMISSIONS]];
