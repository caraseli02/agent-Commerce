# Retired CI migration — 2026-10-19

Vlad replaced the standalone local CI project and GitHub Actions workflows with
[Husky and independent local verification](../../agents/local-verification.md).
This directory is historical material, not operating instructions.

`retired-source.tar.gz` preserves the tracked implementation, workflows, tests,
runbooks and agent instructions at PR #737 head
`681d28a8034387d71c3d48205dd416ffd4851040`, including its unmerged request limits.
`manifest.json` records the archive digest and SHA-256 of each archived file.
It contains tracked source only, with no private keys, databases or environment files.
Extract only to a separate inspection folder; extraction does not activate anything.

History: #720 / PR #728 explored an Actions runner; #731 / PR #732 delivered the
standalone runner; #734 / PR #735 delivered readiness; #736 / PR #737 added request
limits; #738 tracked deployment. #741 replaces the project. Prior merged work stays
in Git history; unmerged work stays in this archive and its closed PR/branch.

The linked deployment chat recorded 1,137 passing tests in a networkless worker,
then an unsuccessful installed canary. That is historical evidence, not current
acceptance. At retirement inspection both launchd services were absent, no matching
LaunchDaemon files were installed, and coordinator and reader configuration were
disabled. The protected `/Library/AgentCommerceCI` installation and private image,
credential and deployment evidence are retained locally; no account/key/volume is
deleted or copied into this public source archive. A private retirement record
identifies their locations. They are not dependencies of autonomous work.
