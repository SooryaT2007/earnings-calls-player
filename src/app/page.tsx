"use client";

import { useState } from "react";
import { AppProvider, useAppState } from "@/components/providers/app-provider";
import { TopNavigation } from "@/components/layout/top-navigation";
import { SessionSidebar } from "@/components/layout/session-sidebar";
import { Workspace } from "@/components/layout/workspace";
import { AudioPlayerBar } from "@/components/player/audio-player-bar";
import { UploadModal } from "@/components/upload/upload-modal";

function AppShell() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const { error } = useAppState();

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TopNavigation onOpenUpload={() => setUploadOpen(true)} />

      {error && (
        <div className="shrink-0 border-b border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <SessionSidebar />
        <Workspace />
      </div>

      <AudioPlayerBar />

      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </div>
  );
}

export default function Home() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}