# Vendored skills — where they came from

These directories are third-party code and prose copied into this repository.
They load into an agent's context and, in one case, run as scripts, so their
origin is recorded here rather than left to memory.

| Skill | Source | Commit | Licence |
| --- | --- | --- | --- |
| `flutter-ui` | [Naimehossein77/claude-flutter-ui-skills](https://github.com/Naimehossein77/claude-flutter-ui-skills) | `da647c4` | MIT per its README; the repo ships **no LICENSE file**, so there is no copyright notice to carry |
| `ui-ux-pro-max` | [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | `4aad058` | MIT — `LICENSE` copied into the skill directory |

Each was reviewed before installation: install scripts read, Python scripts
checked for `subprocess` / `eval` / `exec` / network / writes, and all prose
scanned for prompt-injection and exfiltration patterns. `flutter-ui-ux` ships
no executable code at all.

Only the skill named in each request was taken. Both `skills-collection` (21
skills) and `ui-ux-pro-max-skill` (7 skills) contain many more that were
deliberately not installed.

## Considered and removed

`flutter-ui-ux` from [ajianaz/skills-collection](https://github.com/ajianaz/skills-collection)
(`f1d8f59`) was installed and then removed. It overlapped `flutter-ui` on UI,
animation and performance, and the comparison went against it on the thing that
matters here:

| Topic | `flutter-ui` | `flutter-ui-ux` |
| --- | --- | --- |
| Riverpod | 5 files | **0** |
| GoRouter | 5 files | **0** |
| PopScope | 3 files | **0** |
| Audit script | yes | no |

This app is Riverpod and GoRouter throughout, and the Android back button is
PopScope's territory. A Flutter skill silent on all three cannot review the
code that actually exists here. `flutter-ui` also ships the audit that found
three real eager-list bugs in `approvals_screen` and `qa_screen`.

`flutter-ui-ux` was the better *prose* — longer references, consistent
bad/good pairs, stronger on responsive layout. That was not enough. Reinstall
it only if the two are wanted side by side, knowing both match the same
triggers and will load together.

## Updating one

Re-clone the source at a newer commit, diff it against the copy here, and
update the commit column above. Nothing here is a submodule, so nothing
updates on its own.
