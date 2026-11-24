<script lang="ts">
  import { ArrowUpRight } from '@lucide/svelte'
  import { request } from './api'

  const live = [
    'Komunitas menyediakan ruang publik dan ruang privat khusus anggota, lengkap dengan label tempat, bahasa dan topik.',
    'Posting mendukung teks, gambar, pesan suara, jajak pendapat, acara, penawaran Kios, kartu Peluang (beasiswa, hibah, kerja, pelatihan), dan Titip bagasi.',
    'Pesan suara mendukung rekaman langsung di peramban, pemutaran kecepatan 0,75x untuk belajar, Bantu tulis transkrip oleh komunitas, serta pembagian audio dari WhatsApp melalui PWA.',
    'Kamus komunitas menggarisbawahi kata bahasa daerah di dalam posting, menyediakan rekaman pelafalan, Mode belajar, Kata hari ini, ekspor CSV atau CLDF, dan cetakan Lembar Ajar ber-QR.',
    'Peta Kata di /peta-kata menampilkan padanan kata dasar dari daftar Leipzig-Jakarta di atas peta 256 bahasa Tanah Papua beserta pelafalannya.',
    'Ensiklopedia memuat halaman untuk tempat, bahasa, suku, spesies, bentang alam dan lembaga, lengkap dengan riwayat tinjauan, Peta Pengetahuan, katalog data dan sumber rujukan.',
    'Penampil layar penuh membuka foto spesimen, rekaman suara dan model 3D berformat .glb, .spz dan .ply dengan pin spasial 3D yang bisa diklik.',
    'Periksa memungkinkan anggota memeriksa klaim satu per satu dengan kartu geser sebelum hasil yang disepakati masuk ke Kamus atau Ensiklopedia.',
    'Kios anggota menyediakan Kartu Asal ber-QR yang siap dicetak untuk menautkan hasil kerajinan atau pangan ke halaman pembuatnya.',
    'Aksara bekerja terjadwal di ruang publik untuk merangkum kabar harian, menyusun draf Ensiklopedia bersumber yang langsung ditandai belum ditinjau, dan menjawab sebutan @aksara.',
    'Saluran opt-in per komunitas mendukung identifikasi tumbuhan Pl@ntNet pada foto publik dan Kurasi Balik catatan komunitas pada koleksi museum IIIF dengan ekspor W3C JSON-LD.',
    'Kabar mengumpulkan berita dari berbagai penerbit Papua menurut tempat, lengkap dengan tautan ke sumber aslinya.',
    'Akun berjalan di atas AT Protocol melalui host identitas ETNOS (dengan kata sandi dan Passkey WebAuthn) atau akun Bluesky yang sudah ada.',
    'Studio memberi pengurus kendali penuh atas jadwal Aksara, kunci model (Google AI Studio, OpenRouter, atau Workers AI), kunci layanan, dan peninjauan.',
  ]
  const testing = [
    'Situs lembaga menerbitkan halaman web mandiri dari data publik lembaga dengan dua templat dan riwayat versi.',
    'Pesan langsung terenkripsi ujung ke ujung antar perangkat.',
    'Ruang privat AT Protocol Spaces alfa dengan pencabutan akses otomatis saat anggota keluar dari komunitas privat.',
    'Pekerja GPU opsional di Modal untuk mengubah video keliling benda menjadi pindai 3D Gaussian Splat (.spz).',
  ]
  const lab = [
    {
      text: 'AT Protocol Spaces alfa diuji pada host identitas ETNOS untuk sinkronisasi anggota ruang privat.',
      href: 'https://github.com/yohn-maistre/etnos/tree/main/packages/pds',
      label: 'Kode host identitas',
    },
    {
      text: 'Pekerja pindai 3D tanpa server untuk mengubah video pendek menjadi Gaussian Splat (.spz) di Penampil.',
      href: 'https://github.com/yohn-maistre/etnos/tree/main/packages/splat-worker',
      label: 'Kode pekerja 3D',
    },
  ]
  const next = [
    'Pemindahan akun antar server AT Protocol dan cadangan berkala yang bisa diunduh sendiri oleh pemilik akun.',
    'Ruang berdampingan bagi dua catatan yang berbeda saat komunitas mengingat sebuah peristiwa dengan versi masing-masing.',
    'Penerapan ETNOS mandiri oleh komunitas di wilayah lain dengan satu berkas etnos.yaml.',
  ]
  type Family = { key: string; title: string; basis: string; sources: { title: string; url: string }[] }
  let families = $state<Family[]>([])
  $effect(() => {
    const abort = new AbortController()
    request<{ families?: Family[] }>('/v1/contexts/catalogue', undefined, abort.signal, true)
      .then((r) => (families = r.families ?? []))
      .catch(() => {})
    return () => abort.abort()
  })
  const references = [
    {
      why: 'Pertanyaan siapa, apa, di mana, kapan dan dengan cara apa tentang sebuah perbuatan, yang kemudian dipakai dalam retorika dan jurnalistik.',
      cite: 'Aristoteles, Etika Nikomakea III.1, dirangkum dalam "Five Ws" (Wikipedia)',
      href: 'https://en.wikipedia.org/wiki/Five_Ws',
    },
    {
      why: 'Penggolongan berfaset: satu hal dilihat dari beberapa sisi, tanpa satu pohon induk.',
      cite: 'Ranganathan (1933), Colon Classification, Madras Library Association',
      href: 'https://en.wikipedia.org/wiki/Colon_classification',
    },
    {
      why: 'Standar metadata yang mencatat subjek, bahasa, cakupan tempat dan waktu, serta jenis sebuah sumber.',
      cite: 'DCMI, Dublin Core Metadata Terms (ISO 15836)',
      href: 'https://www.dublincore.org/specifications/dublin-core/dcmi-terms/',
    },
    {
      why: 'Bahasa dicatat sendiri, terpisah dari wilayah, karena satu bahasa dipakai di banyak tempat.',
      cite: 'Glottolog, katalog bahasa dunia',
      href: 'https://glottolog.org/',
    },
    {
      why: 'Label disimpan sebagai skema konsep yang bisa dipetakan ke skema lain.',
      cite: 'W3C (2009), SKOS Simple Knowledge Organization System Reference',
      href: 'https://www.w3.org/TR/skos-reference/',
    },
    {
      why: 'Skema baku sering salah menamai pengetahuan masyarakat adat. Komunitas menamai dirinya sendiri.',
      cite: 'Duarte & Belarde-Lewis (2015), Imagining: Creating Spaces for Indigenous Ontologies, Cataloging & Classification Quarterly 53(5-6)',
      href: 'https://doi.org/10.1080/01639374.2015.1018396',
    },
    {
      why: 'Data tentang masyarakat adat diatur untuk manfaat bersama dan atas wewenang mereka.',
      cite: 'Carroll dkk. (2020), The CARE Principles for Indigenous Data Governance, Data Science Journal 19',
      href: 'https://doi.org/10.5334/dsj-2020-043',
    },
    {
      why: 'Label pengetahuan tradisional yang dipasang komunitas sendiri, termasuk untuk marga dan keluarga.',
      cite: 'Local Contexts, Traditional Knowledge Labels',
      href: 'https://localcontexts.org/labels/traditional-knowledge-labels/',
    },
    {
      why: 'Arsip warisan budaya yang aksesnya diatur oleh protokol komunitas.',
      cite: 'Mukurtu CMS',
      href: 'https://mukurtu.org/about/',
    },
    {
      why: 'Musyawarah daring yang mencari pernyataan yang diterima semua kelompok.',
      cite: 'Small dkk. (2021), Polis: Scaling Deliberation by Mapping High Dimensional Opinion Spaces, Recerca 26(2)',
      href: 'https://doi.org/10.6035/recerca.5516',
    },
  ]
  const principles = [
    'Manusia yang memutuskan. Aksara menyusun draf, merangkum, dan bertanya. Pengurus dapat menerima, memperbaiki atau mengembalikan setiap perubahan wiki.',
    'Setiap tindakan AI diberi label, dibatasi, dan dicatat secara terbuka.',
    'Sumber mendapat kredit. Sumber yang hanya dibagikan sebagai judul tetap hanya judul.',
    'Yang privat tetap privat, termasuk jumlah, hasil pencarian, cache publik, dan saran yang dibuat dari isi privat.',
    'Istilah lokal dan nama akun dibiarkan apa adanya. Perbedaan pendapat boleh dicatat.',
    'Semuanya berfungsi saat AI dimatikan.',
  ]
  const lineage = [
    { when: '2023', text: 'Gagasan dan nama.' },
    {
      when: 'Maret 2025',
      text: 'Saireri ETNOS, percobaan forum komunitas di fediverse dengan klien web berbasis Photon.',
      href: 'https://github.com/yohn-maistre/saireri-etnos',
    },
    {
      when: 'Maret 2026',
      text: 'Honai Metro, klien PieFed bertema Papua yang dicabangkan dari Photon.',
      href: 'https://github.com/yohn-maistre/honai-metro',
    },
    {
      when: 'Oktober 2026',
      text: 'ETNOS dibangun ulang di atas AT Protocol. Akun kini milik penggunanya dan bisa dibawa ke mana saja.',
    },
  ]
