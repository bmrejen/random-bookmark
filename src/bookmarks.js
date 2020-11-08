import cp from 'chrome-promise';

const state = {
  loaded: false,
  bookmarks: [],
};

function traverse(tree, fn, parent = null) {
  for (const node of tree) {
    fn(node, parent);
    if (Array.isArray(node.children)) {
      traverse(node.children, fn, node);
    }
  }
}

export async function load() {
  const [tree, storage] = await Promise.all([
    cp.bookmarks.getTree(),
    cp.storage.local.get({
      bookmarks: [],
      visited: [],
    }),
  ]);

  const selected = new Set(storage.bookmarks);
  const visited = new Set(storage.visited);

  const items = [];
  traverse(tree, (node, parent) => {
    if (!node.url) {
      return;
    }

    if (!selected.has(node.id) && !selected.has(parent && parent.id)) {
      return;
    }

    // If parent selected, but current node not
    selected.add(node.id);

    items.push({
      id: node.id,
      title: node.title,
      url: node.url,
      visited: visited.has(node.id),
    });
  });

  state.bookmarks = items;
  state.loaded = true;

  return state.bookmarks;
}

export function pick() {
  if (!state.loaded) {
    load();
  }

  if (state.bookmarks.every((i) => i.visited)) {
    // All bookmarks visited at least once, reset visit history
    for (const bookmark of state.bookmarks) {
      bookmark.visited = false;
    }
  }

  const unvisited = state.bookmarks.filter((i) => !i.visited);
  const index = Math.floor(Math.random() * unvisited.length);
  const picked = unvisited[index];

  if (picked != null) {
    picked.visited = true;
  }

  cp.storage.local
    .set({
      visited: state.bookmarks.filter((i) => i.visited).map((i) => i.id),
    })
    .catch(console.error);

  return picked;
}
