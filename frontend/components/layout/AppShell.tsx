import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

interface AppShellProps {
  domain?: string;
  children: React.ReactNode;
}

export function AppShell({ domain, children }: AppShellProps) {
  return (
    <div className="h-screen flex overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col md:ml-64 min-h-0">
        <TopBar domain={domain} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
