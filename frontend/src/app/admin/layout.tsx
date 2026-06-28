import React from 'react';

export const metadata = {
  title: 'Nexo Chat - Admin Dashboard',
  description: 'Administrative panel for managing Nexo Chat users, channels, calls, and files.',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
