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
    SCHOOL_STAFF: {
        BASE: '/school/staff',
        BY_ID: (id: string) => `/school/staff/${encodeURIComponent(id)}`,
        STATUS: (id: string) => `/school/staff/${encodeURIComponent(id)}/status`,
        INVITATIONS: '/school/staff/invitations',
        VALIDATE_INVITATION: '/school/staff/invitations/validate',
        ACTIVATE_INVITATION: '/school/staff/invitations/activate',
        RESEND_INVITATION: (invitationId: string) =>
            `/school/staff/invitations/${encodeURIComponent(invitationId)}/resend`,
        REVOKE_INVITATION: (invitationId: string) =>
            `/school/staff/invitations/${encodeURIComponent(invitationId)}/revoke`,
    },
    SCHOOL_TEACHERS: {
        PROFILE: (teacherId: string) =>
            `/school/teachers/${encodeURIComponent(teacherId)}/profile`,
        PERMISSIONS: (teacherId: string) =>
            `/school/teachers/${encodeURIComponent(teacherId)}/permissions`,
    },
    SCHOOL_STUDENTS: {
        BASE: '/school/students',
        BY_ID: (studentId: string) => `/school/students/${encodeURIComponent(studentId)}`,
        PROFILE: (studentId: string) =>
            `/school/students/${encodeURIComponent(studentId)}/profile`,
        REGISTRATION_DECISION: (studentId: string) =>
            `/school/students/${encodeURIComponent(studentId)}/registration-decision`,
        STATUS: (studentId: string) =>
            `/school/students/${encodeURIComponent(studentId)}/status`,
        ENROLLMENTS: (studentId: string) =>
            `/school/students/${encodeURIComponent(studentId)}/enrollments`,
        PROGRAM_ENROLLMENTS: (studentId: string) =>
            `/school/students/${encodeURIComponent(studentId)}/enrollments/programs`,
        STANDALONE_COURSE_ENROLLMENTS: (studentId: string) =>
            `/school/students/${encodeURIComponent(studentId)}/enrollments/standalone-courses`,
        ENROLLMENT_STATUS: (studentId: string, enrollmentId: string) =>
            `/school/students/${encodeURIComponent(studentId)}/enrollments/${encodeURIComponent(
                enrollmentId
            )}/status`,
        ENROLLMENT_SECTION_TRANSFER: (studentId: string, enrollmentId: string) =>
            `/school/students/${encodeURIComponent(studentId)}/enrollments/${encodeURIComponent(
                enrollmentId
            )}/section-transfer`,
        ENROLLMENT_HISTORY: (studentId: string, enrollmentId: string) =>
            `/school/students/${encodeURIComponent(studentId)}/enrollments/${encodeURIComponent(
                enrollmentId
            )}/history`,
        PROGRAM_CHANGE_REQUESTS: (studentId: string) =>
            `/school/students/${encodeURIComponent(studentId)}/program-change-requests`,
        ENROLLMENT_PROGRAM_CHANGE_REQUESTS: (studentId: string, enrollmentId: string) =>
            `/school/students/${encodeURIComponent(studentId)}/enrollments/${encodeURIComponent(
                enrollmentId
            )}/program-change-requests`,
        PROGRAM_CHANGE_DECISION: (studentId: string, requestId: string) =>
            `/school/students/${encodeURIComponent(studentId)}/program-change-requests/${encodeURIComponent(
                requestId
            )}/decision`,
    },
    SCHOOL_PROFILE: {
        BASE: '/school/profile',
        BRANDING: '/school/branding',
        UPLOAD_LOGO: '/school/branding/logo',
        UPLOAD_FAVICON: '/school/branding/favicon',
    },
    SCHOOL_SETTINGS: {
        BASE: '/school/settings',
    },
    SCHOOL_WEBSITE: {
        BASE: '/school/website',
        DRAFT: '/school/website/draft',
        PUBLISH: '/school/website/publish',
    },
    PUBLIC_WEBSITE: {
        CONFIG: '/public/website-config',
    },
    ACADEMIC: {
        ACADEMIC_YEARS: '/academic/academic-years',
        ACADEMIC_YEAR_BY_ID: (id: string) =>
            `/academic/academic-years/${encodeURIComponent(id)}`,
        ACADEMIC_YEAR_STATUS: (id: string) =>
            `/academic/academic-years/${encodeURIComponent(id)}/status`,
        TERMS: '/academic/terms',
        TERMS_BY_ACADEMIC_YEAR: (academicYearId: string) =>
            `/academic/academic-years/${encodeURIComponent(academicYearId)}/terms`,
        TERM_BY_ID: (id: string) => `/academic/terms/${encodeURIComponent(id)}`,
        TERM_STATUS: (id: string) => `/academic/terms/${encodeURIComponent(id)}/status`,
        CLASSES: '/academic/classes',
        CLASS_BY_ID: (id: string) => `/academic/classes/${encodeURIComponent(id)}`,
        CLASS_STATUS: (id: string) => `/academic/classes/${encodeURIComponent(id)}/status`,
        SECTIONS: '/academic/sections',
        SECTIONS_BY_CLASS: (classId: string) =>
            `/academic/classes/${encodeURIComponent(classId)}/sections`,
        SECTION_BY_ID: (id: string) => `/academic/sections/${encodeURIComponent(id)}`,
        SECTION_STATUS: (id: string) => `/academic/sections/${encodeURIComponent(id)}/status`,
        PROGRAMS: '/academic/programs',
        PROGRAM_BY_ID: (id: string) => `/academic/programs/${encodeURIComponent(id)}`,
        PROGRAM_STATUS: (id: string) => `/academic/programs/${encodeURIComponent(id)}/status`,
        PROGRAM_COURSES: (programId: string) =>
            `/academic/programs/${encodeURIComponent(programId)}/courses`,
        PROGRAM_COURSE_BY_ID: (programId: string, programCourseId: string) =>
            `/academic/programs/${encodeURIComponent(programId)}/courses/${encodeURIComponent(
                programCourseId
            )}`,
        PROGRAM_COURSES_REORDER: (programId: string) =>
            `/academic/programs/${encodeURIComponent(programId)}/courses/reorder`,
        COURSES: '/academic/courses',
        COURSE_BY_ID: (id: string) => `/academic/courses/${encodeURIComponent(id)}`,
        COURSE_STATUS: (id: string) => `/academic/courses/${encodeURIComponent(id)}/status`,
        ASSIGNABLE_TEACHERS: '/academic/assignable-teachers',
        TEACHER_ASSIGNMENTS: '/academic/teacher-assignments',
        TEACHER_ASSIGNMENT_BY_ID: (assignmentId: string) =>
            `/academic/teacher-assignments/${encodeURIComponent(assignmentId)}`,
        ENROLLMENTS: '/academic/enrollments',
        PROGRAM_CHANGE_REQUESTS: '/academic/enrollments/program-change-requests',
    },
    FINANCE: {
        PAYMENTS: '/finance/payments',
        PAYMENT_BY_ID: (paymentId: string) => `/finance/payments/${encodeURIComponent(paymentId)}`,
        PAYMENT_VERIFICATION: (paymentId: string) =>
            `/finance/payments/${encodeURIComponent(paymentId)}/verification`,
        PAYMENT_RECEIPT: (paymentId: string) =>
            `/finance/payments/${encodeURIComponent(paymentId)}/receipt`,
        STUDENT_PAYMENTS: (studentId: string) =>
            `/finance/students/${encodeURIComponent(studentId)}/payments`,
        STUDENT_BALANCE: (studentId: string) =>
            `/finance/students/${encodeURIComponent(studentId)}/balance`,
        BALANCES: '/finance/balances',
        FEE_ASSIGNMENTS: '/finance/fee-assignments',
        FEE_ASSIGNMENT_BY_ID: (feeId: string) =>
            `/finance/fee-assignments/${encodeURIComponent(feeId)}`,
        INVOICES: '/finance/invoices',
        INVOICE_BY_ID: (invoiceId: string) =>
            `/finance/invoices/${encodeURIComponent(invoiceId)}`,
        REPORTS_SUMMARY: '/finance/reports/summary',
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