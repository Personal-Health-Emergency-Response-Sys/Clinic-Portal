// src/components/layout/PageWrapper.tsx

interface PageWrapperProps {
  children: React.ReactNode;
}

export function PageWrapper({ children }: PageWrapperProps) {
  return (
    <main className="flex-1 overflow-y-auto bg-brand-gray p-6">
      {children}
    </main>
  );
}