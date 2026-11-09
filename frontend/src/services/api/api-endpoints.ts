export const API_ENDPOINTS = {
    AUTH: {
        LOGIN: '/auth/login',
        REGISTER: '/auth/register',
        LOGOUT: '/auth/logout',
        ME: '/auth/me',
    },
    TENANTS: {
        BASE: '/tenants',
        BY_ID: (id: string) => `/tenants/${encodeURIComponent(id)}`,
    },
    USERS: {
        BASE: '/users',
        BY_ID: (id: string) => `/users/${encodeURIComponent(id)}`,
        STUDENTS: '/users/students',
        TEACHERS: '/users/teachers',
    },
    ACADEMIC: {
        PROGRAMS: '/academic/programs',
        PROGRAM_BY_ID: (id: string) => `/academic/programs/${encodeURIComponent(id)}`,
        COURSES: '/academic/courses',
        COURSE_BY_ID: (id: string) => `/academic/courses/${encodeURIComponent(id)}`,
        ENROLLMENTS: '/academic/enrollments',
    },
    FINANCE: {
        PAYMENTS: '/finance/payments',
        INVOICES: '/finance/invoices',
    },
    LMS: {
        ASSIGNMENTS: '/lms/assignments',
        ASSIGNMENT_BY_ID: (id: string) => `/lms/assignments/${encodeURIComponent(id)}`,
        ASSESSMENTS: '/lms/assessments',
        ATTENDANCE: '/lms/attendance',
    },
    NOTIFICATIONS: {
        BASE: '/notifications',
        READ: (id: string) => `/notifications/${encodeURIComponent(id)}/read`,
    }
} as const;