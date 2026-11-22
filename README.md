# Arcane Arsenal

A Minecraft Bedrock add-on with custom arcane weapons, mana, progression, abilities, crystal ore, rune stone and the Riftling.

## Features

- Five usable magical weapons with unique abilities.
- Mana that regenerates over time, plus Mana Crystals for recovery.
- Up to 2,000 progression levels, with XP from defeating mobs and consuming Arcane Essence.
- Arcane Crystal Ore in the Overworld underground.
- Rune Stone surface deposits in the Overworld.
- The Riftling hostile mob, with its own spawn rules and loot.

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

Run `python tools/generate_textures.py`, then package the contents of `behavior_pack` and `resource_pack` as individual ZIP files with the `.mcpack` extension. The combined `.mcaddon` contains the two `.mcpack` files at its root, which is the expected import structure.

The GitHub Actions workflow validates pack JSON, cross-checks item and block texture references, checks the JavaScript syntax, generates textures, verifies archive structure, and uploads each package as its own artifact.

## Compatibility note

The workflow verifies packaging, JSON structure, cross-pack references, and JavaScript syntax. Minecraft-version-specific Script API behavior still needs an in-game test on the target Bedrock version.
