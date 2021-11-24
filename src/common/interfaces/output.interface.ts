export interface IOutput {
  ok: boolean;
  httpStatus?: number;
  error?: string;
}

export interface IOutputWithData<DataType> extends IOutput {
  data?: DataType;
}
