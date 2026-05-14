export interface ApiErrorResponse {
	error: string;
}

export interface ValidationResult<T> {
	ok: true;
	value: T;
}

export interface ValidationFailure {
	ok: false;
	error: string;
}
