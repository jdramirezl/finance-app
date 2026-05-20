/**
 * Reusable dropdown for selecting a movement type.
 *
 * Backed by the canonical `MOVEMENT_TYPES` list from
 * `utils/movementTypes`, this component centralises the four-way
 * Type select used by movement forms and adds optional support for
 * an "all" sentinel option used by filter UIs.
 *
 * Two usage modes are exposed via a discriminated union on
 * `includeAll` so that forms get a strict `MovementType` value and
 * filters get a wider `MovementType | 'all'` value without callers
 * needing to cast.
 *
 *   // Form usage (strict):
 *   <MovementTypeSelect
 *     value={selectedType}
 *     onChange={setSelectedType}
 *     label="Type"
 *   />
 *
 *   // Filter usage (with "all" sentinel):
 *   <MovementTypeSelect
 *     includeAll
 *     value={filters.type}
 *     onChange={setFilters.setType}
 *     label="Type"
 *   />
 */

import type { ChangeEvent } from 'react';
import Select from '../Select';
import { MOVEMENT_TYPES, type MovementType } from '../../utils/movementTypes';

/**
 * Sentinel string used by the filter variant to represent "no type
 * filter applied". Exposed so that consumers (state hooks, defaults)
 * can reference the same literal as the component.
 */
export const MOVEMENT_TYPE_FILTER_ALL = 'all' as const;

/** Value emitted by the filter variant of `MovementTypeSelect`. */
export type MovementTypeFilterValue =
  | MovementType
  | typeof MOVEMENT_TYPE_FILTER_ALL;

interface MovementTypeSelectBaseProps {
  /** Optional label rendered above the select. */
  label?: string;
  /** HTML id attribute for the underlying select element. */
  id?: string;
  /** HTML name attribute (used when the select is part of a form). */
  name?: string;
  /** Disables the select. */
  disabled?: boolean;
  /** Marks the select as required for native form validation. */
  required?: boolean;
  /** Optional className forwarded to the underlying select element. */
  className?: string;
}

interface MovementTypeSelectFormProps extends MovementTypeSelectBaseProps {
  /** Form variant — only the four canonical movement types are valid. */
  includeAll?: false;
  value: MovementType;
  onChange: (value: MovementType) => void;
}

interface MovementTypeSelectFilterProps extends MovementTypeSelectBaseProps {
  /** Filter variant — prepends an "all" sentinel option. */
  includeAll: true;
  /** Optional override for the "all" option label. Defaults to "All Types". */
  allLabel?: string;
  value: MovementTypeFilterValue;
  onChange: (value: MovementTypeFilterValue) => void;
}

export type MovementTypeSelectProps =
  | MovementTypeSelectFormProps
  | MovementTypeSelectFilterProps;

const MovementTypeSelect = (props: MovementTypeSelectProps) => {
  const { label, id, name, disabled, required, className } = props;

  const options = props.includeAll
    ? [
        {
          value: MOVEMENT_TYPE_FILTER_ALL,
          label: props.allLabel ?? 'All Types',
        },
        ...MOVEMENT_TYPES,
      ]
    : [...MOVEMENT_TYPES];

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const next = event.target.value;
    if (props.includeAll) {
      props.onChange(next as MovementTypeFilterValue);
    } else {
      props.onChange(next as MovementType);
    }
  };

  return (
    <Select
      label={label}
      id={id}
      name={name}
      disabled={disabled}
      required={required}
      className={className}
      value={props.value}
      onChange={handleChange}
      options={options}
    />
  );
};

export default MovementTypeSelect;
