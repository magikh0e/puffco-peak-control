// The release version, shared by the app and the help page. Bump it together
// with a CHANGELOG.md entry (see the README, "Releasing a version").
export const VERSION = '1.1.0';

// Fill in version badges and links ([data-app-version]) and add the version to
// "report a problem" links ([data-report-link]), which GitHub's bug form reads
// into its App version field.
export function showVersion(root = document) {
  for (const a of root.querySelectorAll('[data-app-version]')) a.textContent = `v${VERSION}`;
  for (const a of root.querySelectorAll('[data-report-link]')) {
    const url = new URL(a.href);
    url.searchParams.set('app-version', `v${VERSION}`);
    a.href = url;
  }
}
