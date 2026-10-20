import fs from 'node:fs';
import path from 'node:path';
import Ajv from 'ajv';
import { describe, expect, it } from 'vitest';
import { getDefinitionRevision, parseRouterProfileFile } from './routerProfiles';
import { parseRouterToolFile } from './routerTools';
import { parseRouterCatalogFile } from './routerCatalogs';

interface InvalidExpectation {
  schemaValid: boolean;
  runtimeValid: boolean;
}

interface RevisionVector {
  name: string;
  definition: Record<string, unknown>;
  canonicalJson: string;
  revision: string;
}

const contractRoot = path.resolve(process.cwd(), '../../docs/schemas/router-interchange');
const validRoot = path.join(contractRoot, 'examples/valid');
const invalidRoot = path.join(contractRoot, 'examples/invalid');
const readJson = (file: string): unknown => JSON.parse(fs.readFileSync(file, 'utf8'));
const profileSchema = readJson(path.join(contractRoot, 'router-profile.schema.json'));
const toolSchema = readJson(path.join(contractRoot, 'router-tool.schema.json'));
const catalogSchema = readJson(path.join(contractRoot, 'router-catalog.schema.json'));
const ajv = new Ajv({ allErrors: true, jsonPointers: true });
const validateProfileSchema = ajv.compile(profileSchema as object);
const validateToolSchema = ajv.compile(toolSchema as object);
const validateCatalogSchema = ajv.compile(catalogSchema as object);

function isProfileFile(value: unknown): boolean {
  return !!value && typeof value === 'object' && (value as { format?: unknown }).format === 'carvd-router-profile';
}

function schemaAccepts(value: unknown): boolean {
  const format = value && typeof value === 'object' ? (value as { format?: unknown }).format : undefined;
  return Boolean(
    format === 'carvd-router-profile'
      ? validateProfileSchema(value)
      : format === 'carvd-router-catalog'
        ? validateCatalogSchema(value)
        : validateToolSchema(value)
  );
}

function runtimeAccepts(text: string, value: unknown): boolean {
  try {
    const format = value && typeof value === 'object' ? (value as { format?: unknown }).format : undefined;
    if (isProfileFile(value)) parseRouterProfileFile(text);
    else if (format === 'carvd-router-catalog') parseRouterCatalogFile(text);
    else parseRouterToolFile(text);
    return true;
  } catch {
    return false;
  }
}

describe('public router interchange conformance', () => {
  for (const name of fs.readdirSync(validRoot).filter((file) => file.endsWith('.json'))) {
    it(`accepts valid example ${name} in schema and runtime`, () => {
      const text = fs.readFileSync(path.join(validRoot, name), 'utf8');
      const value: unknown = JSON.parse(text);
      expect(schemaAccepts(value)).toBe(true);
      expect(runtimeAccepts(text, value)).toBe(true);
    });
  }

  const expectations = readJson(path.join(invalidRoot, 'expectations.json')) as Record<string, InvalidExpectation>;
  for (const [name, expected] of Object.entries(expectations)) {
    it(`rejects invalid example ${name} at its declared contract layer`, () => {
      const text = fs.readFileSync(path.join(invalidRoot, name), 'utf8');
      const value: unknown = JSON.parse(text);
      expect(schemaAccepts(value)).toBe(expected.schemaValid);
      expect(runtimeAccepts(text, value)).toBe(expected.runtimeValid);
    });
  }

  it('keeps published revision vectors deterministic', () => {
    const document = readJson(path.join(contractRoot, 'revision-vectors.json')) as { vectors: RevisionVector[] };
    for (const vector of document.vectors) {
      expect(getDefinitionRevision(vector.definition), vector.name).toBe(vector.revision);
      const withoutRevision = JSON.parse(vector.canonicalJson) as Record<string, unknown>;
      expect(getDefinitionRevision(withoutRevision), `${vector.name} canonical JSON`).toBe(vector.revision);
    }
  });
});
