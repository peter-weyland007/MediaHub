export function cleanupStaleDialogArtifacts(doc = document) {
  const body = doc?.body;
  if (!body) {
    return;
  }

  const activeDialogs = body.querySelectorAll('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]');
  if (activeDialogs.length > 0) {
    return;
  }

  const hadScrollLock = body.hasAttribute('data-scroll-locked');
  const hadPointerLock = body.style.pointerEvents === 'none';
  const hadBodyLock = hadScrollLock || hadPointerLock;

  if (hadPointerLock) {
    body.style.pointerEvents = '';
  }

  if (hadScrollLock) {
    body.removeAttribute('data-scroll-locked');
  }

  if (hadBodyLock && (body.getAttribute('style') || '').trim() === '') {
    body.removeAttribute('style');
  }

  [...body.children].forEach((node) => {
    if (!(node instanceof HTMLElement)) {
      return;
    }

    if (node.getAttribute('role') === 'dialog' || node.getAttribute('role') === 'alertdialog') {
      return;
    }

    const overlayClass = typeof node.className === 'string' && node.className.includes('fixed inset-0 z-50 bg-black/80');
    const overlayState = node.getAttribute('data-state');
    const isRadixOverlay = overlayClass && (overlayState === 'open' || overlayState === 'closed');

    if (isRadixOverlay) {
      node.remove();
    }
  });
}
