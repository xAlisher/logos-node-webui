// LogosIcon — the Logos lambda mark at the top-left of the operation page
// (header-logos-icon). This renders the official app's OWN brand asset: the SVG is
// copied verbatim from the project's icon set (src/qml/icons/logos.svg) into
// src/assets/logos.svg and inlined here via a ?raw import, so the replica shows the
// exact mark the native header does — a 48:66 white lambda — not a redrawn glyph.
//
// QML tints it with Theme.palette.text; the asset itself is white (#FFFFFF), which is
// the header foreground on the dark DS background, so no recolor is needed.

import logosMarkup from "../assets/logos.svg?raw";

export interface LogosIconProps {
  /** Rendered height in px (QML uses a 30px box; the 48:66 aspect gives ~22px wide). */
  size?: number;
  className?: string;
}

export function LogosIcon({ size = 30, className }: LogosIconProps) {
  return (
    <span
      className={["shell-logo", className].filter(Boolean).join(" ")}
      data-testid="header-logos-icon"
      role="img"
      aria-label="Logos"
      style={{ height: size, width: (size * 48) / 66 }}
      // The markup is our own asset file, copied into the repo — not remote input.
      dangerouslySetInnerHTML={{ __html: logosMarkup }}
    />
  );
}
