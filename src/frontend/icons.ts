/** Stable, shared Lucide icon catalog: used by the picker, validation and renderer.
 * IDs are persisted in Termix settings; do not rename IDs after the first public release.
 * Icons are rendered with PluginIcon from the Termix SDK, not bundled from lucide-react. */
export const ICON_GROUPS = ["identity", "security", "servers", "network", "devices", "development", "status"] as const;
export type IconGroup = typeof ICON_GROUPS[number];

export const ICON_CATALOG = [
  { id: "id-card", lucide: "IdCard", group: "identity", keywords: "credential identity" },
  { id: "contact", lucide: "Contact", group: "identity", keywords: "address book" },
  { id: "contact-round", lucide: "ContactRound", group: "identity", keywords: "person" },
  { id: "user-round", lucide: "UserRound", group: "identity", keywords: "account person" },
  { id: "user-cog", lucide: "UserCog", group: "identity", keywords: "settings account" },
  { id: "users", lucide: "Users", group: "identity", keywords: "people accounts" },
  { id: "user-check", lucide: "UserCheck", group: "identity", keywords: "approved user" },
  { id: "user-round-check", lucide: "UserRoundCheck", group: "identity", keywords: "verified account" },
  { id: "user-x", lucide: "UserX", group: "identity", keywords: "denied user" },
  { id: "fingerprint", lucide: "Fingerprint", group: "identity", keywords: "biometric" },
  { id: "fingerprint-pattern", lucide: "Fingerprint", group: "identity", keywords: "biometric fingerprint" },
  { id: "scan-face", lucide: "ScanFace", group: "identity", keywords: "face biometric" },
  { id: "badge-check", lucide: "BadgeCheck", group: "identity", keywords: "verified identity" },
  { id: "at-sign", lucide: "AtSign", group: "identity", keywords: "login email" },
  { id: "key-round", lucide: "KeyRound", group: "security", keywords: "ssh key" },
  { id: "key", lucide: "Key", group: "security", keywords: "key" },
  { id: "key-square", lucide: "KeySquare", group: "security", keywords: "key file" },
  { id: "lock-keyhole", lucide: "LockKeyhole", group: "security", keywords: "password" },
  { id: "lock", lucide: "Lock", group: "security", keywords: "locked" },
  { id: "lock-open", lucide: "LockOpen", group: "security", keywords: "unlocked" },
  { id: "shield", lucide: "Shield", group: "security", keywords: "protection" },
  { id: "shield-check", lucide: "ShieldCheck", group: "security", keywords: "approved secure" },
  { id: "shield-alert", lucide: "ShieldAlert", group: "security", keywords: "warning security" },
  { id: "shield-off", lucide: "ShieldOff", group: "security", keywords: "disabled firewall" },
  { id: "shield-question", lucide: "ShieldQuestion", group: "security", keywords: "unknown security" },
  { id: "vault", lucide: "Vault", group: "security", keywords: "secrets" },
  { id: "eye", lucide: "Eye", group: "security", keywords: "view" },
  { id: "eye-off", lucide: "EyeOff", group: "security", keywords: "hidden" },
  { id: "file-key", lucide: "FileKey", group: "security", keywords: "certificate" },
  { id: "server", lucide: "Server", group: "servers", keywords: "server" },
  { id: "server-cog", lucide: "ServerCog", group: "servers", keywords: "server configuration" },
  { id: "server-off", lucide: "ServerOff", group: "servers", keywords: "offline server" },
  { id: "database", lucide: "Database", group: "servers", keywords: "sql" },
  { id: "database-backup", lucide: "DatabaseBackup", group: "servers", keywords: "backup" },
  { id: "hard-drive", lucide: "HardDrive", group: "servers", keywords: "storage nas" },
  { id: "hard-drive-download", lucide: "HardDriveDownload", group: "servers", keywords: "disk download" },
  { id: "cloud", lucide: "Cloud", group: "servers", keywords: "vps" },
  { id: "cloud-cog", lucide: "CloudCog", group: "servers", keywords: "cloud settings" },
  { id: "cloud-upload", lucide: "CloudUpload", group: "servers", keywords: "cloud upload" },
  { id: "cloud-download", lucide: "CloudDownload", group: "servers", keywords: "cloud download" },
  { id: "boxes", lucide: "Boxes", group: "servers", keywords: "cluster" },
  { id: "box", lucide: "Box", group: "servers", keywords: "container vm" },
  { id: "container", lucide: "Container", group: "servers", keywords: "docker" },
  { id: "cpu", lucide: "Cpu", group: "servers", keywords: "processor" },
  { id: "memory-stick", lucide: "MemoryStick", group: "servers", keywords: "ram" },
  { id: "circuit-board", lucide: "CircuitBoard", group: "servers", keywords: "hardware" },
  { id: "layers", lucide: "Layers", group: "servers", keywords: "stack" },
  { id: "archive", lucide: "Archive", group: "servers", keywords: "storage archive" },
  { id: "folder-key", lucide: "FolderKey", group: "servers", keywords: "secure folder" },
  { id: "plug-zap", lucide: "PlugZap", group: "network", keywords: "external connection" },
  { id: "plug", lucide: "Plug", group: "network", keywords: "connector" },
  { id: "cable", lucide: "Cable", group: "network", keywords: "network cable" },
  { id: "ethernet-port", lucide: "EthernetPort", group: "network", keywords: "ethernet" },
  { id: "network", lucide: "Network", group: "network", keywords: "switch lan" },
  { id: "router", lucide: "Router", group: "network", keywords: "gateway" },
  { id: "wifi", lucide: "Wifi", group: "network", keywords: "wireless" },
  { id: "wifi-off", lucide: "WifiOff", group: "network", keywords: "disconnected wireless" },
  { id: "globe", lucide: "Globe", group: "network", keywords: "web world" },
  { id: "link-2", lucide: "Link2", group: "network", keywords: "linked" },
  { id: "unlink", lucide: "Unlink", group: "network", keywords: "disconnected" },
  { id: "radio-tower", lucide: "RadioTower", group: "network", keywords: "antenna" },
  { id: "waypoints", lucide: "Waypoints", group: "network", keywords: "routing" },
  { id: "webhook", lucide: "Webhook", group: "network", keywords: "integration" },
  { id: "monitor", lucide: "Monitor", group: "devices", keywords: "desktop workstation" },
  { id: "monitor-cog", lucide: "MonitorCog", group: "devices", keywords: "managed host" },
  { id: "laptop", lucide: "Laptop", group: "devices", keywords: "notebook" },
  { id: "smartphone", lucide: "Smartphone", group: "devices", keywords: "mobile" },
  { id: "tablet", lucide: "Tablet", group: "devices", keywords: "tablet device" },
  { id: "printer", lucide: "Printer", group: "devices", keywords: "printer" },
  { id: "terminal", lucide: "Terminal", group: "devices", keywords: "shell console" },
  { id: "square-terminal", lucide: "SquareTerminal", group: "devices", keywords: "ssh terminal" },
  { id: "keyboard", lucide: "Keyboard", group: "devices", keywords: "keyboard" },
  { id: "usb", lucide: "Usb", group: "devices", keywords: "usb" },
  { id: "webcam", lucide: "Webcam", group: "devices", keywords: "camera" },
  { id: "code", lucide: "Code", group: "development", keywords: "source code" },
  { id: "code-xml", lucide: "CodeXml", group: "development", keywords: "markup xml" },
  { id: "git-branch", lucide: "GitBranch", group: "development", keywords: "git" },
  { id: "git-commit-horizontal", lucide: "GitCommitHorizontal", group: "development", keywords: "commit" },
  { id: "workflow", lucide: "Workflow", group: "development", keywords: "automation" },
  { id: "settings", lucide: "Settings", group: "development", keywords: "configuration" },
  { id: "settings-2", lucide: "Settings2", group: "development", keywords: "settings" },
  { id: "wrench", lucide: "Wrench", group: "development", keywords: "tools" },
  { id: "cog", lucide: "Cog", group: "development", keywords: "maintenance" },
  { id: "bug", lucide: "Bug", group: "development", keywords: "debug" },
  { id: "flask-conical", lucide: "FlaskConical", group: "development", keywords: "test staging" },
  { id: "rocket", lucide: "Rocket", group: "development", keywords: "deploy" },
  { id: "package", lucide: "Package", group: "development", keywords: "distribution" },
  { id: "circle-help", lucide: "CircleHelp", group: "status", keywords: "unknown" },
  { id: "circle-dot", lucide: "CircleDot", group: "status", keywords: "state" },
  { id: "circle-check", lucide: "CircleCheck", group: "status", keywords: "success" },
  { id: "circle-x", lucide: "CircleX", group: "status", keywords: "failure" },
  { id: "circle-alert", lucide: "CircleAlert", group: "status", keywords: "alert" },
  { id: "info", lucide: "Info", group: "status", keywords: "information" },
  { id: "ban", lucide: "Ban", group: "status", keywords: "none disabled" },
  { id: "check", lucide: "Check", group: "status", keywords: "approved" },
  { id: "x", lucide: "X", group: "status", keywords: "close" },
  { id: "triangle-alert", lucide: "TriangleAlert", group: "status", keywords: "warning" },
  { id: "clock", lucide: "Clock", group: "status", keywords: "time" },
  { id: "timer", lucide: "Timer", group: "status", keywords: "timeout" },
  { id: "activity", lucide: "Activity", group: "status", keywords: "monitoring" },
  { id: "gauge", lucide: "Gauge", group: "status", keywords: "metrics" },
  { id: "zap", lucide: "Zap", group: "status", keywords: "fast" },
  { id: "star", lucide: "Star", group: "status", keywords: "favorite" },
  { id: "flag", lucide: "Flag", group: "status", keywords: "flag" },
] as const;
export type IconName = "none" | typeof ICON_CATALOG[number]["id"];
export interface IconDefinition {
  readonly id: Exclude<IconName, "none">;
  readonly lucide: string;
  readonly group: IconGroup;
  readonly keywords: string;
}
const ICON_LOOKUP = new Map<string, IconDefinition>();
for (const icon of ICON_CATALOG) ICON_LOOKUP.set(icon.id, icon);
export function isIconName(value: unknown): value is IconName {
  return value === "none" || (typeof value === "string" && ICON_LOOKUP.has(value));
}
export function getIcon(name: IconName): IconDefinition | undefined {
  return name === "none" ? undefined : ICON_LOOKUP.get(name);
}
/** Search ID, Lucide name, group and synonyms without a second icon registry. */
export function searchIcons(query: string): IconDefinition[] {
  const parts = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!parts.length) return [...ICON_CATALOG];
  return ICON_CATALOG.filter(icon => {
    const searchable = `${icon.id} ${icon.lucide} ${icon.group} ${icon.keywords}`.toLowerCase();
    return parts.every(part => searchable.includes(part));
  });
}
