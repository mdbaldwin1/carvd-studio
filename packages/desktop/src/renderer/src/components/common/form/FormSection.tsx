import React from 'react';

export interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormSection({ title, description, children, className }: FormSectionProps) {
  return (
    <div className={`settings-section${className ? ` ${className}` : ''}`}>
      <h3>{title}</h3>
      {description && <p className="section-description">{description}</p>}
      {children}
    </div>
  );
}
