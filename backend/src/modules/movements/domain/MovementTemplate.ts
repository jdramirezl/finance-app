export interface MovementTemplate {
  id: string;
  userId: string;
  name: string;
  type: string;
  accountId: string | null;
  pocketId: string | null;
  subPocketId: string | null;
  defaultAmount: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateDTO {
  name: string;
  type: string;
  accountId: string;
  pocketId: string;
  subPocketId?: string | null;
  defaultAmount?: number | null;
  notes?: string | null;
}

export interface UpdateTemplateDTO {
  name?: string;
  type?: string;
  accountId?: string;
  pocketId?: string;
  subPocketId?: string | null;
  defaultAmount?: number | null;
  notes?: string | null;
}
