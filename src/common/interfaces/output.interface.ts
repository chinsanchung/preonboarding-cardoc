export interface IOutput<DataType> {
  ok: boolean;
  data?: DataType;
  httpStatus?: number;
  error?: string;
}
