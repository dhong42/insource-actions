#!/bin/bash
set -e

OUTPUT=$(eval "$INPUT_CMD")

# Multiline string handling, per Github Community recommendation:
# https://github.community/t/set-output-truncates-multiline-strings/16852/3
if ($INPUT_MULTILINE); then
  OUTPUT="${OUTPUT//'%'/'%25'}"
  OUTPUT="${OUTPUT//$'\n'/'%0A'}"
  OUTPUT="${OUTPUT//$'\r'/'%0D'}"
fi

echo "value=$OUTPUT" >> $GITHUB_OUTPUT
