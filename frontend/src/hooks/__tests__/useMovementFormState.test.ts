import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMovementFormState } from '../useMovementFormState';
import type { Movement, MovementTemplate, Pocket } from '../../types';

/**
 * Tests for {@link useMovementFormState}. The hook is a thin useState
 * wrapper that holds modal visibility, the movement currently being
 * edited, the URL-prefill `defaultValues`, reminder linkage, and
 * "live" form values reported by the form via onValuesChange.
 *
 * The non-trivial bits we lock down here:
 *   - resetFormState clears form/template/default/live state but
 *     intentionally leaves reminder linkage alone (reminders are managed
 *     by callers that drive their own lifecycle).
 *   - openNewForm wipes any previous editing context.
 *   - openEditForm tolerates an undefined pocket (the parameter is part
 *     of the contract for callers that may not have looked the pocket
 *     up yet).
 */

const sampleMovement: Movement = {
  id: 'mov-1',
  type: 'EgresoNormal',
  accountId: 'acc-1',
  pocketId: 'pkt-1',
  amount: 100,
  notes: 'Coffee',
  displayedDate: '2025-06-15',
  createdAt: '2025-06-15T10:00:00.000Z',
};

const samplePocket: Pocket = {
  id: 'pkt-1',
  accountId: 'acc-1',
  name: 'Savings',
  type: 'normal',
  balance: 0,
  currency: 'USD',
};

const templates: MovementTemplate[] = [];