</script>

<article class="about-page">
  <header>
    <h1>Ruang bersama untuk pengetahuan Papua</h1>
    <p>
      ETNOS adalah ruang digital tempat orang dan lembaga di Tanah Papua berbincang, membaca
      kabar, dan menyusun kamus serta ensiklopedia bersama. Halaman ini mencatat fitur yang
      sudah berjalan hari ini.
    </p>
  </header>

  <section aria-labelledby="about-live">
    <h2 id="about-live">Sudah berjalan</h2>
    <ul>{#each live as item}<li>{item}</li>{/each}</ul>
  </section>

  <section aria-labelledby="about-testing">
    <h2 id="about-testing">Sedang diuji</h2>
    <ul>{#each testing as item}<li>{item}</li>{/each}</ul>
  </section>

  <section aria-labelledby="about-lab">
    <h2 id="about-lab">Di laboratorium</h2>
    <ul>
      {#each lab as item}<li>
          {item.text}
          <a href={item.href} target="_blank" rel="noreferrer">
            {item.label}<ArrowUpRight size={13} />
          </a>
        </li>{/each}
    </ul>
    <p class="about-note">
      Komunitas privat selalu disimpan dengan pemeriksaan akses di server ETNOS. Jembatan AT Protocol Spaces bersifat tambahan dan mencabut izin secara otomatis saat anggota keluar.
    </p>
  </section>

  <section aria-labelledby="about-next">
    <h2 id="about-next">Berikutnya</h2>
    <ul>{#each next as item}<li>{item}</li>{/each}</ul>
  </section>

  <section aria-labelledby="about-principles">
    <h2 id="about-principles">Prinsip</h2>
    <ol>{#each principles as item}<li>{item}</li>{/each}</ol>
  </section>

  <section aria-labelledby="about-basis">
    <h2 id="about-basis">Dasar penggolongan</h2>
    <p>
      Label di ETNOS adalah faset, yaitu tempat, bahasa, topik dan jenis.
      Sebuah kiriman, halaman atau komunitas boleh membawa beberapa sekaligus.
      Label tidak pernah dipasang pada orang. Daftarnya bisa bertambah, berubah
      dan dipensiunkan seiring apa yang dibicarakan.
    </p>
    <h3 id="about-axes">Mengapa tempat, bahasa, topik dan jenis</h3>
    <p>
      Keempatnya menjawab pertanyaan lama tentang pengetahuan apa pun, yaitu di
      mana, dalam bahasa apa, tentang apa, dan berupa apa. Waktu dicatat
      tersendiri sebagai tanggal atau rentang tahun. Daftar pendek yang mirip
      muncul di beberapa bidang yang berkembang sendiri-sendiri, dari tulisan
      Aristoteles tentang keadaan sebuah perbuatan, penggolongan berfaset
      Ranganathan di perpustakaan, sampai standar metadata Dublin Core.
    </p>
    <p>
      Sumbunya tetap dan isinya milik komunitas. Tempat, bahasa dan daftar topik
      di ETNOS diisi untuk Tanah Papua dan bisa diubah. Bahasa berdiri sendiri,
      terpisah dari tempat, karena satu bahasa dipakai di banyak tempat dan satu
      tempat punya banyak bahasa. Siapa yang boleh melihat sebuah pengetahuan dan
      siapa pemegangnya diatur oleh komunitas di lapisan yang terpisah, seperti
      pada Local Contexts dan Mukurtu. Karena itu marga dan keturunan tidak
      dijadikan label.
    </p>
    <p>
      Daftar pendek itu tidak mencakup dua hal. Yang pertama adalah waktu
      musiman yang berulang setiap tahun. Setiap komunitas bisa menamai musimnya
      sendiri, dan kiriman bisa ditandai dengan musim itu. Yang kedua adalah gunung,
      danau, sungai, hutan dan makhluk hidup yang punya nama. Semuanya mendapat
      halaman wiki sendiri di bawah wilayahnya, lengkap dengan sumber.
    </p>
    {#if families.length}<ul class="about-basis">
        {#each families as f (f.key)}<li>
            <strong>{f.title}</strong>
            <span>{f.basis}</span>
            {#each f.sources as src (src.url)}<a href={src.url} target="_blank" rel="noreferrer">{src.title}</a>{/each}
          </li>{/each}
      </ul>{/if}
    <p>Gagasan berikut menjadi acuan kami.</p>
    <ul class="about-basis">
      {#each references as r (r.href)}<li>
          <span>{r.why}</span>
          <a href={r.href} target="_blank" rel="noreferrer">{r.cite}</a>
        </li>{/each}
    </ul>
  </section>

  <section aria-labelledby="about-origin">
    <h2 id="about-origin">Asal-usul</h2>
    <p>
      <a href="https://github.com/yohn-maistre/etnos" target="_blank" rel="noreferrer">Kode ETNOS</a>
      terbuka dengan lisensi AGPL-3.0. Komunitas lain bisa memakainya untuk
      wilayahnya sendiri.
    </p>
    <p>ETNOS sudah tumbuh beberapa tahun. Versi sekarang adalah babak terbarunya.</p>
    <ul class="about-lineage">
      {#each lineage as step}<li>
          <strong>{step.when}</strong>
          {#if step.href}<a href={step.href} target="_blank" rel="noreferrer">
              {step.text}
            </a>{:else}<span>{step.text}</span>{/if}
        </li>{/each}
    </ul>
    <p>
      Komunitas, wiki, dan tampilan Papua-nya tetap sama. Terima kasih kepada
      proyek
      <a href="https://github.com/Xyphyn/photon" target="_blank" rel="noreferrer"
        >Photon</a
      >
      dan
      <a href="https://codeberg.org/rimu/pyfedi" target="_blank" rel="noreferrer"
        >PieFed</a
      >
      yang menjadi pijakan kami.
    </p>
  </section>

  <p class="about-source">
    <a
      href="https://github.com/yohn-maistre/etnos"
      target="_blank"
      rel="noreferrer"
    >
      Kode sumber di GitHub <ArrowUpRight size={14} />
    </a>
  </p>
</article>

<style>
  .about-page {
    max-width: 680px;
    padding: 28px 24px 56px;
    overflow-wrap: anywhere;
  }
  .about-page h1 {
    font-family: var(--font-editorial);
    font-weight: 400;
    font-size: clamp(28px, 4vw, 38px);
    letter-spacing: -0.025em;
    line-height: 1.12;
    text-wrap: balance;
    margin: 0 0 14px;
  }
  header p {
    font-size: 16px;
    line-height: 1.65;
    color: var(--muted-foreground);
  }
  section {
    margin-top: 32px;
    padding-top: 24px;
    border-top: 1px solid var(--reading-line, var(--border));
  }
  h2 {
    font-family: var(--font-editorial);
    font-weight: 400;
    font-size: 22px;
    letter-spacing: -0.02em;
    margin-bottom: 12px;
  }
  h3 {
    font-size: 16px;
    font-weight: 600;
    margin: 22px 0 8px;
  }
  section p + p {
    margin-top: 10px;
  }
  ul,
  ol {
    display: grid;
    gap: 8px;
    padding-left: 20px;
    font-size: 15px;
    line-height: 1.6;
  }
  ul {
    list-style: disc;
  }
  ol {
    list-style: decimal;
  }
  li::marker {
    color: var(--muted-foreground);
  }
  a {
    color: var(--brand);
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  li a {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    margin-left: 4px;
  }
  .about-basis { list-style: none; padding: 0; display: grid; gap: 12px; }
  .about-basis li { display: grid; gap: 2px; font-size: 14px; line-height: 1.55; }
  .about-basis span { color: var(--muted-foreground); }
  .about-basis a { font-size: 13px; text-decoration: underline; text-underline-offset: 3px; overflow-wrap: anywhere; }
  .about-lineage strong {
    margin-right: 6px;
  }
  section > p {
    margin-top: 12px;
    font-size: 15px;
    line-height: 1.65;
    color: var(--muted-foreground);
  }
  .about-source {
    margin-top: 32px;
    font-size: 15px;
  }
  .about-source a {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  @media (max-width: 640px) {
    .about-page {
      padding: 24px 16px 48px;
    }
  }
</style>
