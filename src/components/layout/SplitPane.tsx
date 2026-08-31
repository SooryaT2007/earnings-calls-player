import React from 'react';

interface SplitPaneProps {
  leftPane?: React.ReactNode;
  rightPane?: React.ReactNode;
  children?: React.ReactNode;
}

export const SplitPane: React.FC<SplitPaneProps> = ({ leftPane, rightPane, children }) => {
  return (
    <div className="flex flex-1 w-full h-full overflow-hidden bg-slate-950">
      {children ? children : (
        <>
          <div className="flex-1 h-full overflow-hidden flex flex-col">{leftPane}</div>
          {rightPane && <div className="h-full overflow-hidden flex flex-col">{rightPane}</div>}
        </>
      )}
    </div>
  );
};