describe('useMovementFormState', () => {
  describe('initial state', () => {
    it('returns sensible defaults', () => {
      const { result } = renderHook(() => useMovementFormState(templates));

      expect(result.current.showForm).toBe(false);
      expect(result.current.editingMovement).toBeNull();
      expect(result.current.selectedTemplateId).toBe('');
      expect(result.current.defaultValues).toEqual({});
      expect(result.current.reminderId).toBeNull();
      expect(result.current.reminderDate).toBeNull();
      expect(result.current.reminderRecurring).toBe(false);
      expect(result.current.liveValues).toEqual({
        type: 'EgresoNormal',
        accountId: '',
        pocketId: '',
        subPocketId: '',
        amount: '',
      });
    });
  });

  describe('individual setters', () => {
    it('updates showForm', () => {
      const { result } = renderHook(() => useMovementFormState(templates));

      act(() => result.current.setShowForm(true));
      expect(result.current.showForm).toBe(true);

      act(() => result.current.setShowForm(false));
      expect(result.current.showForm).toBe(false);
    });

    it('updates editingMovement', () => {
      const { result } = renderHook(() => useMovementFormState(templates));

      act(() => result.current.setEditingMovement(sampleMovement));
      expect(result.current.editingMovement).toEqual(sampleMovement);

      act(() => result.current.setEditingMovement(null));
      expect(result.current.editingMovement).toBeNull();
    });

    it('updates selectedTemplateId', () => {
      const { result } = renderHook(() => useMovementFormState(templates));

      act(() => result.current.setSelectedTemplateId('tpl-1'));
      expect(result.current.selectedTemplateId).toBe('tpl-1');
    });

    it('updates defaultValues', () => {
      const { result } = renderHook(() => useMovementFormState(templates));

      act(() =>
        result.current.setDefaultValues({
          amount: 50,
          notes: 'Test',
          date: '2025-06-15',
        }),
      );

      expect(result.current.defaultValues).toEqual({
        amount: 50,
        notes: 'Test',
        date: '2025-06-15',
      });
    });

    it('updates reminder fields independently', () => {
      const { result } = renderHook(() => useMovementFormState(templates));

      act(() => {
        result.current.setReminderId('rem-1');
        result.current.setReminderDate('2025-06-15');
        result.current.setReminderRecurring(true);
      });

      expect(result.current.reminderId).toBe('rem-1');
      expect(result.current.reminderDate).toBe('2025-06-15');
      expect(result.current.reminderRecurring).toBe(true);
    });

    it('updates liveValues', () => {
      const { result } = renderHook(() => useMovementFormState(templates));

      act(() =>
        result.current.setLiveValues({
          type: 'IngresoNormal',
          accountId: 'acc-1',
          pocketId: 'pkt-1',
          subPocketId: '',
          amount: '200',
        }),
      );

      expect(result.current.liveValues).toEqual({
        type: 'IngresoNormal',
        accountId: 'acc-1',
        pocketId: 'pkt-1',
        subPocketId: '',
        amount: '200',
      });
    });
  });

  describe('helpers', () => {
    it('handleTemplateSelect updates selectedTemplateId', () => {
      const { result } = renderHook(() => useMovementFormState(templates));

      act(() => result.current.handleTemplateSelect('tpl-2'));

      expect(result.current.selectedTemplateId).toBe('tpl-2');
    });

    it('openNewForm shows the form and clears any prior editing context', () => {
      const { result } = renderHook(() => useMovementFormState(templates));

      // Seed an editing context first so we can confirm openNewForm clears it.
      act(() => result.current.setEditingMovement(sampleMovement));
      expect(result.current.editingMovement).toEqual(sampleMovement);

      act(() => result.current.openNewForm());

      expect(result.current.showForm).toBe(true);
      expect(result.current.editingMovement).toBeNull();
    });

    it('openEditForm sets editingMovement and shows the form', () => {
      const { result } = renderHook(() => useMovementFormState(templates));

      act(() => result.current.openEditForm(sampleMovement, samplePocket));

      expect(result.current.showForm).toBe(true);
      expect(result.current.editingMovement).toEqual(sampleMovement);
    });

    it('openEditForm tolerates an undefined pocket argument', () => {
      const { result } = renderHook(() => useMovementFormState(templates));

      act(() => result.current.openEditForm(sampleMovement, undefined));

      expect(result.current.showForm).toBe(true);
      expect(result.current.editingMovement).toEqual(sampleMovement);
    });

    it('resetFormState clears form, template, defaultValues, and liveValues', () => {
      const { result } = renderHook(() => useMovementFormState(templates));

      // Mutate the relevant state slices.
      act(() => {
        result.current.setShowForm(true);
        result.current.setEditingMovement(sampleMovement);
        result.current.setSelectedTemplateId('tpl-3');
        result.current.setDefaultValues({ amount: 100 });
        result.current.setLiveValues({
          type: 'IngresoFijo',
          accountId: 'acc-2',
          pocketId: 'pkt-2',
          subPocketId: '',
          amount: '500',
        });
      });

      act(() => result.current.resetFormState());

      expect(result.current.showForm).toBe(false);
      expect(result.current.editingMovement).toBeNull();
      expect(result.current.selectedTemplateId).toBe('');
      expect(result.current.defaultValues).toEqual({});
      expect(result.current.liveValues).toEqual({
        type: 'EgresoNormal',
        accountId: '',
        pocketId: '',
        subPocketId: '',
        amount: '',
      });
    });

    it('resetFormState does NOT clear reminder linkage', () => {
      const { result } = renderHook(() => useMovementFormState(templates));

      act(() => {
        result.current.setReminderId('rem-1');
        result.current.setReminderDate('2025-06-15');
        result.current.setReminderRecurring(true);
        result.current.setShowForm(true);
      });

      act(() => result.current.resetFormState());

      // showForm is reset, but reminder fields persist — they are managed
      // separately by the caller that wired up the reminder link.
      expect(result.current.showForm).toBe(false);
      expect(result.current.reminderId).toBe('rem-1');
      expect(result.current.reminderDate).toBe('2025-06-15');
      expect(result.current.reminderRecurring).toBe(true);
    });
  });

  describe('callback identity', () => {
    it('keeps helper callbacks referentially stable across renders', () => {
      const { result, rerender } = renderHook(() =>
        useMovementFormState(templates),
      );

      const initialReset = result.current.resetFormState;
      const initialOpenNew = result.current.openNewForm;
      const initialOpenEdit = result.current.openEditForm;
      const initialHandleTemplate = result.current.handleTemplateSelect;

      rerender();

      // useCallback wrappers should keep stable identities so memoized
      // children that consume these handlers don't re-render unnecessarily.
      expect(result.current.resetFormState).toBe(initialReset);
      expect(result.current.openNewForm).toBe(initialOpenNew);
      expect(result.current.openEditForm).toBe(initialOpenEdit);
      expect(result.current.handleTemplateSelect).toBe(initialHandleTemplate);
    });
  });
});
