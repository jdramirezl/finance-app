/**
 * FixedExpenseGroup DTOs
 * 
 * Data Transfer Objects for FixedExpenseGroup API requests and responses
 */

export interface CreateGroupDTO {
  name: string;
  color: string;
}

export interface UpdateGroupDTO {
  name?: string;
  color?: string;
}

export interface GroupResponseDTO {
  id: string;
  name: string;
  color: string;
  displayOrder: number;
}
