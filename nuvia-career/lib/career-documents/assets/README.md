# HWPX formatting template

`skeleton.hwpx` is the minimal Skeleton document from
https://github.com/airmang/python-hwpx/tree/main/src/hwpx/data
(Apache-2.0, copyright 2025–2026 airmang). See `LICENSE-python-hwpx.txt`.

The exporter reads only the template's formatting header and page/column
properties. It builds a **new** ZIP with fresh metadata and an explicit
four-field submission body. It does not copy preview images, author metadata,
scripts, histories, original content, application IDs, or private notes.

Format reference: https://tech.hancom.com/hwpxformat/

Native Hancom visual opening is a separate verification requirement, not
implied by generation or XML/ZIP/round-trip checks.
