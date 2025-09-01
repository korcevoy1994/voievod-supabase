/**
 * Утилиты для стандартизированных ответов API
 */

import { NextResponse } from 'next/server'
import { logger } from './logger'

export interface ApiError {
  message: string
  code?: string
  details?: any
}

export interface ApiSuccess<T = any> {
  data: T
  message?: string
}

/**
 * Создает стандартизированный ответ об ошибке
 */
export function createErrorResponse(
  error: string | Error | ApiError,
  status: number = 500,
  logContext?: string
): NextResponse {
  let errorMessage: string
  let errorCode: string | undefined
  let errorDetails: any

  if (typeof error === 'string') {
    errorMessage = error
  } else if (error instanceof Error) {
    errorMessage = error.message
    errorDetails = error.stack
  } else {
    errorMessage = error.message
    errorCode = error.code
    errorDetails = error.details
  }

  // Логируем ошибку
  if (logContext) {
    logger.error(`${logContext}: ${errorMessage}`, errorDetails || error)
  }

  return NextResponse.json(
    {
      error: errorMessage,
      code: errorCode,
      ...(process.env.NODE_ENV === 'development' && errorDetails && { details: errorDetails })
    },
    { status }
  )
}

/**
 * Создает стандартизированный успешный ответ
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse {
  return NextResponse.json(
    {
      data,
      ...(message && { message })
    },
    { status }
  )
}

/**
 * Обертка для обработки ошибок в API маршрутах
 */
export function withErrorHandling<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>,
  context?: string
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args)
    } catch (error) {
      return createErrorResponse(
        error instanceof Error ? error : new Error('Unknown error'),
        500,
        context
      )
    }
  }
}

/**
 * Валидирует обязательные поля в запросе
 */
export function validateRequiredFields(
  data: Record<string, any>,
  requiredFields: string[]
): { isValid: boolean; missingFields: string[] } {
  const missingFields = requiredFields.filter(field => 
    data[field] === undefined || data[field] === null || data[field] === ''
  )
  
  return {
    isValid: missingFields.length === 0,
    missingFields
  }
}

/**
 * Стандартные коды ошибок
 */
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  CONFLICT: 'CONFLICT'
} as const