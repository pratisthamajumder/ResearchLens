import { NextResponse } from 'next/server';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Turn any thrown error (our own or a MySQL one) into a clean JSON response. */
export function errorResponse(err) {
  if (err instanceof HttpError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }

  // Map MySQL errors raised by constraints and triggers to friendly messages.
  switch (err?.errno) {
    case 1062: // UNIQUE / PRIMARY KEY
      return NextResponse.json(
        { error: duplicateMessage(err.sqlMessage) },
        { status: 409 }
      );
    case 1644: // SIGNAL SQLSTATE '45000' from our triggers
      return NextResponse.json({ error: err.sqlMessage }, { status: 400 });
    case 3819: // CHECK constraint
      return NextResponse.json(
        { error: `Rejected by database rule: ${err.sqlMessage}` },
        { status: 400 }
      );
    case 1452: // FOREIGN KEY (child row)
      return NextResponse.json(
        { error: 'A referenced record (topic / author / user) does not exist.' },
        { status: 400 }
      );
    case 1048: // NOT NULL
      return NextResponse.json({ error: err.sqlMessage }, { status: 400 });
    default:
      break;
  }

  if (err?.code === 'ECONNREFUSED' || err?.code === 'ER_ACCESS_DENIED_ERROR' || err?.code === 'ER_BAD_DB_ERROR') {
    console.error('[db]', err.message);
    return NextResponse.json(
      { error: 'Cannot reach the MySQL database. Check DB_* settings in .env.local.' },
      { status: 503 }
    );
  }

  console.error(err);
  return NextResponse.json({ error: 'Something went wrong on the server.' }, { status: 500 });
}

function duplicateMessage(sqlMessage = '') {
  if (sqlMessage.includes('doi')) return 'A paper with this DOI already exists.';
  if (sqlMessage.includes('email')) return 'An account with this email already exists.';
  return 'This record already exists.';
}

/** Wrap a route handler so every error becomes a JSON response. */
export function handler(fn) {
  return async (request, context) => {
    try {
      return await fn(request, context);
    } catch (err) {
      return errorResponse(err);
    }
  };
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, 'Request body must be valid JSON.');
  }
}

export function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'Invalid id.');
  return id;
}
