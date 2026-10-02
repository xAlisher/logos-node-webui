import { pretty } from "./blockModel";
import "./blocks.css";

export interface JsonBlockProps {
  json: string;
}

/** JsonBlock — prettified, monospace JSON display (replica of JsonBlock.qml). */
export function JsonBlock({ json }: JsonBlockProps) {
  return <pre className="json-block">{pretty(json)}</pre>;
}
