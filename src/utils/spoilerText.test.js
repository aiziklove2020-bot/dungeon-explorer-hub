import { describe, it, expect } from 'vitest';
import { buildSpoilerBlockFromInner, wrapSelectionInPlainText } from './spoilerText.js';

describe('buildSpoilerBlockFromInner', () => {
  it('uses placeholder when empty', () => {
    expect(buildSpoilerBlockFromInner('', 'X')).toBe('[spoiler]X[/spoiler]');
  });
  it('wraps non-empty text', () => {
    expect(buildSpoilerBlockFromInner('a\n', 'X')).toBe('[spoiler]a[/spoiler]');
  });
});

describe('wrapSelectionInPlainText', () => {
  it('wraps selection', () => {
    const { next, caret } = wrapSelectionInPlainText('hello world', 6, 11, 'H');
    expect(next).toBe('hello [spoiler]world[/spoiler]');
    expect(caret).toBe(next.length);
  });
  it('inserts at caret when collapsed', () => {
    const { next } = wrapSelectionInPlainText('ab', 1, 1, 'X');
    expect(next).toBe('a[spoiler]X[/spoiler]b');
  });
});
