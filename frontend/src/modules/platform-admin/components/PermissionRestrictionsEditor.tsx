import React from 'react';
import {
    ALL_PLATFORM_PERMISSIONS,
    PLATFORM_PERMISSION_DEFINITIONS,
    type PlatformPermissionKey,
} from '../../../constants/permissions';

interface PermissionRestrictionsEditorProps {
    restrictedPermissions: PlatformPermissionKey[];
    isSuperAdminTarget?: boolean;
    readOnly?: boolean;
    disabled?: boolean;
    onChange?: (nextRestricted: PlatformPermissionKey[]) => void;
}

export const PermissionRestrictionsEditor: React.FC<PermissionRestrictionsEditorProps> = ({
    restrictedPermissions,
    isSuperAdminTarget = false,
    readOnly = false,
    disabled = false,
    onChange,
}) => {
    const restrictedSet = new Set<PlatformPermissionKey>(
        isSuperAdminTarget ? [] : restrictedPermissions
    );

    const effectivePermissions = ALL_PLATFORM_PERMISSIONS.filter(
        (permission) => !restrictedSet.has(permission)
    );

    const handleToggleRestriction = (permission: PlatformPermissionKey) => {
        if (isSuperAdminTarget || readOnly || disabled || !onChange) {
            return;
        }

        if (restrictedSet.has(permission)) {
            onChange(restrictedPermissions.filter((item) => item !== permission));
        } else {
            onChange([...restrictedPermissions, permission]);
        }
    };

    const isInteractive = !isSuperAdminTarget && !readOnly && Boolean(onChange);

    return (
        <div className="space-y-4">
            <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700">
                {isSuperAdminTarget ? (
                    <p>
                        The initial Super Admin permanently retains all platform permissions and cannot have individual permissions restricted.
                    </p>
                ) : (
                    <p>
                        Invited administrators share the common <span className="font-mono font-semibold">PLATFORM_ADMIN</span> role and receive all platform permissions by default unless specific permissions are restricted below.
                    </p>
                )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-900">
                <span className="font-medium">
                    Effective Permissions: {effectivePermissions.length} of {ALL_PLATFORM_PERMISSIONS.length} granted
                </span>
                <span>
                    {restrictedSet.size === 0
                        ? 'No restrictions (all permissions granted)'
                        : `${restrictedSet.size} permission${restrictedSet.size === 1 ? '' : 's'} restricted`}
                </span>
            </div>

            <ul className="space-y-2">
                {PLATFORM_PERMISSION_DEFINITIONS.map((definition) => {
                    const isRestricted = restrictedSet.has(definition.key);
                    const inputId = `perm-restrict-${definition.key}`;

                    return (
                        <li
                            key={definition.key}
                            className={`rounded-md border px-3 py-2.5 ${
                                isRestricted
                                    ? 'border-red-200 bg-red-50/50'
                                    : 'border-gray-200 bg-white'
                            }`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-2.5">
                                    {isInteractive && (
                                        <input
                                            id={inputId}
                                            type="checkbox"
                                            disabled={disabled}
                                            checked={isRestricted}
                                            onChange={() => handleToggleRestriction(definition.key)}
                                            aria-label={`Restrict ${definition.label}`}
                                            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-600 disabled:opacity-50"
                                        />
                                    )}
                                    <div>
                                        {isInteractive ? (
                                            <label
                                                htmlFor={inputId}
                                                className="block cursor-pointer text-sm font-medium text-gray-900"
                                            >
                                                {definition.label}
                                            </label>
                                        ) : (
                                            <p className="text-sm font-medium text-gray-900">
                                                {definition.label}
                                            </p>
                                        )}
                                        <p className="mt-0.5 text-xs text-gray-600">
                                            {definition.description}
                                        </p>
                                        <p className="mt-0.5 font-mono text-[11px] text-gray-400">
                                            {definition.key}
                                        </p>
                                    </div>
                                </div>

                                <span
                                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                                        isRestricted
                                            ? 'border-red-200 bg-red-50 text-red-700'
                                            : 'border-green-200 bg-green-50 text-green-700'
                                    }`}
                                >
                                    {isRestricted ? 'Restricted' : 'Granted'}
                                </span>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};

