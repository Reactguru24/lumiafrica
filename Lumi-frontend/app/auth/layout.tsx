import { AuthLayout } from '@/components/layouts/AuthLayout'

export default function AuthRootLayout({ children }: { children: React.ReactNode }) {
  return <AuthLayout>{children}</AuthLayout>
}
