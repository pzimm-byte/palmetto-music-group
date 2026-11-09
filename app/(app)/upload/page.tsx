import { requireMember } from '@/lib/auth/session';
import { songOptionsForMember } from '@/lib/data/queries';
import { UploadForm } from '@/components/UploadForm';

export const metadata = { title: 'Upload song' };

export default async function UploadPage({ searchParams }: { searchParams: Promise<{ mode?: string; song?: string }> }) {
  const me = await requireMember();
  const sp = await searchParams;
  const songs = await songOptionsForMember(me.id);
  const preset = songs.find((s) => s.id === sp.song)?.id ?? '';
  return <UploadForm songs={songs} initialMode={sp.mode === 'version' ? 'version' : 'song'} initialSong={preset} />;
}
