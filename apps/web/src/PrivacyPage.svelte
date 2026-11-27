<script lang="ts">
  // /privasi: a plain privacy page. The operator's contact comes from etnos.yaml (operator.name, email, url),
  // read from GET /v1/privasi. Each statement describes what the code does (docs/ops/private-alpha-2026-11-27.md).
  import { Mail, Globe } from '@lucide/svelte'
  import { request } from './api'

  type Info = { name: string; operator: { name: string; email: string; url: string }; minimumAge: number }
  let info = $state<Info | null>(null)
  $effect(() => {
    void request<Info>('/v1/privasi', undefined, undefined, true).then((i) => (info = i)).catch(() => (info = { name: 'ETNOS', operator: { name: '', email: '', url: '' }, minimumAge: 18 }))
  })
  const site = $derived(info?.name || 'ETNOS')
</script>

<article class="privacy-page">
  <h1>Privasi</h1>
  <p class="lead">Halaman ini menjelaskan data apa yang disimpan {site}, siapa yang dapat melihatnya, dan cara menghubungi pengelolanya. {site} sedang dalam masa uji untuk kelompok kecil yang diundang.</p>

  <section>
    <h2>Pengelola</h2>
    {#if info?.operator.name || info?.operator.email || info?.operator.url}
      <p>{site} dikelola oleh {info.operator.name || 'pengelola node ini'}. Untuk pertanyaan tentang datamu, permintaan menghapus data, atau laporan, hubungi pengelola lewat kontak berikut.</p>
      <ul class="contact">
        {#if info.operator.email}<li><Mail size={16} /><a href={'mailto:' + info.operator.email}>{info.operator.email}</a></li>{/if}
        {#if info.operator.url}<li><Globe size={16} /><a href={info.operator.url} rel="noopener noreferrer">{info.operator.url}</a></li>{/if}
      </ul>
    {:else if info}
      <p>Pengelola node ini belum mencantumkan kontak. Kamu tetap dapat melaporkan posting, profil atau komunitas lewat tombol Laporkan, yang sampai ke pengelola.</p>
    {/if}
  </section>

  <section>
    <h2>Akun</h2>
    <p>Akunmu adalah akun AT Protocol, dibuat di server akun ETNOS atau di Bluesky. {site} menyimpan pengenal akunmu, nama akun dan nama tampilanmu. Akun di server akun ETNOS tidak memakai surel. Kata sandi dan kode pemulihan disimpan dalam bentuk yang tidak dapat dibaca kembali, sehingga pengelola pun tidak dapat melihatnya.</p>
    <p>Bergabung memerlukan usia paling sedikit {info?.minimumAge ?? 18} tahun.</p>
  </section>

  <section>
    <h2>Yang kamu tulis</h2>
    <p>Posting di komunitas publik dapat dibaca siapa saja, termasuk orang tanpa akun. Posting di komunitas privat hanya dapat dibaca anggotanya. Kamu dapat menghapus postinganmu sendiri, dan pengurus komunitas dapat menyembunyikan posting yang melanggar aturan.</p>
    <p>Aksara, pustakawan AI di {site}, bekerja di ruang publik. Model AI yang dijalankan pihak lain tidak pernah membaca komunitas privat, dan pesan suara di komunitas privat tidak ditranskripsi di layanan awan.</p>
  </section>

  <section>
    <h2>Permintaan undangan</h2>
    <p>Nama, kontak dan alasan yang kamu kirim saat meminta undangan hanya dibaca pengelola. Permintaan yang ditolak langsung dihapus, dan permintaan yang disetujui dihapus 30 hari kemudian. {site} tidak mengirim surel.</p>
  </section>

  <section>
    <h2>Notifikasi</h2>
    <p>Notifikasi hanya dikirim ke perangkat yang kamu nyalakan di Pengaturan. Isinya satu kalimat tetap dan tautan, tanpa isi posting atau nama orang. Notifikasi dikirim lewat layanan bawaan browsermu dalam bentuk terenkripsi. Mematikan notifikasi atau keluar dari akun menghapus langganan perangkat itu.</p>
  </section>

  <section>
    <h2>Cadangan</h2>
    <p>Seluruh isi node dicadangkan setiap hari ke penyimpanan privat dan disimpan 14 hari. Cadangan tidak memiliki alamat publik dan hanya pengelola yang dapat mengunduhnya. Sesi masuk tidak ikut dicadangkan.</p>
  </section>

  <section>
    <h2>Di perangkatmu</h2>
    <p>{site} memakai cookie hanya untuk proses masuk dan untuk menjaga kamu tetap masuk. Pilihan tampilan, suara dan tempat disimpan di perangkatmu sendiri. {site} tidak memasang iklan atau pelacak iklan. Peta memuat gambar dari penyedia peta, dan video dari situs lain baru dimuat setelah kamu mengetuknya, kecuali kamu mengubahnya di Pengaturan.</p>
  </section>

  <section>
    <h2>Menghapus data</h2>
    <p>Untuk menghapus akunmu dari {site} beserta isinya, hubungi pengelola. Isi yang sudah kamu terbitkan ke jaringan AT dengan izinmu juga tersimpan di server akunmu dan dapat dihapus dari sana.</p>
  </section>
</article>

<style>
  .privacy-page { max-width: 680px; padding: 28px 24px 72px; display: grid; gap: 22px; overflow-wrap: anywhere; }
  h1 { margin: 0; font-family: var(--font-editorial); font-weight: 400; font-size: clamp(28px, 4vw, 38px); letter-spacing: -0.025em; line-height: 1.12; }
  .lead { font-size: 16.5px; }
  section { display: grid; gap: 8px; }
  h2 { margin: 0; font-size: 1.1rem; font-weight: 650; }
  p { margin: 0; font-size: 15.5px; line-height: 1.65; }
  .contact { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
  .contact li { display: flex; align-items: center; gap: 8px; font-size: 15.5px; }
  .contact a { color: var(--foreground); text-underline-offset: 3px; }
  @media (max-width: 767px) { .privacy-page { padding: 20px 16px 112px; } }
</style>
