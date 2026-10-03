'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

export function EditUsernameButton({
  userId,
  username,
}: {
  userId: number;
  username: string;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [nextUsername, setNextUsername] = React.useState(username);
  const [isSaving, setIsSaving] = React.useState(false);
  const router = useRouter();
  const toast = useToast();

  const saveUsername = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedUsername = nextUsername.trim();
    if (trimmedUsername.length < 3 || trimmedUsername.length > 50) {
      toast.warning('Username tidak valid', 'Username harus berisi 3–50 karakter.');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmedUsername }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        toast.error('Username gagal diperbarui', result.error || 'Silakan coba lagi.');
        return;
      }

      setIsOpen(false);
      toast.success('Username diperbarui', `Username berhasil diubah menjadi ${trimmedUsername}.`);
      router.refresh();
    } catch (error: unknown) {
      toast.error(
        'Username gagal diperbarui',
        error instanceof Error ? error.message : 'Periksa koneksi lalu coba lagi.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setNextUsername(username);
          setIsOpen(true);
        }}
        aria-label={`Edit username ${username}`}
        title="Edit username"
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-blue-100 transition-colors hover:bg-white/15 hover:text-white"
      >
        <Edit2 className="h-4 w-4" />
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Edit Username"
        description={`Ubah username akun @${username}.`}
        maxWidth="sm"
      >
        <form onSubmit={saveUsername} className="space-y-4">
          <Input
            label="Username"
            value={nextUsername}
            onChange={(event) => setNextUsername(event.target.value)}
            minLength={3}
            maxLength={50}
            autoComplete="off"
            required
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSaving}>
              Batal
            </Button>
            <Button type="submit" variant="primary" isLoading={isSaving} loadingText="Menyimpan...">
              Simpan
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
