#!/bin/sh
# Owner stages this immutable wrapper only after human merge and operational proof.
# Replace RELEASE with the reviewed pinned release. Never point at a personal checkout.
set -eu
exec /Library/AgentCommerceCI/runtime/bin/node /Library/AgentCommerceCI/releases/RELEASE/scripts/local-ci/service.mjs evidence /Library/AgentCommerceCI/reader.json "$1"
