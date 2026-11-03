import type { CSSProperties, ReactElement, Ref } from "react";
import { PluginIcon } from "@termix-ssh/plugin-sdk/ui";
import { getIcon } from "./icons.ts";
import type { AuthInfo } from "./classify";
import type { DisplayPreferences } from "./preferences";
import type { PartDisplay, Translator } from "./presentation";
import { badgeLabels } from "./presentation";
import type { IconName } from "./icons.ts";
import { effectiveColor } from "./design.ts";
import type { PalettePreset } from "./design.ts";
import { compactBadgePixels } from "./badgeSizing.ts";

/** Both live badges and the settings picker resolve through icons.ts. */
export function BadgeIcon({ name }: { name: IconName }) {
  const icon = getIcon(name);
  return icon ? <PluginIcon name={icon.lucide} aria-hidden className="ha-icon" /> : null;
}

type CompactPixels = ReturnType<typeof compactBadgePixels>;
function Part({ part, type, palette, pixels }: {
  part: PartDisplay; type: "source" | "method"; palette: PalettePreset;
  pixels: CompactPixels;
}): ReactElement {
  const accent = effectiveColor(palette, type, part.value, part.color);
  // In Monochrome, use the selected category's grayscale accent (not one per group).
  const styles = {
    "--ha-text-color": accent,
    "--ha-icon-color": accent,
    "--ha-bg-color": `color-mix(in srgb, ${accent} 25%, transparent)`,
    "--ha-border-color": accent,
    fontSize: `${pixels.textPx}px`,
    "--ha-icon-px": `${pixels.iconPx}px`,
  } as CSSProperties;
  return (
    <span
      className="ha-part"
      data-ha-part={type}
      style={styles}
    >
      {part.icon !== "none" && <BadgeIcon name={part.icon} />}
      {part.text && <span className="ha-label">{part.text}</span>}
    </span>
  );
}

/** Same renderer in the host list and the live preview; never changes a host name. */
export function AuthBadgeView({ info, preferences, t, preview = false, badgeRef }: {
  info: AuthInfo;
  preferences: DisplayPreferences;
  t: Translator;
  preview?: boolean;
  badgeRef?: Ref<HTMLSpanElement>;
}): ReactElement | null {
  const content = badgeLabels(info, preferences);
  if (!content) return null;
  const pixels = compactBadgePixels(preferences.textSize, preferences.iconSize);
  const description = [
    `${t("tooltip.source")}: ${t(`source.${info.source}`)}`,
    `${t("tooltip.method")}: ${info.method === "custom" && info.customType ? info.customType : t(`method.full.${info.method}`)}`,
    ...(info.uncertain ? [t("tooltip.uncertain")] : []),
  ].join(" · ");
  const ordered = [
    content.source && <Part key="source" part={content.source} type="source" palette={preferences.palettePreset} pixels={pixels} />,
    content.method && <Part key="method" part={content.method} type="method" palette={preferences.palettePreset} pixels={pixels} />,
  ];
  const children = ordered.filter((element): element is ReactElement => Boolean(element));
  return (
    <span
      ref={badgeRef}
      className="ha-badge"
      data-host-auth-badge=""
      data-host-auth-position={preferences.position}
      data-host-auth-preview={preview ? "true" : "false"}
      data-ha-variant={preferences.layoutVariant}
      data-ha-palette={preferences.palettePreset}
      role="img"
      aria-label={description}
      title={description}
      style={{
        "--ha-text-px": `${pixels.textPx}px`,
        "--ha-gap": "3px",
      } as CSSProperties}
    >
      <span className="ha-composition">{children.map((element,index)=>(
        <span className="ha-item" key={element.key ?? index}>{element}</span>
      ))}</span>
    </span>
  );
}

