import {
    PERMISSIONS,
    SCHOOL_PERMISSION_DEFINITIONS,
    type PermissionArrayValidationResult,
    type PermissionKey,
    type SchoolPermissionDefinition,
} from '../../../constants/permissions';
import type { Permission } from '../../../types/auth';

export type TeacherPermissionCategory =
    | 'COURSES'
    | 'PROGRAMS'
    | 'STUDENTS'
    | 'ATTENDANCE'
    | 'ASSIGNMENTS'
    | 'ASSESSMENTS'
    | 'ANNOUNCEMENTS';

/**
 * Strict, centralized allowlist of functional permissions eligible for assignment
 * to a TEACHER within the Teacher Portal.
 *
 * Explicitly excludes:
 * - Platform Admin permissions (platform.*)
 * - School Admin & Staff administration (school_admins.*, teachers.*, users.*, roles.*)
 * - School settings, branding, and website CMS (settings.*, school_profile.*, website.*)
 * - Financial and payment operations (payments.*)
 * - Registrar/structural administration (enrollments.*, academic_years.*, terms.*, classes.*, sections.*, courses.create/delete, programs.create/update/delete/assign_*, students.create/update/delete/disable/approve)
 * - Reports, notifications management, support tickets, and audit logs
 */
export const TEACHER_FUNCTIONAL_PERMISSION_GROUPS = [
    {
        category: 'COURSES',
        title: 'Courses',
        description: 'View assigned courses and update instructional syllabus details.',
        permissions: [PERMISSIONS.COURSES.READ, PERMISSIONS.COURSES.UPDATE],
    },
    {
        category: 'PROGRAMS',
        title: 'Programs',
        description: 'View academic and skill program curriculum context (read-only).',
        permissions: [PERMISSIONS.PROGRAMS.READ],
    },
    {
        category: 'STUDENTS',
        title: 'Students',
        description: 'View student directory profiles and academic track context.',
        permissions: [PERMISSIONS.STUDENTS.READ],
    },
    {
        category: 'ATTENDANCE',
        title: 'Attendance',
        description: 'View, record, and update student class attendance.',
        permissions: [
            PERMISSIONS.ATTENDANCE.READ,
            PERMISSIONS.ATTENDANCE.CREATE,
            PERMISSIONS.ATTENDANCE.UPDATE,
        ],
    },
    {
        category: 'ASSIGNMENTS',
        title: 'Assignments',
        description: 'View, create, update, remove, and grade student coursework assignments.',
        permissions: [
            PERMISSIONS.ASSIGNMENTS.READ,
            PERMISSIONS.ASSIGNMENTS.CREATE,
            PERMISSIONS.ASSIGNMENTS.UPDATE,
            PERMISSIONS.ASSIGNMENTS.DELETE,
            PERMISSIONS.ASSIGNMENTS.GRADE,
        ],
    },
    {
        category: 'ASSESSMENTS',
        title: 'Assessments',
        description: 'View, create, update, remove, and score student exams and quizzes.',
        permissions: [
            PERMISSIONS.ASSESSMENTS.READ,
            PERMISSIONS.ASSESSMENTS.CREATE,
            PERMISSIONS.ASSESSMENTS.UPDATE,
            PERMISSIONS.ASSESSMENTS.DELETE,
            PERMISSIONS.ASSESSMENTS.GRADE,
        ],
    },
    {
        category: 'ANNOUNCEMENTS',
        title: 'Announcements',
        description: 'Read, draft, edit, delete, and publish teaching announcements.',
        permissions: [
            PERMISSIONS.ANNOUNCEMENTS.READ,
            PERMISSIONS.ANNOUNCEMENTS.CREATE,
            PERMISSIONS.ANNOUNCEMENTS.UPDATE,
            PERMISSIONS.ANNOUNCEMENTS.DELETE,
            PERMISSIONS.ANNOUNCEMENTS.PUBLISH,
        ],
    },
] as const;

export type TeacherFunctionalPermissionKey =
    (typeof TEACHER_FUNCTIONAL_PERMISSION_GROUPS)[number]['permissions'][number];

export const TEACHER_FUNCTIONAL_PERMISSION_ALLOWLIST: readonly TeacherFunctionalPermissionKey[] =
    TEACHER_FUNCTIONAL_PERMISSION_GROUPS.flatMap((group) => group.permissions);

const TEACHER_ALLOWLIST_SET = new Set<string>(TEACHER_FUNCTIONAL_PERMISSION_ALLOWLIST);
const TEACHER_ORDER_INDEX = new Map<string, number>(
    TEACHER_FUNCTIONAL_PERMISSION_ALLOWLIST.map((key, index) => [key, index])
);

