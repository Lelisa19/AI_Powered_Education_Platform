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
        STATUS: (id: string) => `/tenants/${encodeURIComponent(id)}/status`,
    },
    DOMAINS: {
        BASE: '/domains',
        BY_ID: (id: string) => `/domains/${encodeURIComponent(id)}`,
        ASSIGN: (id: string) => `/domains/${encodeURIComponent(id)}/assign`,
        VERIFY: (id: string) => `/domains/${encodeURIComponent(id)}/verify`,
        STATUS: (id: string) => `/domains/${encodeURIComponent(id)}/status`,
    },
    ONBOARDING: {
        BASE: '/onboarding',
        BY_TENANT_ID: (tenantId: string) => `/onboarding/${encodeURIComponent(tenantId)}`,
        INVITATIONS: (tenantId: string) =>
            `/onboarding/${encodeURIComponent(tenantId)}/primary-admin-invitation`,
        RESEND_INVITATION: (tenantId: string, invitationId: string) =>
            `/onboarding/${encodeURIComponent(tenantId)}/primary-admin-invitation/${encodeURIComponent(invitationId)}/resend`,
        REVOKE_INVITATION: (tenantId: string, invitationId: string) =>
            `/onboarding/${encodeURIComponent(tenantId)}/primary-admin-invitation/${encodeURIComponent(invitationId)}/revoke`,
    },
    PLATFORM_ADMINS: {
        BASE: '/platform/admins',
        RESTRICTIONS: (adminId: string) =>
            `/platform/admins/${encodeURIComponent(adminId)}/restrictions`,
        INVITATIONS: '/platform/admins/invitations',
        VALIDATE_INVITATION: '/platform/admins/invitations/validate',
        ACTIVATE_INVITATION: '/platform/admins/invitations/activate',
        REVOKE_INVITATION: (invitationId: string) =>
            `/platform/admins/invitations/${encodeURIComponent(invitationId)}/revoke`,
    },
    PLATFORM_DASHBOARD: {
        SUMMARY: '/platform/dashboard/summary',
    },
    PLATFORM_SETTINGS: {
        BASE: '/platform/settings',
    },
    PLATFORM_AUDIT_LOGS: {
        BASE: '/platform/audit-logs',
        BY_ID: (id: string) => `/platform/audit-logs/${encodeURIComponent(id)}`,
    },
    PLATFORM_MONITORING: {
        SUMMARY: '/platform/monitoring/summary',
    },
    PLATFORM_SUPPORT: {
        TICKETS: '/platform/support/tickets',
        TICKET_BY_ID: (id: string) => `/platform/support/tickets/${encodeURIComponent(id)}`,
        TICKET_MESSAGES: (id: string) =>
            `/platform/support/tickets/${encodeURIComponent(id)}/messages`,
        TICKET_STATUS: (id: string) =>
            `/platform/support/tickets/${encodeURIComponent(id)}/status`,
        TICKET_PRIORITY: (id: string) =>
            `/platform/support/tickets/${encodeURIComponent(id)}/priority`,
        TICKET_ASSIGNMENT: (id: string) =>
            `/platform/support/tickets/${encodeURIComponent(id)}/assignment`,
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