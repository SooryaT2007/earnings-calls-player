"use client";

import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { cn } from "@/lib/utils";

/**
 * A resizable split pane with a visible horizontal divider.
 */
export function SplitWorkspace({
  left,
  right,
  defaultSize = 65,
  minLeft = 30,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
  defaultSize?: number;
  minLeft?: number;
}) {
  return (
    <PanelGroup direction="horizontal" className="min-h-0 flex-1">
      <Panel
        defaultSize={defaultSize}
        minSize={minLeft}
        className="min-w-0 min-h-0"
      >
        {left}
      </Panel>
      <PanelResizeHandle className="group relative w-1.5 shrink-0 bg-surface-800 transition-colors hover:bg-accent-600/60 data-[resize-handle-state=drag]:bg-accent-500">
        <div className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-surface-700 group-hover:bg-accent-600/70" />
      </PanelResizeHandle>
      <Panel defaultSize={100 - defaultSize} minSize={20} className="min-w-0 min-h-0">
        {right}
      </Panel>
    </PanelGroup>
  );
}