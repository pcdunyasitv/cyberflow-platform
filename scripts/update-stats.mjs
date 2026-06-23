import {readFile, writeFile} from "node:fs/promises";

const endpoint = process.env.CYBERFLOW_STATS_ENDPOINT;

if (!endpoint) {
  throw new Error("CYBERFLOW_STATS_ENDPOINT tanımlı değil.");
}

const response = await fetch(endpoint, {
  headers: {"User-Agent": "CyberFlow-GitHub-Stats/1.0"},
});

if (!response.ok) {
  throw new Error(`İstatistik isteği başarısız: HTTP ${response.status}`);
}

const payload = await response.json();

if (!payload.success || !payload.stats) {
  throw new Error("Endpoint geçerli istatistik verisi döndürmedi.");
}

const stats = payload.stats;
const requiredNumbers = [
  "users",
  "learningContent",
  "completedLearning",
  "cves",
  "courses",
  "careers",
];

for (const key of requiredNumbers) {
  if (!Number.isFinite(stats[key]) || stats[key] < 0) {
    throw new Error(`Geçersiz istatistik alanı: ${key}`);
  }
}

const formatNumber = (value) =>
  new Intl.NumberFormat("tr-TR").format(value || 0);

const formatDate = (value) => {
  const date = value ? new Date(value) : new Date();
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Istanbul",
  }).format(date);
};

const content = stats.contentBreakdown || {};
const completions = stats.completionBreakdown || {};
const block = `<!-- CYBERFLOW_STATS_START -->

> İstatistikler ${formatDate(stats.updatedAtIso)} tarihinde Firestore üzerinden anonim ve toplu
> olarak güncellenmiştir.

|  | Güncel değer |
|---|---:|
| 👥 Kayıtlı kullanıcı | **${formatNumber(stats.users)}** |
| 🧠 Öğrenme içeriği | **${formatNumber(stats.learningContent)}** |
| ✅ Tamamlanan öğrenme etkinliği | **${formatNumber(stats.completedLearning)}** |
| 🛡️ CVE kaydı | **${formatNumber(stats.cves)}** |
| 🎓 Kurs | **${formatNumber(stats.courses)}** |
| 🧭 Kariyer yolu | **${formatNumber(stats.careers)}** |

### İçerik dağılımı

| Eğitim | Blog | Video | Test | CTF |
|---:|---:|---:|---:|---:|
| ${formatNumber(content.lessons)} | ${formatNumber(content.blogs)} | ${formatNumber(content.videos)} | ${formatNumber(content.tests)} | ${formatNumber(content.ctfs)} |

### Topluluk etkinliği

| Tamamlanan eğitim | Blog | Video | Test | CTF |
|---:|---:|---:|---:|---:|
| ${formatNumber(completions.lessons)} | ${formatNumber(completions.blogs)} | ${formatNumber(completions.videos)} | ${formatNumber(completions.tests)} | ${formatNumber(completions.ctfs)} |

<!-- CYBERFLOW_STATS_END -->`;

const readme = await readFile("README.md", "utf8");
const startMarker = "<!-- CYBERFLOW_STATS_START -->";
const endMarker = "<!-- CYBERFLOW_STATS_END -->";
const startIndex = readme.indexOf(startMarker);
const endIndex = readme.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
  throw new Error("README istatistik işaretleri bulunamadı.");
}

const updatedReadme =
  readme.slice(0, startIndex) +
  block +
  readme.slice(endIndex + endMarker.length);

await writeFile("README.md", updatedReadme, "utf8");
await writeFile(
  "data/public-stats.json",
  `${JSON.stringify(stats, null, 2)}\n`,
  "utf8"
);

console.log("CyberFlow GitHub istatistikleri güncellendi.");
