import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../../public/assets/site-data.js', import.meta.url), 'utf8');
const start = src.indexOf('function lpExpandProducerFavorites_');
const body = src.slice(start, src.indexOf('\n}\n', start) + 3);
const expand = new Function(`${body}; return lpExpandProducerFavorites_;`)();

const party = (id, producerId = '') => ({ id, producerId });

describe('favourites include the producer\'s other parties', () => {
  const all = [party('a1', 'P1'), party('a2', 'P1'), party('a3', 'P1'), party('b1', 'P2'), party('b2', 'P2'), party('own1')];

  it('favouriting one producer party lists all of that producer\'s parties, once each', () => {
    expect(expand(all, ['a2']).map((e) => e.id).sort()).toEqual(['a1', 'a2', 'a3']);
  });

  it('two favourites from the same producer do not duplicate', () => {
    expect(expand(all, ['a1', 'a3']).map((e) => e.id).sort()).toEqual(['a1', 'a2', 'a3']);
  });

  it('favourites from two producers list both producers\' parties', () => {
    expect(expand(all, ['a1', 'b2']).map((e) => e.id).sort()).toEqual(['a1', 'a2', 'a3', 'b1', 'b2']);
  });

  it('a party with no producer adds nothing extra', () => {
    expect(expand(all, ['own1']).map((e) => e.id)).toEqual(['own1']);
  });

  it('removing the favourite removes the extras', () => {
    expect(expand(all, [])).toEqual([]);
  });
});
