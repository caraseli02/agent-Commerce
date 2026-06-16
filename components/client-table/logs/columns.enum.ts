export enum LogsTableColumnsEnum {
  TYPE = 'type',
  IP = 'ip',
  CREATED_AT = 'createdAt',
}

export interface LogsItem {
  type: string;
  ip: string;
  createdAt: string;
}
