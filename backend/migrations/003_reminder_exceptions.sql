CREATE TABLE IF NOT EXISTS reminder_exceptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    reminder_id UUID NOT NULL REFERENCES reminders(id) ON DELETE CASCADE,
    original_date DATE NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('deleted', 'modified')),
    new_title TEXT,
    new_amount DECIMAL(10, 2),
    new_date DATE,
    is_paid BOOLEAN,
    linked_movement_id UUID REFERENCES movements(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(reminder_id, original_date)
);

CREATE INDEX IF NOT EXISTS idx_reminder_exceptions_reminder_id ON reminder_exceptions(reminder_id);
