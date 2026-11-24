<script lang="ts">
  import {
    Check,
    FlaskConical,
    ExternalLink,
    ShieldAlert,
  } from '@lucide/svelte'
  import report from './spaces-alpha-report.json'
  const labels: Record<string, string> = {
    'create-private-space': 'Ruang privat dibuat',
    'member-write-on-second-pds': 'Anggota menulis dari PDS kedua',
    'admitted-member-can-mint-credential': 'Anggota mendapat kredensial',
    'cross-pds-authorized-read': 'Baca lintas PDS dan verifikasi MAC',
    'outsider-credential-denied': 'Nonanggota ditolak',
    'anonymous-space-read-denied': 'Baca anonim ditolak',
    'wrong-credential-key-denied': 'Kunci yang berbeda ditolak',
    'absent-from-public-repository-records':
      'Posting tidak ada di API rekaman publik',
    'absent-from-public-collection-list': 'Posting tidak ada di daftar publik',
    'authorized-private-blob-read': 'Gambar privat terbaca oleh anggota',
    'anonymous-private-blob-denied': 'Gambar privat menolak akses anonim',
    'private-blob-absent-from-public-sync':
      'Gambar privat tidak tersedia di sync publik',
    'removed-member-cannot-mint-new-credential':
      'Anggota yang dihapus tidak mendapat kredensial baru',
    'issued-credential-still-readable-immediately-after-removal':
      'Kredensial lama masih dapat membaca setelah penghapusan',
  }
</script>

<div class="cx-page-head">
  <h1 class="lab-heading"><FlaskConical size={18} />AT Spaces</h1>
  <span class="post-state">Uji coba aktif</span>
</div>
<div class="spaces-lab">
  <p>
    Server akun ETNOS menjalankan AT Protocol Spaces (proposal 0016, tahap alpha),
    kunci sandi WebAuthn (Passkeys), pencabutan akses saat anggota dihapus, dan
    cadangan repositori CAR ke R2.
  </p>
  <div class="lab-warning">
    <ShieldAlert size={18} />
    <div>
      <strong>Ruang AT bukan enkripsi ujung ke ujung.</strong>
      <p>
        Ruang AT mengatur izin akses lintas server. Pengelola server akun masih
        dapat membaca isi ruang privat. Untuk percakapan terenkripsi ujung ke
        ujung, gunakan Pesan langsung.
      </p>
    </div>
  </div>
  <p class="cx-hint">
    Pengurus komunitas privat dapat mengaktifkan dan menyinkronkan Ruang AT dari
    tab Tentang di halaman komunitas privat. Daftar di bawah adalah catatan uji
    protokol awal di dua PDS.
  </p>
  <ul>
    {#each report.checks as item}<li>
        <Check size={16} />
        <span>{labels[item.name] ?? item.name}</span>
      </li>{/each}
  </ul>
  <details class="form-details">
    <summary>Versi protokol dan catatan teknis</summary>
    <code>{report.snapshot}</code>
    <p>
      Server akun ETNOS memeriksa pencabutan keanggotaan pada setiap pembacaan
      lokal dan mengirim <code>notifyCredentialsRevoked</code> saat anggota
      dikeluarkan.
    </p>
  </details>
  <a
    class="post-inline-link"
    href="https://github.com/yohn-maistre/etnos/tree/main/packages/pds"
    target="_blank"
    rel="noopener noreferrer"
  >
    Kode server akun dan Spaces <ExternalLink size={14} />
  </a>
</div>
