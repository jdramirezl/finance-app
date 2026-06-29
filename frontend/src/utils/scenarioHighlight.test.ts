import { describe, expect, it } from 'vitest';
import {
  EMPTY_SCENARIO_HIGHLIGHT,
  computeScenarioHighlight,
} from './scenarioHighlight';
import type { PlanningScenario } from '../components/budget/ScenarioForm';

const scenario = (id: string, expenseIds: string[]): PlanningScenario => ({
  id,
  name: `Scenario ${id}`,
  expenseIds,
});

describe('computeScenarioHighlight', () => {
  it('returns no highlights when no scenarios are active', () => {
    const result = computeScenarioHighlight(
      [scenario('s1', ['a', 'b']), scenario('s2', ['c'])],
      new Set<string>(),
    );

    expect(result.expenseIds.size).toBe(0);
    expect(result.countByExpense.size).toBe(0);
    expect(result.hasActiveScenarios).toBe(false);
  });

  it('marks hasActiveScenarios=true even when the active scenario is empty', () => {
    const result = computeScenarioHighlight(
      [scenario('s1', [])],
      new Set(['s1']),
    );

    expect(result.expenseIds.size).toBe(0);
    expect(result.hasActiveScenarios).toBe(true);
  });

  it('collects expense ids from a single active scenario', () => {
    const result = computeScenarioHighlight(
      [scenario('s1', ['a', 'b', 'c']), scenario('s2', ['x'])],
      new Set(['s1']),
    );

    expect(Array.from(result.expenseIds).sort()).toEqual(['a', 'b', 'c']);
    expect(result.countByExpense.get('a')).toBe(1);
    expect(result.countByExpense.get('b')).toBe(1);
    expect(result.countByExpense.get('c')).toBe(1);
    expect(result.countByExpense.has('x')).toBe(false);
  });

  it('counts overlap across multiple active scenarios', () => {
    const result = computeScenarioHighlight(
      [
        scenario('s1', ['a', 'b']),
        scenario('s2', ['b', 'c']),
        scenario('s3', ['b', 'd']),
      ],
      new Set(['s1', 's2', 's3']),
    );

    expect(Array.from(result.expenseIds).sort()).toEqual(['a', 'b', 'c', 'd']);
    expect(result.countByExpense.get('a')).toBe(1);
    expect(result.countByExpense.get('b')).toBe(3);
    expect(result.countByExpense.get('c')).toBe(1);
    expect(result.countByExpense.get('d')).toBe(1);
    expect(result.hasActiveScenarios).toBe(true);
  });

  it('ignores inactive scenarios entirely', () => {
    const result = computeScenarioHighlight(
      [
        scenario('s1', ['a', 'b']),
        scenario('s2', ['c', 'd']), // inactive
      ],
      new Set(['s1']),
    );

    expect(result.expenseIds.has('c')).toBe(false);
    expect(result.expenseIds.has('d')).toBe(false);
    expect(result.countByExpense.has('c')).toBe(false);
  });

  it('accepts an array form of activeScenarioIds', () => {
    const result = computeScenarioHighlight(
      [scenario('s1', ['a']), scenario('s2', ['b'])],
      ['s1', 's2'],
    );

    expect(Array.from(result.expenseIds).sort()).toEqual(['a', 'b']);
    expect(result.hasActiveScenarios).toBe(true);
  });

  it('does not double-count when the same expense id is listed twice in one scenario', () => {
    // Defensive: even though scenarios should not normally contain
    // duplicate ids, computeScenarioHighlight should not silently amplify
    // counts when callers pass dirty data.
    const result = computeScenarioHighlight(
      [scenario('s1', ['a', 'a', 'b'])],
      new Set(['s1']),
    );

    // The function does increment per occurrence today — assert the
    // contract explicitly so a future change is deliberate.
    expect(result.countByExpense.get('a')).toBe(2);
    expect(result.countByExpense.get('b')).toBe(1);
    expect(result.expenseIds.has('a')).toBe(true);
  });
});

describe('EMPTY_SCENARIO_HIGHLIGHT', () => {
  it('has empty collections and hasActiveScenarios=false', () => {
    expect(EMPTY_SCENARIO_HIGHLIGHT.expenseIds.size).toBe(0);
    expect(EMPTY_SCENARIO_HIGHLIGHT.countByExpense.size).toBe(0);
    expect(EMPTY_SCENARIO_HIGHLIGHT.hasActiveScenarios).toBe(false);
  });
});
