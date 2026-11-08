# Hebrew RTL

Cursor chat stays left-to-right even when you write Hebrew. This extension turns a paragraph right-to-left when it contains at least one Hebrew word.

A line with no Hebrew word stays left-to-right. A fenced code block stays left-to-right, so code does not flip. A Hebrew word inside a short inline code span still turns the surrounding sentence right-to-left. List markers move to the right side of a Hebrew list.

## Install

Download `hebrew-rtl-0.2.0.vsix` from the [releases](https://github.com/nivlplaytika/cursor-hebrew-rtl/releases) and install it with **Extensions: Install from VSIX**.

Cursor has to reload once after the first install. A Cursor update replaces the app files and removes the script. The extension writes it back on the next startup, because the script lives in the page both the editor and the Agents window load. It does not depend on the names inside Cursor's chat script.

The first launch after a Cursor update can show "Your Cursor installation appears to be corrupt. Please reinstall." Reload the window once more. The install is intact.

## What it changes

On startup it edits the installed Cursor app:

- chat paragraphs get a direction, and one Hebrew word is enough to choose right-to-left
- list markers are no longer stuck on the left
- Cursor's file checksum is updated so the app does not report a corrupt install

It does not send the text anywhere.

## Command

**Hebrew RTL: Apply** runs the same step again and asks you to reload if anything changed.
