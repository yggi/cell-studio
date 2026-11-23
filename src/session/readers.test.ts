import { describe, expect, it } from 'vitest';
import { JOIN_PROTOCOL, leaveOver, readHostAs, versionOf } from './readers';

const muse = { offer: null, memory: [], asOf: null, lastPlayed: null, log: [], dropped: [], players: { host: 'Jambot' } };
const forecast = { from: 0, count: 0, changed: [] };
const welcome1 = (protocol: number) => ({ kind: 'welcome', protocol, session: 'jam', resume: 't', song: null, forecast, muse });
const welcome2 = (protocol: number) => ({ ...welcome1(protocol), fragments: [], band: { id: 'band', hash: 'e2:0b7a' } });

describe('the two readers, chosen by the welcome’s protocol (#525)', () => {
  it('joins at version 2’s protocol', () => {
    expect(JOIN_PROTOCOL).toBe(33);
  });

  it('gives a protocol under 30 to version 1’s reader, and from 30 to version 2’s', () => {
    expect([12, 13, 23, 29, 30, 31, 32].map(versionOf)).toEqual([1, 1, 1, 1, 2, 2, 2]);
  });

  it('reads a welcome by its own protocol’s reader, whatever was chosen before', () => {
    expect(readHostAs(welcome1(23), 2)).toEqual({ version: 1, reading: { message: welcome1(23) } });
    expect(readHostAs(welcome2(31), 1)).toEqual({ version: 2, reading: { message: welcome2(31) } });
    // (each reader holds its own version's welcome: version 1's at 31 lacks `fragments` and `band`)
    expect(readHostAs(welcome1(31), 1)).toEqual({ version: 2, reading: { dropped: 'refused' } });
    // (under 13: version 1's reader reads it, and leaves the host, as before)
    expect(readHostAs(welcome1(12), 2).version).toBe(1);
    expect(leaveOver(1, 12)).toMatch(/version 12/);
    expect([leaveOver(1, 23), leaveOver(2, 33)]).toEqual([null, null]);
  });

  it('reads anything else by the version chosen: version 1’s bar is ignored by version 2’s reader', () => {
    const bar = { kind: 'bar', sent: { bar: { bar: 0 }, start: 1 } };
    expect(readHostAs(bar, 1)).toEqual({ version: 1, reading: { message: bar } });
    expect(readHostAs(bar, 2)).toEqual({ version: 2, reading: { dropped: 'ignored' } });
    // (a welcome whose protocol isn't an integer: read by the version chosen, which refuses it)
    expect(readHostAs({ ...welcome1(23), protocol: '23' }, 2)).toEqual({ version: 2, reading: { dropped: 'refused' } });
  });
});
