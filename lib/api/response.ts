import { NextResponse } from 'next/server'

type ApiSuccess<T> = { data: T; meta?: Record<string, unknown> }
type ApiError = { error: string; details?: unknown }

export const ok = <T>(data: T, meta?: Record<string, unknown>) =>
  NextResponse.json<ApiSuccess<T>>({ data, ...(meta && { meta }) }, { status: 200 })

export const created = <T>(data: T) =>
  NextResponse.json<ApiSuccess<T>>({ data }, { status: 201 })

export const noContent = () => new NextResponse(null, { status: 204 })

export const badRequest = (details?: unknown) =>
  NextResponse.json<ApiError>({ error: 'Bad Request', details }, { status: 400 })

export const unauthorized = () =>
  NextResponse.json<ApiError>({ error: 'Unauthorized' }, { status: 401 })

export const forbidden = () =>
  NextResponse.json<ApiError>({ error: 'Forbidden' }, { status: 403 })

export const notFound = (resource = 'Resource') =>
  NextResponse.json<ApiError>({ error: `${resource} not found` }, { status: 404 })

export const conflict = (message: string) =>
  NextResponse.json<ApiError>({ error: message }, { status: 409 })

export const serverError = () =>
  NextResponse.json<ApiError>({ error: 'Internal Server Error' }, { status: 500 })
