import type { Metadata } from 'next';
import '@radix-ui/themes/styles.css';
import { Theme } from '@radix-ui/themes';
import './globals.css';

export const metadata: Metadata = {
  title: 'Care — Caregiving, together.',
  description:
    'Care makes the invisible labor of caregiving visible, shared, and manageable. Coordinate care for aging parents, kids, pets, and more.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Theme
          accentColor="amber"
          grayColor="sand"
          radius="large"
          scaling="100%"
          appearance="light"
        >
          {children}
        </Theme>
      </body>
    </html>
  );
}
