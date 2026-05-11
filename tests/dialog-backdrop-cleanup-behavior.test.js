import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanupStaleDialogArtifacts } from '../src/lib/dialogCleanup.js';

class FakeElement {
  constructor({ className = '', role = null, dataState = null } = {}) {
    this.className = className;
    this.parentNode = null;
    this.children = [];
    this.attributes = new Map();
    this.style = {};

    if (role) {
      this.setAttribute('role', role);
    }

    if (dataState) {
      this.setAttribute('data-state', dataState);
    }
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    if (name === 'style') {
      return this.style.pointerEvents ? `pointer-events: ${this.style.pointerEvents};` : (this.attributes.get(name) ?? '');
    }

    return this.attributes.get(name) ?? null;
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  remove() {
    if (!this.parentNode) {
      return;
    }

    this.parentNode.children = this.parentNode.children.filter((child) => child !== this);
    this.parentNode = null;
  }

  querySelectorAll(selector) {
    const selectors = selector.split(',').map((item) => item.trim());
    return this.children.filter((child) => selectors.some((item) => matchesSelector(child, item)));
  }
}

function matchesSelector(node, selector) {
  const roleMatch = selector.match(/\[role="([^"]+)"\]/);
  const stateMatch = selector.match(/\[data-state="([^"]+)"\]/);

  if (roleMatch && node.getAttribute('role') !== roleMatch[1]) {
    return false;
  }

  if (stateMatch && node.getAttribute('data-state') !== stateMatch[1]) {
    return false;
  }

  return true;
}

function createDoc({ pointerEvents = '', scrollLocked = false, children = [] } = {}) {
  const body = new FakeElement();
  body.style.pointerEvents = pointerEvents;

  if (scrollLocked) {
    body.setAttribute('data-scroll-locked', '1');
  }

  children.forEach((child) => body.appendChild(child));
  return { body };
}

function createOverlay(dataState = 'open') {
  return new FakeElement({ className: 'fixed inset-0 z-50 bg-black/80', dataState });
}

test('cleanupStaleDialogArtifacts removes stale body locks and orphaned overlay nodes', () => {
  const previousHTMLElement = globalThis.HTMLElement;
  globalThis.HTMLElement = FakeElement;

  try {
    const overlay = createOverlay('open');
    const doc = createDoc({ pointerEvents: 'none', scrollLocked: true, children: [overlay] });

    cleanupStaleDialogArtifacts(doc);

    assert.equal(doc.body.style.pointerEvents, '');
    assert.equal(doc.body.hasAttribute('data-scroll-locked'), false);
    assert.equal(doc.body.children.includes(overlay), false);
  } finally {
    globalThis.HTMLElement = previousHTMLElement;
  }
});

test('cleanupStaleDialogArtifacts leaves active open dialogs and overlays alone', () => {
  const previousHTMLElement = globalThis.HTMLElement;
  globalThis.HTMLElement = FakeElement;

  try {
    const overlay = createOverlay('open');
    const dialog = new FakeElement({ role: 'dialog', dataState: 'open' });
    const doc = createDoc({ pointerEvents: 'none', scrollLocked: true, children: [overlay, dialog] });

    cleanupStaleDialogArtifacts(doc);

    assert.equal(doc.body.style.pointerEvents, 'none');
    assert.equal(doc.body.hasAttribute('data-scroll-locked'), true);
    assert.equal(doc.body.children.includes(overlay), true);
    assert.equal(doc.body.children.includes(dialog), true);
  } finally {
    globalThis.HTMLElement = previousHTMLElement;
  }
});

test('cleanupStaleDialogArtifacts removes orphaned overlays even when only the overlay is stale', () => {
  const previousHTMLElement = globalThis.HTMLElement;
  globalThis.HTMLElement = FakeElement;

  try {
    const overlay = createOverlay('closed');
    const closedDialog = new FakeElement({ role: 'dialog', dataState: 'closed' });
    const doc = createDoc({ children: [overlay, closedDialog] });

    cleanupStaleDialogArtifacts(doc);

    assert.equal(doc.body.children.includes(overlay), false);
    assert.equal(doc.body.children.includes(closedDialog), true);
  } finally {
    globalThis.HTMLElement = previousHTMLElement;
  }
});
