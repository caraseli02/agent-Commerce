export interface FormSelectOption {
    label: string;
    value: string;
    icon?: unknown;
}

export interface InputObject {
    value: string | FormSelectOption;
    error: string;
    type?: 'email';
}

export interface StringInputObject {
    value: string;
    error: string;
    type?: 'email';
}

export interface SelectInputObject {
    value: FormSelectOption | undefined;
    error: string;
}

export function isFormSelectOption(value: unknown): value is FormSelectOption {
    return typeof value === 'object' && value !== null && 'label' in value && 'value' in value;
}

export function resolveFormValue(value: string | FormSelectOption | undefined): string {
    if (value === undefined) {
        return '';
    }

    return isFormSelectOption(value) ? value.value : value;
}

export function getInputStringValue(input: { value: string | FormSelectOption | undefined } | undefined): string {
    if (!input) {
        return '';
    }

    return resolveFormValue(input.value);
}

export function getCountryTypeValue(country: { value: SelectInputObject }): string {
    return resolveFormValue(country.value.value);
}

export function toInputObject(field: StringInputObject | SelectInputObject): InputObject {
    const base: InputObject = {
        value: field.value ?? '',
        error: field.error,
    };

    if ('type' in field && field.type) {
        base.type = field.type;
    }

    return base;
}
