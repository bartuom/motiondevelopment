// P4.2.1: the temporary Architecture Reset harness is retired as the canonical UI.
// Preserve existing bookmarks while sending users to the established Runtime Lab shell.
const target = './heavy-impact-lab.html';
if (!location.pathname.endsWith('/heavy-impact-lab.html')) {
  location.replace(target + location.search + location.hash);
}
