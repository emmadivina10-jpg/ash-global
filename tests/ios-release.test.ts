import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { load } from 'js-yaml';

type Workflow = {
  environment: { groups?: string[]; ios_signing: { bundle_identifier: string; distribution_type: string } };
  integrations: { app_store_connect: string };
  scripts: { name: string; script: string }[];
  artifacts: string[];
  publishing?: unknown;
};
const config = load(readFileSync(new URL('../codemagic.yaml', import.meta.url), 'utf8')) as {
  workflows: { 'ios-app-store': Workflow };
};
const ios = config.workflows['ios-app-store'];

describe('iOS artifact-only release safety', () => {
  it('does not require the unavailable tchokopay_production group', () => {
    expect(ios.environment.groups ?? []).not.toContain('tchokopay_production');
  });
  it('does not configure automatic TestFlight publishing or an upload export destination', () => {
    expect(ios.publishing).toBeUndefined();
    const exporter = ios.scripts.find(step => step.name === 'Build IPA');
    expect(exporter?.script).toMatch(/<key>destination<\/key>\s*<string>export<\/string>/);
  });
  it('preserves the iOS bundle identifier and Apple signing references', () => {
    expect(ios.environment.ios_signing.bundle_identifier).toBe('com.ashglogroup.mobile');
    expect(ios.environment.ios_signing.distribution_type).toBe('app_store');
    expect(ios.integrations.app_store_connect).toBe('ash glo');
    const exporter = ios.scripts.find(step => step.name === 'Build IPA');
    expect(exporter?.script).toContain('<string>ASH Glo App Store 2026 Production</string>');
  });
  it('keeps IPA export and verification before collecting the IPA artifact', () => {
    expect(ios.scripts.some(step => step.script.includes('xcodebuild \\\n  -exportArchive'))).toBe(true);
    expect(ios.scripts.some(step => step.name === 'Verify generated IPA')).toBe(true);
    expect(ios.scripts.some(step => step.name === 'Verify final iOS build number')).toBe(true);
    expect(ios.artifacts).toContain('build/ios/ipa/*.ipa');
  });
});