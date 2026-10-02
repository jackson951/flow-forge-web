// Regenerates src/types/openapi.ts from the backend's OpenAPI document (Part 01, FR-01.5).
// Needs the flowforge-api backend running; override the URL with API_DOCS_URL.
import { execSync } from 'node:child_process';

const url = process.env.API_DOCS_URL ?? 'http://localhost:3000/api/docs-json';
const out = 'src/types/openapi.ts';
execSync(`npx openapi-typescript ${url} -o ${out}`, { stdio: 'inherit' });
execSync(`npx prettier --write ${out}`, { stdio: 'inherit' });
