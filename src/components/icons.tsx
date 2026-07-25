/**
 * App icons — Tabler Icons (same approach as work / grok-app).
 * Stable `Icon*` names for call sites.
 * @see https://tabler.io/icons
 */

import type { ComponentType } from "react";
import {
  IconChevronDown as TbChevronDown,
  IconCode as TbCode,
  IconCopy as TbCopy,
  IconDownload as TbDownload,
  IconLink as TbLink,
  IconMinus as TbMinus,
  IconPhoto as TbPhoto,
  IconPlus as TbPlus,
  IconSquare as TbSquare,
  IconMoon as TbMoon,
  IconSun as TbSun,
  IconTrash as TbTrash,
  IconX as TbX,
} from "@tabler/icons-react";

export type IconProps = {
  size?: number;
  title?: string;
  className?: string;
  stroke?: number;
};

type TbIcon = ComponentType<{
  size?: number | string;
  stroke?: number;
  color?: string;
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}>;

function wrap(Tb: TbIcon, defaults?: { stroke?: number; className?: string }) {
  function TablerAppIcon({
    size = 18,
    title,
    stroke = defaults?.stroke ?? 1.75,
    className = "",
  }: IconProps) {
    const classes = ["g-icon", defaults?.className, className]
      .filter(Boolean)
      .join(" ");
    return (
      <span
        className={classes}
        style={{
          display: "inline-flex",
          width: size,
          height: size,
          lineHeight: 0,
          color: "currentColor",
          flexShrink: 0,
          alignItems: "center",
          justifyContent: "center",
        }}
        role={title ? "img" : undefined}
        aria-hidden={title ? undefined : true}
        aria-label={title}
        title={title}
      >
        <Tb size={size} stroke={stroke} color="currentColor" aria-hidden />
      </span>
    );
  }
  return TablerAppIcon;
}

export const IconPlus = wrap(TbPlus);
export const IconCopy = wrap(TbCopy);
export const IconTrash = wrap(TbTrash);
export const IconDownload = wrap(TbDownload);
export const IconPhoto = wrap(TbPhoto);
export const IconCode = wrap(TbCode);
export const IconLink = wrap(TbLink);
export const IconClose = wrap(TbX);
export const IconMinimize = wrap(TbMinus);
export const IconMaximize = wrap(TbSquare);
export const IconChevronDown = wrap(TbChevronDown);
export const IconThemeMoon = wrap(TbMoon);
export const IconThemeSun = wrap(TbSun);
