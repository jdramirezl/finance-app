import { useEffect } from 'react';
import {
    useAccountsQuery,
    usePocketsQuery,
    useSubPocketsQuery,
} from '../../hooks/queries';
import Select from '../Select';
import { isFixedMovement } from '../../utils/movementTypes';
import type { MovementType } from '../../types';

/**
 * Props for the AccountPocketSelector component.
 *
 * The selector renders a cascading account → pocket → optional sub-pocket
 * dropdown group. It encapsulates the duplicated filtering and auto-select
 * logic that previously lived in MovementForm, MovementTemplateForm, and
 * (in a follow-up task) BatchMovementForm and RestoreOrphanedModal.
 *
 * The component supports two distinct usage modes via `enforceMovementType`:
 *
 *   1. "Smart" mode (`enforceMovementType={true}`): the account list is
 *      restricted to accounts that have a fixed pocket when `movementType`
 *      is fixed; the pocket list is restricted to fixed pockets (or
 *      non-fixed pockets when `movementType` is non-fixed); and the fixed
 *      pocket is auto-selected as soon as an account is chosen. This
 *      mirrors the live-movement entry flow.
 *
 *   2. "Free" mode (`enforceMovementType={false}` — the default): all
 *      accounts and pockets are listed unmodified. The user is free to
 *      pick any combination. This matches the template-creation flow,
 *      where templates may legitimately reference any account/pocket
 *      regardless of movement type.
 *
 * In either mode, the sub-pocket dropdown is shown only when `showSubPocket`
 * is true AND a fixed pocket exists in the selected account AND that fixed
 * pocket has at least one sub-pocket. This matches the legacy condition
 * `fixedPocket && isFixedExpense && availableSubPockets.length > 0`.
 */
export interface AccountPocketSelectorProps {
    /** Currently-selected account id (controlled). */
    accountId: string;
    /** Currently-selected pocket id (controlled). */
    pocketId: string;
    /**
     * Currently-selected sub-pocket id (controlled). Optional because some
     * consumers do not surface sub-pockets at all.
     */
    subPocketId?: string;

    /** Called when the user picks a different account. */
    onAccountChange: (id: string) => void;
    /** Called when the user picks a different pocket. */
    onPocketChange: (id: string) => void;
    /**
     * Called when the user picks a different sub-pocket. Required if
     * `showSubPocket` is true; otherwise unused.
     */
    onSubPocketChange?: (id: string) => void;

    /**
     * The current movement type. Used to drive sub-pocket visibility (sub-pockets
     * are only meaningful for fixed movement types) and, when
     * `enforceMovementType` is true, to drive account/pocket filtering and
     * auto-selection.
     */
    movementType?: MovementType;

    /**
     * Enables the "smart" filtering and auto-select behavior described in
     * the component-level docstring. Default: false.
     */
    enforceMovementType?: boolean;

    /**
     * When true, render an info banner after the grid announcing that the
     * fixed pocket has been auto-selected. Only meaningful in conjunction
     * with `enforceMovementType` and a fixed `movementType`. Default: false.
     */
    showFixedPocketHint?: boolean;

    /**
     * When true, render the sub-pocket select after the account/pocket grid
     * (and after the hint banner, if present). The select is only rendered
     * if a fixed pocket exists in the selected account AND that fixed
     * pocket has sub-pockets. Default: false.
     */
    showSubPocket?: boolean;

    /**
     * When true, append the account currency code to account option labels
     * (e.g. "Checking (USD)"). Default: false.
     */
    showAccountCurrency?: boolean;

    /**
     * Optional `name` attribute for the account select. Required when the
     * containing form relies on FormData to read submitted values.
     */
    accountName?: string;
    /** Optional `name` attribute for the pocket select. */
    pocketName?: string;
    /** Optional `name` attribute for the sub-pocket select. */
    subPocketName?: string;

    /** Display label for the account select. Default: "Account". */
    accountLabel?: string;
    /** Display label for the pocket select. Default: "Pocket". */
    pocketLabel?: string;
    /** Display label for the sub-pocket select. Default: "Sub-Pocket (Optional)". */
    subPocketLabel?: string;

    /** Marks the account and pocket selects as required. Default: false. */
    required?: boolean;
    /** Disables all rendered selects. Default: false. */
    disabled?: boolean;
}

