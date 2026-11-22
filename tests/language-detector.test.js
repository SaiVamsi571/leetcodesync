import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  detectLanguage,
  isLanguageSupported,
  getSupportedLanguages
} from '../lib/language-detector.js';

describe('Language Detector (TRD Section 2)', () => {
  it('detects all 6 required languages with correct extensions', () => {
    // 1. JavaScript
    const js = detectLanguage('javascript');
    assert.equal(js.name, 'JavaScript');
    assert.equal(js.extension, 'js');

    // 2. Python
    const py = detectLanguage('python3');
    assert.equal(py.name, 'Python');
    assert.equal(py.extension, 'py');

    // 3. TypeScript
    const ts = detectLanguage('typescript');
    assert.equal(ts.name, 'TypeScript');
    assert.equal(ts.extension, 'ts');

    // 4. Java
    const java = detectLanguage('java');
    assert.equal(java.name, 'Java');
    assert.equal(java.extension, 'java');

    // 5. Go
    const go = detectLanguage('golang');
    assert.equal(go.name, 'Go');
    assert.equal(go.extension, 'go');

    // 6. Rust
    const rust = detectLanguage('rust');
    assert.equal(rust.name, 'Rust');
    assert.equal(rust.extension, 'rs');
  });

  it('handles aliases and case-insensitivity', () => {
    assert.equal(detectLanguage('JS').extension, 'js');
    assert.equal(detectLanguage('PY').extension, 'py');
    assert.equal(detectLanguage('Go').extension, 'go');
    assert.equal(detectLanguage('RS').extension, 'rs');
  });

  it('correctly reports supported and unsupported languages', () => {
    assert.equal(isLanguageSupported('python'), true);
    assert.equal(isLanguageSupported('rust'), true);
    assert.equal(isLanguageSupported('csharp'), false);
    assert.equal(isLanguageSupported('ruby'), false);
    assert.equal(isLanguageSupported(null), false);
  });

  it('returns distinct supported languages list', () => {
    const list = getSupportedLanguages();
    assert.equal(list.length, 6);
    const extensions = list.map(l => l.extension);
    assert.deepEqual(extensions.sort(), ['go', 'java', 'js', 'py', 'rs', 'ts'].sort());
  });
});
