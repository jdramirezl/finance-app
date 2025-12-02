/**
 * SubPocket DTOs
 * 
 * Data Transfer Objects for SubPocket API requests and responses
 */

export interface CreateSubPocketDTO {
  pocketId: string;
  name: string;
  valueTotal: number;
  periodicityMonths: number;
  groupId?: string;
}

export interface UpdateSubPocketDTO {
  name?: string;
  valueTotal?: number;
  periodicityMonths?: number;
}

export interface SubPocketResponseDTO {
  id: string;
  pocketId: string;
  name: string;
  valueTotal: number;
  periodicityMonths: number;
  balance: number;
  enabled: boolean;
  groupId?: string;
  displayOrder?: number;
  monthlyContribution: number;
}
