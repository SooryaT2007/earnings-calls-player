import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  isElectron: boolean;
  openAudioDialog: () => Promise<string | null>;
  openPdfDialog: () => Promise<string | null>;
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  formatLocalPathToUrl: (filePath: string) => string;
}

const electronAPI: ElectronAPI = {
  isElectron: true,
  openAudioDialog: () => ipcRenderer.invoke('dialog:openAudioFile'),
  openPdfDialog: () => ipcRenderer.invoke('dialog:openPdfFile'),
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  formatLocalPathToUrl: (filePath: string) => `app-file://${filePath}`
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
