/**
 * Root redirect — sends authenticated users to tabs, others to login.
 */
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/auth.store';

export default function Index() {
  const user = useAuthStore((s) => s.user);
  return <Redirect href={user ? '/(tabs)' : '/(auth)/login'} />;
}
