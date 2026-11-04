# Contributing

This project is at planning stage. Please open a scoped issue/discussion before implementing new adapter formats or adding dependencies. Follow `AGENTS.md`, read the architecture ADRs and test plans, and submit small PRs that include a native-format fixture, a compatibility statement and test evidence.

## Adapter contributor checklist

- Uses only a documented official supported theme mechanism.
- Declares application and version compatibility and mapping limitations.
- Handles invalid input safely and creates deterministic export names and bytes.
- Includes an illustrative preview map or makes limitations explicit.
- Does not execute arbitrary code, write to user app config folders or fetch remote assets.
- Includes installation/removal instructions and tests.

## Security concerns

Do not publish credentials, private user themes without permission, or third-party trademarks/assets without rights. Report security issues privately to the project maintainers once the project contact channel is established; do not upload exploit examples as public demo files.

License for starter files: MIT (see `LICENSE`). Verify attribution of all future external source/assets before merging.
