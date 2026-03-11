# Figma Code Connect Setup

This repository uses the root config at `figma.config.json`.

## 1) Set your Figma token

Use a personal access token with Dev Mode / Code Connect permissions.

```bash
export FIGMA_ACCESS_TOKEN="<your-figma-token>"
```

Optional check:

```bash
echo "$FIGMA_ACCESS_TOKEN"
```

## 2) Generate a Code Connect file from a Figma node

Run from `/home/dhanush/Projects/glitch-finance-app`.

```bash
figma connect create "https://www.figma.com/design/<fileKey>/<fileName>?node-id=<nodeId>" \
  --config ./figma.config.json \
  --outDir ./make-updates/code-connect
```

## 3) Parse locally (validation before publish)

```bash
figma connect parse --config ./figma.config.json
```

## 4) Publish to Figma

```bash
figma connect publish --config ./figma.config.json
```

## Notes

- Source files are scanned from `make-updates`.
- If you want to scope publishing to only Code Connect docs later, update `include` in `figma.config.json` to just `make-updates/**/*.figma.{ts,js}`.
