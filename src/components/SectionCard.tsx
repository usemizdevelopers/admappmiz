import type { ReactNode } from 'react';

export function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="section-card">
      <h3 className="section-card-title">{title}</h3>
      {children}
    </div>
  );
}
