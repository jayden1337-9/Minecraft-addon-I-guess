# Arcane Arsenal

A Minecraft Bedrock add-on with custom arcane items, mana, progression, and abilities.

## Download

- For the easiest installation on Android or Windows, download **ArcaneArsenal.mcaddon** from the Assets section of a GitHub Release.
- The behavior pack and resource pack are also published as separate **.mcpack** release assets.
- GitHub Actions artifacts are provided separately for CI/testing. GitHub wraps each Actions artifact in a ZIP download; extract that ZIP to get the actual Minecraft file.

## Install on Android

1. Download the raw `.mcaddon` asset from a GitHub Release (not the green Actions artifact ZIP).
2. Open the downloaded `.mcaddon` from your Downloads app or file manager.
3. Choose Minecraft if Android asks which app to use.
4. In Minecraft, create or edit a world and enable both Arcane Arsenal packs.

## Build locally

Run `python tools/generate_textures.py`, then package the contents of `behavior_pack` and `resource_pack` as individual ZIP files with the `.mcpack` extension. The combined `.mcaddon` contains the two pack directories.

The GitHub Actions workflow validates JSON and JavaScript syntax, generates textures, verifies archive structure, uploads each package as its own artifact, and publishes raw package files as release assets when a `v*` tag is pushed.

## Compatibility note

The workflow verifies packaging and static syntax. Minecraft-version-specific Script API behavior still needs an in-game test on the target Bedrock version.
