/**
 * Write finance_* tools. Each reuses the API's request schema (so MCP and
 * REST validate identically) and delegates to the existing use case.
 * All calls are audit-logged by defineTool. No bulk / cascade / reorder tools.
 */
import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { defineTool, ToolContext } from './tools';
import { MOVEMENT_TYPES_HELP } from './readTools';
import {
  createMovementSchema,
  updateMovementSchema,
  createTransferSchema,
} from '../movements/presentation/schemas';
import { markAsPaidSchema } from '../reminders/presentation/schemas';
import { CreateMovementUseCase } from '../movements/application/useCases/CreateMovementUseCase';
import { CreateTransferUseCase } from '../movements/application/useCases/CreateTransferUseCase';
import { UpdateMovementUseCase } from '../movements/application/useCases/UpdateMovementUseCase';
import { DeleteMovementUseCase } from '../movements/application/useCases/DeleteMovementUseCase';
import { ApplyPendingMovementUseCase } from '../movements/application/useCases/ApplyPendingMovementUseCase';
import { MarkReminderAsPaidUseCase } from '../reminders/application/useCases/MarkReminderAsPaidUseCase';

const movementId = z.string().guid().describe('Movement id (from finance_list_movements).');
const DATE_HELP = 'displayedDate is the transaction date, YYYY-MM-DD.';

// isPending is accepted by the REST schema but ignored by UpdateMovementUseCase;
// pending → applied goes through finance_apply_pending_movement instead.
const updateMovementInput = updateMovementSchema.omit({ isPending: true }).extend({ id: movementId });

const idOf = (result: unknown): string | undefined =>
  (result && typeof result === 'object' && 'id' in result ? String((result as { id: unknown }).id) : undefined);

export function registerWriteTools(server: McpServer, ctx: ToolContext): void {
  defineTool(server, ctx, {
    name: 'finance_create_movement',
    title: 'Create movement',
    description:
      'Record one income or expense in an account + pocket. Amount is positive, in the account currency. ' +
      `${DATE_HELP} Set isPending=true for a planned movement that does not affect balances yet. ` +
      `subPocketId is only for fixed-expense pockets. ${MOVEMENT_TYPES_HELP}`,
    input: createMovementSchema,
    kind: 'write',
    auditIds: (input, result) => ({ movementId: idOf(result), accountId: input.accountId, pocketId: input.pocketId }),
    handler: (input, { userId, di }) => di.resolve(CreateMovementUseCase).execute(input, userId),
  });

  defineTool(server, ctx, {
    name: 'finance_create_transfer',
    title: 'Create transfer',
    description:
      'Move money between two pockets (same or different accounts). Creates a linked expense in the source ' +
      `and income in the target. ${DATE_HELP}`,
    input: createTransferSchema,
    kind: 'write',
    auditIds: (input, result) => {
      const r = result as { expense?: unknown; income?: unknown } | undefined;
      return {
        expenseId: idOf(r?.expense),
        incomeId: idOf(r?.income),
        sourcePocketId: input.sourcePocketId,
        targetPocketId: input.targetPocketId,
      };
    },
    handler: (input, { userId, di }) => di.resolve(CreateTransferUseCase).execute(input, userId),
  });

  defineTool(server, ctx, {
    name: 'finance_update_movement',
    title: 'Update movement',
    description:
      'Change fields of one existing movement; omitted fields are unchanged. Use null to clear subPocketId, ' +
      `category or tags. ${DATE_HELP} To apply a pending movement use finance_apply_pending_movement.`,
    input: updateMovementInput,
    kind: 'write',
    auditIds: (input) => ({ movementId: input.id, fields: Object.keys(input).filter((k) => k !== 'id') }),
    handler: ({ id, ...dto }, { userId, di }) => di.resolve(UpdateMovementUseCase).execute(id, dto, userId),
  });

  defineTool(server, ctx, {
    name: 'finance_delete_movement',
    title: 'Delete movement',
    description:
      'Permanently delete ONE movement by id and recalculate balances. A reminder paid with it becomes unpaid. ' +
      'For transfers this deletes only the given side. Confirm with the user before calling.',
    input: z.object({ id: movementId }).strict(),
    kind: 'destructive',
    auditIds: (input) => ({ movementId: input.id }),
    handler: async ({ id }, { userId, di }) => {
      await di.resolve(DeleteMovementUseCase).execute(id, userId);
      return { deleted: true, id };
    },
  });

  defineTool(server, ctx, {
    name: 'finance_apply_pending_movement',
    title: 'Apply pending movement',
    description: 'Turn a pending (planned) movement into a real one so it affects balances.',
    input: z.object({ id: movementId }).strict(),
    kind: 'write',
    auditIds: (input) => ({ movementId: input.id }),
    handler: ({ id }, { userId, di }) => di.resolve(ApplyPendingMovementUseCase).execute(id, userId),
  });

  defineTool(server, ctx, {
    name: 'finance_mark_reminder_paid',
    title: 'Mark reminder paid',
    description:
      'Mark a reminder (from finance_list_reminders) as paid. Optionally link the movement that paid it ' +
      '(e.g. one just created with finance_create_movement).',
    input: markAsPaidSchema.extend({ reminderId: z.string().guid().describe('Reminder id.') }),
    kind: 'write',
    auditIds: (input) => ({ reminderId: input.reminderId, movementId: input.movementId }),
    handler: async ({ reminderId, movementId: linked }, { userId, di }) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { userId: _owner, ...reminder } = await di.resolve(MarkReminderAsPaidUseCase).execute(reminderId, userId, linked);
      return reminder;
    },
  });
}
