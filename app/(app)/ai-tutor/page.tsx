"use client";

import Chat from '@/components/tutor/Chat';
import { useAuthUser } from '@/components/AuthUserProvider';

export default function AiTutorPage() {
  const auth = useAuthUser();
  // Chat component handles visited flag and other logic
  return <Chat />;
}
