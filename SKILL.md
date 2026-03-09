---
name: free-image-bed-skill
description: Use when a user needs to upload a local image file to a public image host and return a publicly accessible URL, especially when working with the dooo.ng upload API.
---

# Free Image Bed Skill

## Overview

Use this skill when the task is to take a local image path, upload it to the configured public image bed, and return the final public URL.

Prefer the bundled Node CLI over rebuilding the multipart request by hand. It is cross-platform and avoids shell-specific behavior on Windows.

## When to Use

- The user wants to upload a local image and get a public URL back.
- The target API is `https://image.dooo.ng/api/v2/upload`.
- The upload should use:
  - `storage_id=8`
  - `is_public=1`
- The environment may be Windows, so avoid `.sh` workflows.

## Workflow

1. Confirm the local image path.
2. Run the bundled CLI:

```bash
node scripts/upload-image.mjs "/absolute/or/relative/path/to/image.png"
```

3. Return the printed URL to the user.

## Notes

- The script validates that the file exists before uploading.
- The script prints only the final URL on success.
- If the API response shape changes, the script fails with the raw response payload so it can be inspected quickly.
