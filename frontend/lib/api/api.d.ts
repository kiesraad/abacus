export interface ApiResponse<DATA = object> {
  status: string;
  code: number;
  message?: string;
  data?: DATA;
}

export interface ApiResponseSuccess<DATA = object> extends ApiResponse<DATA> {
  status: "20x";
}

export interface ApiResponseClientError<DATA = object> extends ApiResponse<DATA> {
  status: "40x";
}

export interface ApiResponseServerError<DATA = object> extends ApiResponse<DATA> {
  status: "50x";
}
