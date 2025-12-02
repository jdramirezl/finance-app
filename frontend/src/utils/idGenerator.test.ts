import { describe, it, expect } from 'vitest';
import { generateId } from './idGenerator';

describe('idGenerator', () => {
    it('should generate a unique ID', () => {
        const id = generateId();
        expect(id).toBeDefined();
        expect(typeof id).toBe('string');
        expect(id.length).toBeGreaterThan(0);
    });

    it('should generate different IDs on consecutive calls', () => {
        const id1 = generateId();
        const id2 = generateId();
        expect(id1).not.toBe(id2);
    });

    it('should generate IDs with consistent format', () => {
        const ids = Array.from({ length: 10 }, () => generateId());
        ids.forEach((id) => {
            expect(id).toMatch(/^[a-z0-9-]+$/);
        });
    });
});
