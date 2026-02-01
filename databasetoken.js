const DATABASE_CONFIG = {
  user: "saurusrawr",
  repo: "dbsaurus",
  branch: "main",
  tokenDB: "database.json",
  authDB: "password.json"
};

function maskToken(token) {
  if (!token.includes(":")) return "*****";
  const [a, b] = token.split(":");
  return a.slice(0, 3) + "*".repeat(Math.max(a.length - 3, 3)) + ":" + b.slice(0, 1) + "*".repeat(Math.max(b.length - 1, 4));
}

function typingMessage(text, delay = 50) {
  return new Promise(resolve => {
    let i = 0;
    const interval = setInterval(() => {
      process.stdout.write(text[i]);
      i++;
      if (i >= text.length) {
        clearInterval(interval);
        process.stdout.write("\n");
        resolve();
      }
    }, delay);
  });
}

async function fetchDatabase(file) {
  const url = `https://raw.githubusercontent.com/${DATABASE_CONFIG.user}/${DATABASE_CONFIG.repo}/${DATABASE_CONFIG.branch}/${file}`;
  try {
    console.log(chalk.cyan("◈ Menghubungkan ke database..."));
    const res = await axios.get(url, { timeout: 10000 });
    if (res.status === 200) {
      console.log(chalk.green("✔ Database berhasil diakses!"));
      return typeof res.data === "string" ? JSON.parse(res.data) : res.data;
    }
    throw new Error("Response database invalid");
  } catch (err) {
    console.log(chalk.red("✖ Gagal mengakses database"));
    console.log(chalk.gray("⚠", err.message));
    return null;
  }
}

async function fetchTokens(link) {
  try {
    console.log(chalk.cyan("🔄 Memuat Data Token...\n"));
    console.log(chalk.gray("Sistem sedang membaca database."));
    console.log(chalk.gray("Harap tunggu.\n"));

    const res = await axios.get(link, { timeout: 10000 });
    const data = typeof res.data === "string" ? JSON.parse(res.data) : res.data;

    if (!data.tokens || !Array.isArray(data.tokens)) throw new Error("Format token salah");

    const validTokens = data.tokens.filter(t => t.trim());
    
    console.log(chalk.greenBright("🧬 TOKEN DETECTED\n"));
    console.log(chalk.greenBright(`${validTokens.length} active token${validTokens.length > 1 ? 's' : ''} found in database.\n`));

    return validTokens;

  } catch (err) {
    console.log(chalk.redBright("❌ Gagal memuat token!"));
    console.log(chalk.gray(`⚠ Error: ${err.message}`));
    return [];
  }
}

async function validateAccess() {
  const auth = await fetchDatabase(DATABASE_CONFIG.authDB);
  if (!auth?.password) {
    console.log(chalk.red("🚫 Sistem diblokir! Akses ditolak."));
    process.exit(1);
  }

  const maxAttempts = 2;
  let attempts = 1;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const askPassword = () => {
    return new Promise(resolve => {
      console.log(chalk.blueBright("🔐 Verifikasi Keamanan"));
      console.log(chalk.yellow("Silakan masukkan password."));
      console.log(chalk.gray(`Anda memiliki ${maxAttempts - attempts} kesempatan sebelum akses dikunci.`));

      rl.question("💬 ", input => {
        const inHash = crypto.createHash("sha256").update(input).digest("hex");
        const dbHash = crypto.createHash("sha256").update(auth.password).digest("hex");

        if (inHash === dbHash) {
          // Password benar
          console.log(chalk.greenBright(`
🟢 AUTH SUCCESS
Password accepted.
System access granted.
          `));
          resolve(true);
        } else {
          attempts++;
          if (attempts < maxAttempts) {
          
            console.log(chalk.redBright(`
⚠️ VERIFIKASI DITOLAK
Password tidak cocok.
Sistem masih memberi ${maxAttempts - attempts} kesempatan terakhir.
Gunakan dengan benar.
            `));
            resolve(false); 
          } else if (attempts === maxAttempts) {
            
            console.log(chalk.redBright(`
⚠️ AUTH FAILED
Invalid password detected.
Final attempt remaining.
            `));
            resolve(false);
          } else {
            
            console.log(chalk.redBright(`
🚨 PELANGGARAN AKSES
Password salah.
Kesempatan HABIS.
Sistem mengunci akses secara otomatis.
            `));
            rl.close();
            process.exit(1);
          }
        }
      });
    });
  };

  let success = false;
  while (!success && attempts <= maxAttempts) {
    success = await askPassword();
  }

  rl.close();
  return success;
}

async function bootSystem() {
  console.clear();
  await typingMessage("Memulai sistem...", 50);
  await sleep(500);

  const db = await fetchDatabase(DATABASE_CONFIG.tokenDB);
  if (!db?.databaseLink) {
    console.log("❌ Database inti tidak ditemukan!");
    process.exit(1);
  }

  const validTokens = await fetchTokens(db.databaseLink);
  if (!validTokens.length) {
    console.log("⚠️ Tidak ada token aktif!");
    process.exit(1);
  }

  if (!validTokens.includes(settings.token)) {
    console.log("🚫 Token tidak valid!");
    console.log("🔑 Token kamu:", maskToken(settings.token));
    console.log("📄 Token terdaftar:");
    validTokens.forEach((t, i) => console.log(`   • ${i + 1}. ${maskToken(t)}`));
    process.exit(1);
  }

  console.log("✅ Token valid! Sistem siap digunakan ⚡");
  console.log("─────────────────────────────");
  await runBot(bot);
}

async function runBot(botInstance) {
  console.clear();
  const me = await botInstance.getMe();

  console.log(chalk.magenta("◈ ───── Bot Info ───── ◈"));
  console.log(chalk.white("◈ Bot    :"), chalk.cyan(`@${me.username}`));
  console.log(chalk.white("◈ Owner  :"), chalk.yellow("@lordsaurus"));
  console.log(chalk.white("◈ Status :"), chalk.green("RUNNING"));
  console.log(chalk.magenta("◈ ─────────────────── ◈"));
  console.log(chalk.white("◈ Type a Command..."));
}

async function initializeBot() {
  console.clear();
  console.log(chalk.blue('System startup in progress'));

  console.log(chalk.gray('┌─ Step 1: Authentication'));
  const hasAccess = await validateAccess();
  if (!hasAccess) {
    console.log(chalk.red('❌  Autentikasi gagal!'));
    process.exit(1);
  }
  console.log(chalk.green('✅  Authorization successful'));

  console.log(chalk.gray('Checking access token...'));
  await bootSystem(bot); 
  await loadAllPlugins();
  console.log("🎉 Semua plugin berhasil dimuat");

  console.log(chalk.gray('┌─ Step 2: Load all Roles'));
  await loadRoles();

  console.log(chalk.green('🎉 Bot berhasil dijalankan!'));
}

initializeBot().catch(err => {
  console.log(chalk.red("❌ FATAL ERROR:"), err);
});
module.exports = { initializeBot };