const AccountPocketSelector = ({
    accountId,
    pocketId,
    subPocketId = '',
    onAccountChange,
    onPocketChange,
    onSubPocketChange,
    movementType,
    enforceMovementType = false,
    showFixedPocketHint = false,
    showSubPocket = false,
    showAccountCurrency = false,
    accountName,
    pocketName,
    subPocketName,
    accountLabel = 'Account',
    pocketLabel = 'Pocket',
    subPocketLabel = 'Sub-Pocket (Optional)',
    required = false,
    disabled = false,
}: AccountPocketSelectorProps) => {
    const { data: accounts = [] } = useAccountsQuery();
    const { data: pockets = [] } = usePocketsQuery();
    const { data: subPockets = [] } = useSubPocketsQuery();

    const isFixedType = movementType ? isFixedMovement(movementType) : false;

    // Account list — restricted to accounts that have at least one fixed
    // pocket when the smart mode is engaged for a fixed movement type.
    const filteredAccounts = enforceMovementType && isFixedType
        ? accounts.filter((acc) =>
            pockets.some((p) => p.accountId === acc.id && p.type === 'fixed'),
        )
        : accounts;

    // Pockets that belong to the currently-selected account.
    const availablePockets = accountId
        ? pockets.filter((p) => p.accountId === accountId)
        : [];

    // Pocket list — restricted to fixed pockets for fixed types and
    // non-fixed pockets for non-fixed types when the smart mode is engaged.
    const filteredPockets = enforceMovementType && movementType
        ? availablePockets.filter((p) => (isFixedType ? p.type === 'fixed' : p.type !== 'fixed'))
        : availablePockets;

    // The (single) fixed pocket within the selected account, if any. Sub-
    // pockets always live under a fixed pocket — the audit notes that
    // exactly one fixed pocket may exist per user/account globally — so
    // looking up the fixed pocket here is sufficient.
    const fixedPocket = availablePockets.find((p) => p.type === 'fixed');
    const availableSubPockets = fixedPocket
        ? subPockets.filter((sp) => sp.pocketId === fixedPocket.id)
        : [];

    // Auto-select the fixed pocket whenever the smart mode is engaged for a
    // fixed type and an account is selected. Mirrors the legacy
    // MovementForm useEffect, including the corner case where the chosen
    // account has no fixed pocket (clear it so the user can pick another).
    useEffect(() => {
        if (!enforceMovementType || !movementType) return;

        if (isFixedType && accountId) {
            const target = pockets.find(
                (p) => p.accountId === accountId && p.type === 'fixed',
            );
            if (target && pocketId !== target.id) {
                onPocketChange(target.id);
            } else if (!target) {
                onAccountChange('');
                onPocketChange('');
            }
        } else if (!isFixedType && pocketId) {
            const current = pockets.find((p) => p.id === pocketId);
            if (current?.type === 'fixed') {
                onPocketChange('');
            }
        }
    }, [
        enforceMovementType,
        movementType,
        isFixedType,
        accountId,
        pockets,
        pocketId,
        onAccountChange,
        onPocketChange,
    ]);

    // Cascading reset: when the user changes account, any previously-selected
    // pocket and sub-pocket are no longer valid. We clear them eagerly so
    // submitted FormData and controlled state never carry stale references.
    const handleAccountChange = (newAccountId: string) => {
        onAccountChange(newAccountId);
        if (pocketId) onPocketChange('');
        if (subPocketId && onSubPocketChange) onSubPocketChange('');
    };

    // Cascading reset: when the user changes pocket, any previously-selected
    // sub-pocket no longer belongs under the new pocket.
    const handlePocketChange = (newPocketId: string) => {
        onPocketChange(newPocketId);
        if (subPocketId && onSubPocketChange) onSubPocketChange('');
    };

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                    label={accountLabel}
                    name={accountName}
                    required={required}
                    disabled={disabled}
                    value={accountId}
                    onChange={(e) => handleAccountChange(e.target.value)}
                    options={[
                        { value: '', label: 'Select Account' },
                        ...filteredAccounts.map((acc) => ({
                            value: acc.id,
                            label: showAccountCurrency
                                ? `${acc.name} (${acc.currency})`
                                : acc.name,
                        })),
                    ]}
                />

                <Select
                    label={pocketLabel}
                    name={pocketName}
                    required={required}
                    disabled={disabled || !accountId}
                    value={pocketId}
                    onChange={(e) => handlePocketChange(e.target.value)}
                    options={[
                        { value: '', label: 'Select Pocket' },
                        ...filteredPockets.map((p) => ({ value: p.id, label: p.name })),
                    ]}
                />
            </div>

            {showFixedPocketHint && enforceMovementType && isFixedType && accountId && fixedPocket && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                        ℹ️ Fixed expense pocket has been automatically selected:{' '}
                        <strong>{fixedPocket.name}</strong>
                    </p>
                </div>
            )}

            {showSubPocket && fixedPocket && availableSubPockets.length > 0 && (
                <Select
                    label={subPocketLabel}
                    name={subPocketName}
                    disabled={disabled}
                    value={subPocketId}
                    onChange={(e) => onSubPocketChange?.(e.target.value)}
                    options={[
                        { value: '', label: 'None' },
                        ...availableSubPockets.map((sp) => ({ value: sp.id, label: sp.name })),
                    ]}
                />
            )}
        </>
    );
};

export default AccountPocketSelector;
