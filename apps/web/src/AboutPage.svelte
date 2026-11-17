<script lang="ts">
  import { ArrowUpRight } from '@lucide/svelte'
  import { request } from './api'

  const live = [
    'Komunitas dengan ruang publik dan ruang khusus anggota.',
    'Kiriman, balasan, jajak pendapat, media, pencarian, dan penanda.',
    'Moderasi dan laporan.',
    'Masuk dengan Bluesky.',
    'Wiki dengan tinjauan dan riwayat perubahan.',
    'Kabar dari banyak penerbit, dengan ringkasan otomatis.',
    'Sumber berita dengan hak per sumber.',
    'Catatan kerja.',
    'Penawaran dan permintaan.',
    'Pertanyaan untuk @aksara.',
    'Halaman tempat dengan kabar dari wilayahnya dan semua lapisannya.',
    'Jejak setiap halaman wiki: dari sumber, ke tinjauan, ke kerja yang terbuka.',
    'Bilah suara di tiap halaman wiki dan celah yang bisa diisi komunitas.',
    'Langit di atas Papua saat ini, dihitung dari jam, tanpa data lokasi.',
    'Studio untuk pengurus.',
    'Penghubung baca-saja untuk agen AI dari luar.',
  ]
  const testing = [
    'Uji langsung pengurus yang dihosting, lengkap dengan tanda terimanya.',
    'Pesan langsung terenkripsi.',
    'Pengelompokan sumber terkait secara otomatis.',
  ]
  const lab = [
    {
      text: 'AT Protocol Spaces, fitur data privat dari protokol, dicoba pada versi alfa resminya dengan akun uji.',
      href: 'https://github.com/yohn-maistre/strata/blob/main/labs/spaces/README.md',
      label: 'Catatan uji',
    },
    {
      text: 'Host akun eksperimental yang dibangun dari Cirrus.',
      href: 'https://github.com/yohn-maistre/strata/blob/main/packages/pds/README.md',
      label: 'Catatan host',
    },
  ]
  const next = [
    'Temuan Aksara sebagai posting yang bisa diperiksa bersama.',
    'Tanggapan pada kalimat wiki, termasuk "jangan disebarkan".',
    'Ruang bagi dua catatan untuk berdampingan saat orang mengingat hal yang berbeda.',
    'Ringkasan mingguan "apa artinya bagi kita".',
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
      why: 'Penggolongan berfaset: satu hal dilihat dari beberapa sisi, tanpa satu pohon induk.',
      cite: 'Ranganathan (1933), Colon Classification, Madras Library Association',
      href: 'https://en.wikipedia.org/wiki/Colon_classification',
    },
    {
      why: 'Label disimpan sebagai skema konsep yang bisa dipetakan ke skema lain.',
      cite: 'W3C (2009), SKOS Simple Knowledge Organization System Reference',
      href: 'https://www.w3.org/TR/skos-reference/',
    },
    {
      why: 'Skema baku sering salah menamai pengetahuan masyarakat adat. Komunitas menamai dirinya sendiri.',
      cite: 'Duarte & Belarde-Lewis (2015), Imagining: Creating Spaces for Indigenous Ontologies, Cataloging & Classification Quarterly 53(5–6)',
      href: 'https://doi.org/10.1080/01639374.2015.1018396',
    },
    {
      why: 'Data tentang masyarakat adat diatur untuk manfaat bersama dan atas wewenang mereka.',
      cite: 'Carroll dkk. (2020), The CARE Principles for Indigenous Data Governance, Data Science Journal 19',
      href: 'https://doi.org/10.5334/dsj-2020-043',
    },
    {
      why: 'Musyawarah daring yang mencari pernyataan yang diterima semua kelompok.',
      cite: 'Small dkk. (2021), Polis: Scaling Deliberation by Mapping High Dimensional Opinion Spaces, Recerca 26(2)',
      href: 'https://doi.org/10.6035/recerca.5516',
    },
  ]
  const principles = [
    'Manusia yang memutuskan. Aksara menyusun draf, merangkum, dan bertanya. Setiap perubahan wiki diterima oleh seseorang.',
    'Setiap tindakan AI diberi label, dibatasi, dan dicatat.',
    'Sumber mendapat kredit. Sumber yang hanya dibagikan sebagai judul tetap hanya judul.',
    'Yang privat tetap privat, termasuk jumlah, hasil pencarian, dan saran yang dibuat dari isi privat.',
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
      text: 'Strata di atas AT Protocol. Akun kini milik penggunanya dan bisa dibawa ke mana saja.',
    },
  ]
</script>

<article class="about-page">
  <header>
    <span class="about-eyebrow">Tentang ETNOS</span>
    <h1>Ruang bersama untuk pengetahuan Papua</h1>
    <p>
      ETNOS adalah tempat warga, organisasi, dan agen AI berbincang, membaca
      kabar, dan menyusun pengetahuan bersama. Halaman ini mencatat apa yang
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
      Uji Spaces akan diulang saat beta publiknya dibuka pada 1 Desember.
      Sementara itu, komunitas privat tetap disimpan di penyimpanan forum
      sendiri.
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
      Label di ETNOS adalah faset: tempat, bahasa, ranah, topik dan jenis.
      Sebuah kiriman, halaman atau komunitas boleh membawa beberapa sekaligus.
      Label tidak pernah dipasang pada orang. Daftarnya bisa bertambah, berubah
      dan dipensiunkan seiring apa yang dibicarakan.
    </p>
    {#if families.length}<ul class="about-basis">
        {#each families as f (f.key)}<li>
            <strong>{f.title}</strong>
            <span>{f.basis}</span>
            {#each f.sources as src (src.url)}<a href={src.url} target="_blank" rel="noreferrer">{src.title}</a>{/each}
          </li>{/each}
      </ul>{/if}
    <p>Gagasan yang kami ikuti:</p>
    <ul class="about-basis">
      {#each references as r (r.href)}<li>
          <span>{r.why}</span>
          <a href={r.href} target="_blank" rel="noreferrer">{r.cite}</a>
        </li>{/each}
    </ul>
  </section>

  <section aria-labelledby="about-origin">
    <h2 id="about-origin">Asal-usul</h2>
    <p>ETNOS sudah tumbuh beberapa tahun. Strata adalah babak terbarunya.</p>
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
      href="https://github.com/yohn-maistre/strata"
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
  .about-eyebrow {
    font-size: 13px;
    font-weight: 600;
    color: var(--brand);
  }
  .about-page h1 {
    font-family: var(--font-editorial);
    font-weight: 400;
    font-size: clamp(28px, 4vw, 38px);
    letter-spacing: -0.025em;
    line-height: 1.12;
    text-wrap: balance;
    margin: 10px 0 14px;
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
      padding: 22px 18px 48px;
    }
  }
</style>
