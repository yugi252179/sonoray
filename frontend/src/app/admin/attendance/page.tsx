import { redirect } from 'next/navigation';

export default function AttendanceRootPage() {
  const currentYear = new Date().getFullYear();
  redirect(`/admin/attendance/${currentYear}`);
}