const SCHOOL_DEFINITION_BY_KEY = new Map<PermissionKey, SchoolPermissionDefinition>(
    SCHOOL_PERMISSION_DEFINITIONS.map((def) => [def.key, def])
);

export interface TeacherPermissionCategoryGroup {
    category: TeacherPermissionCategory;
    title: string;
    description: string;
    definitions: readonly {
        key: TeacherFunctionalPermissionKey;
        label: string;
        description: string;
    }[];
}

export const TEACHER_PERMISSION_CATEGORY_GROUPS: readonly TeacherPermissionCategoryGroup[] =
    TEACHER_FUNCTIONAL_PERMISSION_GROUPS.map((group) => ({
        category: group.category,
        title: group.title,
        description: group.description,
        definitions: group.permissions.map((key) => {
            const def = SCHOOL_DEFINITION_BY_KEY.get(key);
            return {
                key,
                label: def?.label ?? key,
                description: def?.description ?? '',
            };
        }),
    }));

/**
 * Default Teacher permission policy status observed in frontend authorization architecture:
 * School users operate via explicit permission grants (`user.permissions.includes(permission)`).
 * An empty permission list (`[]`) grants zero functional permissions and never implies full access.
 * Any baseline template for newly activated teachers must be explicitly defined by backend/product policy.
 */
export const TEACHER_DEFAULT_PERMISSIONS_POLICY = {
    hasFrontendDefaultTemplate: false,
    emptyMeansFullAccess: false,
    summary:
        'No default Teacher permission template is defined in the frontend. Empty permission arrays represent zero explicit grants and must not be expanded automatically.',
} as const;

export function isTeacherFunctionalPermissionKey(
    permission: unknown
): permission is TeacherFunctionalPermissionKey {
    return typeof permission === 'string' && TEACHER_ALLOWLIST_SET.has(permission);
}

export function sortTeacherFunctionalPermissions(
    permissions: readonly TeacherFunctionalPermissionKey[]
): TeacherFunctionalPermissionKey[] {
    return [...permissions].sort(
        (a, b) => (TEACHER_ORDER_INDEX.get(a) ?? 0) - (TEACHER_ORDER_INDEX.get(b) ?? 0)
    );
}

export function validateTeacherFunctionalPermissions(
    value: unknown
): PermissionArrayValidationResult<TeacherFunctionalPermissionKey> {
    if (!Array.isArray(value)) {
        return { valid: false, reason: 'NOT_ARRAY' };
    }

    const seen = new Set<string>();
    const validated: TeacherFunctionalPermissionKey[] = [];

    for (const item of value) {
        if (!isTeacherFunctionalPermissionKey(item)) {
            return { valid: false, reason: 'INVALID_KEY' };
        }
        if (seen.has(item)) {
            return { valid: false, reason: 'DUPLICATE' };
        }
        seen.add(item);
        validated.push(item);
    }

    return {
        valid: true,
        keys: sortTeacherFunctionalPermissions(validated),
    };
}

export function areTeacherPermissionSetsEqual(
    a: readonly TeacherFunctionalPermissionKey[],
    b: readonly TeacherFunctionalPermissionKey[]
): boolean {
    if (a.length !== b.length) return false;
    const setB = new Set<string>(b);
    return a.every((item) => setB.has(item));
}

export function partitionAccountPermissionsByTeacherScope(permissions: readonly Permission[]): {
    teacherPermissions: TeacherFunctionalPermissionKey[];
    preservedNonTeacherPermissions: Permission[];
} {
    const teacherPermissions: TeacherFunctionalPermissionKey[] = [];
    const preservedNonTeacherPermissions: Permission[] = [];
    const seenTeacher = new Set<string>();
    const seenOther = new Set<string>();

    for (const perm of permissions) {
        if (isTeacherFunctionalPermissionKey(perm)) {
            if (!seenTeacher.has(perm)) {
                seenTeacher.add(perm);
                teacherPermissions.push(perm);
            }
        } else if (typeof perm === 'string' && perm.trim() !== '' && !seenOther.has(perm)) {
            seenOther.add(perm);
            preservedNonTeacherPermissions.push(perm);
        }
    }

    return {
        teacherPermissions: sortTeacherFunctionalPermissions(teacherPermissions),
        preservedNonTeacherPermissions,
    };
}

export function getTeacherPermissionLabel(permission: PermissionKey | string): string {
    const def = SCHOOL_DEFINITION_BY_KEY.get(permission as PermissionKey);
    return def?.label ?? permission;
}

