import cp from 'chrome-promise';

export const MODES = {
  ALL: 'all',
  DISABLED: 'disabled',
  ADDRESS_BAR: 'address-bar',
};

const internals = {
  blocked: [],
  mode: MODES.DISABLED,
};

export async function load() {
  const { blacklist, blacklistMode } = await cp.storage.local.get({
    blacklist: '',
    blacklistMode: MODES.DISABLED,
  });

  internals.mode = blacklistMode;

  if (blacklistMode !== MODES.DISABLED) {
    internals.blocked = String(blacklist)
      .split('\n')
      .map((i) => i.trim())
      .filter(Boolean)
      .map((i) => {
        try {
          return new RegExp(i);
        } catch (error) {
          return null;
        }
      })
      .filter(Boolean);
  } else {
    internals.blocked = [];
  }

  return internals.blocked;
}

export function isBlocked(url) {
  return internals.blocked.some((re) => re.test(url));
}

export function mode() {
  return internals.mode;
}
