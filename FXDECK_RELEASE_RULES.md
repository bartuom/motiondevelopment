# FXDeck Release Rules

These rules are mandatory for every material FXDeck implementation iteration.

1. Do not call an iteration complete after editing local/repository code only.
2. Every material change must be committed directly to `main` unless the user explicitly requests another flow.
3. A push to `main` must trigger the GitHub Pages workflow in `.github/workflows/pages.yml`, which deploys `./site`.
4. **Every user-testable browser iteration must advance the visible build/version label.** A new commit or new behavior under the same visible `P#.x.x` label is not a new handoff build.
5. Before asking the user to test a build, verify that the repository contains the intended visible build/version and that the Pages deployment for that push has completed successfully whenever deployment status is accessible.
6. Changed browser modules must receive fresh cache keys/version query strings. A new visible build label with stale imported modules is not an acceptable release.
7. If live Pages cannot be verified from the available tooling, say that explicitly instead of claiming the deployment is live; still push the commit so the Pages workflow is triggered.
8. UI navigation/version labels must be updated with milestone transitions so the live site matches the current roadmap.

Operational definition of DONE for a testable browser iteration:

`code change -> visible version bump -> commit/push main -> Pages workflow -> live/cache verification -> user test`
