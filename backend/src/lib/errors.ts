export class ApiError extends Error {
  constructor(public statusCode: number, message: string, public code = 'api_error') {
    super(message);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized') {
    super(401, message, 'unauthorized');
  }
}

export class NotFoundError extends ApiError {
  constructor(message = 'Not found') {
    super(404, message, 'not_found');
  }
}
