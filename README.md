# Hebrew RTL

Cursor chat stays left-to-right even when you write Hebrew. This extension turns a paragraph right-to-left when it contains at least one Hebrew word.

A line with no Hebrew word stays left-to-right. A fenced code block stays left-to-right, so code does not flip. A Hebrew word inside a short inline code span still turns the surrounding sentence right-to-left. List markers move to the right side of a Hebrew list.

## Install

Download `hebrew-rtl-0.1.0.vsix` from the [releases](https://github.com/nivlplaytika/cursor-hebrew-rtl/releases/tag/v0.1.0) and install it with **Extensions: Install from VSIX**.

Cursor has to reload once after the first install. The extension applies again by itself after a Cursor update, on the next startup.

The current patch matches Cursor 3.27.22 (27 October 2026). A newer Cursor build can rename the internal chat script. On an unknown build the extension changes nothing and says this version is not supported yet.

## What it changes

On startup it edits the installed Cursor app:

- chat paragraphs get a direction, and one Hebrew word is enough to choose right-to-left
- list markers are no longer stuck on the left
- Cursor's file checksum is updated so the app does not report a corrupt install

It does not send the text anywhere.

## Command

**Hebrew RTL: Apply** runs the same step again and asks you to reload if anything changed.
