/**
 * FixedExpenseGroup Domain Entity Tests
 * 
 * Tests validation rules and business logic for FixedExpenseGroup entity
 */

import { FixedExpenseGroup } from './FixedExpenseGroup';

describe('FixedExpenseGroup Entity', () => {
  describe('Validation', () => {
    it('should create a valid group', () => {
      const group = new FixedExpenseGroup(
        'group-1',
        'Monthly Bills',
        '#3b82f6'
      );

      expect(group.id).toBe('group-1');
      expect(group.name).toBe('Monthly Bills');
      expect(group.color).toBe('#3b82f6');
    });

    it('should throw error if name is empty', () => {
      expect(() => new FixedExpenseGroup('group-1', '', '#3b82f6'))
        .toThrow('Group name cannot be empty');
    });

    it('should throw error if name is only whitespace', () => {
      expect(() => new FixedExpenseGroup('group-1', '   ', '#3b82f6'))
        .toThrow('Group name cannot be empty');
    });

    it('should throw error if color is invalid', () => {
      expect(() => new FixedExpenseGroup('group-1', 'Monthly Bills', 'blue'))
        .toThrow('Invalid color format - must be hex format like #3b82f6');
    });

    it('should throw error if color is missing #', () => {
      expect(() => new FixedExpenseGroup('group-1', 'Monthly Bills', '3b82f6'))
        .toThrow('Invalid color format - must be hex format like #3b82f6');
    });

    it('should throw error if color has wrong length', () => {
      expect(() => new FixedExpenseGroup('group-1', 'Monthly Bills', '#3b8'))
        .toThrow('Invalid color format - must be hex format like #3b82f6');
    });

    it('should throw error if color has invalid characters', () => {
      expect(() => new FixedExpenseGroup('group-1', 'Monthly Bills', '#gggggg'))
        .toThrow('Invalid color format - must be hex format like #3b82f6');
    });

    it('should accept uppercase hex colors', () => {
      const group = new FixedExpenseGroup('group-1', 'Monthly Bills', '#3B82F6');
      expect(group.color).toBe('#3B82F6');
    });

    it('should accept lowercase hex colors', () => {
      const group = new FixedExpenseGroup('group-1', 'Monthly Bills', '#3b82f6');
      expect(group.color).toBe('#3b82f6');
    });

    it('should accept mixed case hex colors', () => {
      const group = new FixedExpenseGroup('group-1', 'Monthly Bills', '#3B82f6');
      expect(group.color).toBe('#3B82f6');
    });
  });

  describe('Update Operations', () => {
    it('should update name', () => {
      const group = new FixedExpenseGroup('group-1', 'Monthly Bills', '#3b82f6');
      group.update('Weekly Bills');
      expect(group.name).toBe('Weekly Bills');
    });

    it('should update color', () => {
      const group = new FixedExpenseGroup('group-1', 'Monthly Bills', '#3b82f6');
      group.update(undefined, '#ef4444');
      expect(group.color).toBe('#ef4444');
    });

    it('should update both name and color', () => {
      const group = new FixedExpenseGroup('group-1', 'Monthly Bills', '#3b82f6');
      group.update('Weekly Bills', '#ef4444');
      expect(group.name).toBe('Weekly Bills');
      expect(group.color).toBe('#ef4444');
    });

    it('should validate after update', () => {
      const group = new FixedExpenseGroup('group-1', 'Monthly Bills', '#3b82f6');
      expect(() => group.update('', '#3b82f6'))
        .toThrow('Group name cannot be empty');
    });

    it('should validate color after update', () => {
      const group = new FixedExpenseGroup('group-1', 'Monthly Bills', '#3b82f6');
      expect(() => group.update('Monthly Bills', 'invalid'))
        .toThrow('Invalid color format - must be hex format like #3b82f6');
    });

    it('should not change values if update is called with undefined', () => {
      const group = new FixedExpenseGroup('group-1', 'Monthly Bills', '#3b82f6');
      group.update(undefined, undefined);
      expect(group.name).toBe('Monthly Bills');
      expect(group.color).toBe('#3b82f6');
    });
  });

  describe('Serialization', () => {
    it('should convert to JSON', () => {
      const group = new FixedExpenseGroup('group-1', 'Monthly Bills', '#3b82f6');
      const json = group.toJSON();

      expect(json).toEqual({
        id: 'group-1',
        name: 'Monthly Bills',
        color: '#3b82f6',
      });
    });

    it('should include all fields in JSON', () => {
      const group = new FixedExpenseGroup('group-1', 'Monthly Bills', '#3b82f6');
      const json = group.toJSON();

      expect(json).toHaveProperty('id');
      expect(json).toHaveProperty('name');
      expect(json).toHaveProperty('color');
    });
  });

  describe('Immutability', () => {
    it('should have readonly id', () => {
      const group = new FixedExpenseGroup('group-1', 'Monthly Bills', '#3b82f6');
      // TypeScript will prevent this at compile time, but we can verify the property exists
      expect(group.id).toBe('group-1');
    });
  });
});
