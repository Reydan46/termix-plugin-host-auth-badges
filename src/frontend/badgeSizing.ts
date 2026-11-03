/** Pixels at 100%, shared by the real host row and every preview. */
export const BASE_TEXT_PX = 9.5;
export const BASE_ICON_PX = 12.67875;
const percent=(value:number,fallback=100):number=>
  Number.isFinite(value)?Math.min(260,Math.max(60,value)):fallback;
export function badgePixels(textPercent:number,iconPercent:number){
  const text=BASE_TEXT_PX*percent(textPercent)/100;
  const icon=BASE_ICON_PX*percent(iconPercent)/100;
  return {textPx:Number(text.toFixed(2)),iconPx:Math.round((icon+1e-9)*100)/100};
}
export const MAX_ROW_TEXT_PX = 12;
export const MAX_ROW_ICON_PX = 14;
/** A constant-height native host list requires these independent upper bounds. */
export function compactBadgePixels(textPercent:number,iconPercent:number){
  const pixels=badgePixels(textPercent,iconPercent);
  return {textPx:Math.min(MAX_ROW_TEXT_PX,pixels.textPx),iconPx:Math.min(MAX_ROW_ICON_PX,pixels.iconPx)};
}
