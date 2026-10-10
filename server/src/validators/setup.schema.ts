// Identical shape to a normal registration — the first admin is created the
// same way any account is, just forced to role ADMIN server-side afterward.
export { registerSchema as initializeSetupSchema, type RegisterInput as InitializeSetupInput } from './auth.schema.js';
