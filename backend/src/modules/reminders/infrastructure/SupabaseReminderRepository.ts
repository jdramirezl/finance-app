import { injectable } from 'tsyringe';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Reminder } from '../domain/Reminder';
import { CreateReminderDTO, UpdateReminderDTO } from '../application/dtos/ReminderDTO';
import { CreateExceptionDTO, ReminderException } from '../domain/ReminderException';
import { IReminderRepository } from '../interfaces/IReminderRepository';
import { DatabaseError } from '../../../shared/errors/AppError';

@injectable()
export class SupabaseReminderRepository implements IReminderRepository {
    private supabase: SupabaseClient | null;

    constructor() {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

        if ((!supabaseUrl || !supabaseKey) && process.env.NODE_ENV !== 'test') {
            throw new Error('Supabase configuration missing: SUPABASE_URL and SUPABASE_SERVICE_KEY required');
        }

        this.supabase = supabaseUrl && supabaseKey
            ? createClient(supabaseUrl, supabaseKey)
            : null;
    }

    private ensureClient(): SupabaseClient {
        if (!this.supabase) {
            throw new DatabaseError('Supabase client not configured');
        }
        return this.supabase;
    }

    async findAll(userId: string): Promise<Reminder[]> {
        const { data, error } = await this.ensureClient()
            .from('reminders')
            .select('*, reminder_exceptions(*)')
            .eq('user_id', userId)
            .order('due_date', { ascending: true });

        if (error) throw new Error(error.message);

        return data.map((item) => this.mapToDomain(item));
    }

    async findById(id: string): Promise<Reminder | null> {
        const { data, error } = await this.ensureClient()
            .from('reminders')
            .select('*, reminder_exceptions(*)')
            .eq('id', id)
            .single();

        if (error) return null;
        return this.mapToDomain(data);
    }

    async create(userId: string, data: CreateReminderDTO): Promise<Reminder> {
        const { data: created, error } = await this.ensureClient()
            .from('reminders')
            .insert({
                user_id: userId,
                title: data.title,
                amount: data.amount,
                due_date: data.dueDate,
                recurrence_type: data.recurrence.type,
                recurrence_interval: data.recurrence.interval,
                recurrence_days_of_week: data.recurrence.daysOfWeek || null,
                recurrence_end_type: data.recurrence.endType,
                recurrence_end_count: data.recurrence.endCount || null,
                recurrence_end_date: data.recurrence.endDate || null,
                fixed_expense_id: data.fixedExpenseId,
                template_id: data.templateId,
            })
            .select()
            .single();

        if (error) throw new Error(error.message);
        return this.mapToDomain(created);
    }

    async update(id: string, data: UpdateReminderDTO): Promise<Reminder> {
        const updateData: any = {};
        if (data.title !== undefined) updateData.title = data.title;
        if (data.amount !== undefined) updateData.amount = data.amount;
        if (data.dueDate !== undefined) updateData.due_date = data.dueDate;
        if (data.isPaid !== undefined) updateData.is_paid = data.isPaid;
        if (data.recurrence !== undefined) {
            updateData.recurrence_type = data.recurrence.type;
            updateData.recurrence_interval = data.recurrence.interval;
            updateData.recurrence_days_of_week = data.recurrence.daysOfWeek || null;
            updateData.recurrence_end_type = data.recurrence.endType;
            updateData.recurrence_end_count = data.recurrence.endCount || null;
            updateData.recurrence_end_date = data.recurrence.endDate || null;
        }
        if (data.linkedMovementId !== undefined) updateData.linked_movement_id = data.linkedMovementId;
        if (data.fixedExpenseId !== undefined) updateData.fixed_expense_id = data.fixedExpenseId;
        if (data.templateId !== undefined) updateData.template_id = data.templateId;
        updateData.updated_at = new Date().toISOString();

        const { data: updated, error } = await this.ensureClient()
            .from('reminders')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return this.mapToDomain(updated);
    }

    async delete(id: string): Promise<void> {
        const { error } = await this.ensureClient()
            .from('reminders')
            .delete()
            .eq('id', id);

        if (error) throw new Error(error.message);
    }

    async createException(data: CreateExceptionDTO): Promise<ReminderException> {
        const { data: created, error } = await this.ensureClient()
            .from('reminder_exceptions')
            .insert({
                reminder_id: data.reminderId,
                original_date: data.originalDate,
                action: data.action,
                new_title: data.newTitle,
                new_amount: data.newAmount,
                new_date: data.newDate,
                is_paid: data.isPaid,
                linked_movement_id: data.linkedMovementId,
            })
            .select()
            .single();

        if (error) throw new Error(error.message);
        return this.mapExceptionToDomain(created);
    }

    async findByLinkedMovementId(movementId: string): Promise<Reminder | null> {
        const { data, error } = await this.ensureClient()
            .from('reminders')
            .select('*')
            .eq('linked_movement_id', movementId)
            .single();

        if (error) return null;
        return this.mapToDomain(data);
    }

    private mapToDomain(data: any): Reminder {
        return {
            id: data.id,
            userId: data.user_id,
            title: data.title,
            amount: data.amount,
            dueDate: data.due_date,
            isPaid: data.is_paid,
            recurrence: {
                type: data.recurrence_type || 'once',
                interval: data.recurrence_interval || 1,
                daysOfWeek: data.recurrence_days_of_week || undefined,
                endType: data.recurrence_end_type || 'never',
                endCount: data.recurrence_end_count || undefined,
                endDate: data.recurrence_end_date || undefined,
            },
            linkedMovementId: data.linked_movement_id,
            fixedExpenseId: data.fixed_expense_id,
            templateId: data.template_id,
            exceptions: data.reminder_exceptions
                ? data.reminder_exceptions.map(this.mapExceptionToDomain)
                : [],
            createdAt: data.created_at,
            updatedAt: data.updated_at,
        };
    }

    private mapExceptionToDomain(data: any): ReminderException {
        return {
            id: data.id,
            reminderId: data.reminder_id,
            originalDate: data.original_date,
            action: data.action,
            newTitle: data.new_title,
            newAmount: data.new_amount,
            newDate: data.new_date,
            isPaid: data.is_paid,
            linkedMovementId: data.linked_movement_id,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
        };
    }
}
