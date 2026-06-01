import { Router } from "express";
import { getDb } from "../../init/db";
import { Server as SocketIOServer } from "socket.io";

export const tezyozRouter = Router();

// ─── FOYDALANUVCHI ───────────────────────────────────────────────────────────

tezyozRouter.post("/user", async (req, res) => {
  try {
    const { userId, name } = req.body;
    if (!userId || !name) return res.status(400).json({ message: "userId va name kerak" });
    const db = getDb();
    await db.collection("tezyoz_users").updateOne(
      { userId },
      { $set: { userId, name, updatedAt: new Date() } },
      { upsert: true }
    );
    res.json({ ok: true, name });
  } catch (e) { res.status(500).json({ message: "Xato" }); }
});

tezyozRouter.get("/user/:userId", async (req, res) => {
  try {
    const db = getDb();
    const user = await db.collection("tezyoz_users").findOne({ userId: req.params.userId });
    if (!user) return res.status(404).json({ message: "Topilmadi" });
    res.json({ name: user.name });
  } catch (e) { res.status(500).json({ message: "Xato" }); }
});

// ─── NATIJA SAQLASH ──────────────────────────────────────────────────────────

tezyozRouter.post("/result", async (req, res) => {
  try {
    const { userId, name, wpm, accuracy } = req.body;
    if (!userId || !name || !wpm || accuracy === undefined)
      return res.status(400).json({ message: "Ma'lumotlar yetarli emas" });
    const db = getDb();
    await db.collection("tezyoz_results").insertOne({
      userId, name,
      wpm: Math.round(wpm),
      accuracy: Math.round(accuracy),
      createdAt: new Date(),
    });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ message: "Xato" }); }
});

// ─── REYTING ─────────────────────────────────────────────────────────────────

// Eng tez yozuvchilar
tezyozRouter.get("/leaderboard/speed", async (_req, res) => {
  try {
    const db = getDb();
    const results = await db.collection("tezyoz_results").aggregate([
      { $sort: { wpm: -1 } },
      { $group: { _id: "$userId", name: { $first: "$name" }, wpm: { $max: "$wpm" }, accuracy: { $first: "$accuracy" } } },
      { $sort: { wpm: -1 } },
      { $limit: 50 },
      { $project: { _id: 0, userId: "$_id", name: 1, wpm: 1, accuracy: 1 } },
    ]).toArray();
    res.json(results);
  } catch (e) { res.status(500).json({ message: "Xato" }); }
});

// Eng xatosiz yozuvchilar
tezyozRouter.get("/leaderboard/accuracy", async (_req, res) => {
  try {
    const db = getDb();
    const results = await db.collection("tezyoz_results").aggregate([
      { $match: { wpm: { $gte: 30 } } },
      { $sort: { accuracy: -1, wpm: -1 } },
      { $group: { _id: "$userId", name: { $first: "$name" }, accuracy: { $max: "$accuracy" }, wpm: { $first: "$wpm" } } },
      { $sort: { accuracy: -1, wpm: -1 } },
      { $limit: 50 },
      { $project: { _id: 0, userId: "$_id", name: 1, accuracy: 1, wpm: 1 } },
    ]).toArray();
    res.json(results);
  } catch (e) { res.status(500).json({ message: "Xato" }); }
});

// ─── BATTLE ──────────────────────────────────────────────────────────────────

const texts = [
  "Hayot qisqa, lekin uni to'g'ri yashash uchun ko'p narsani o'rganish kerak. Har bir kun yangi imkoniyat bilan boshlanadi.",
  "O'zbekiston go'zal tabiatga ega mamlakat. Tog'lar, daryolar va tekisliklar bu yerda uyg'un birlashgan.",
  "Kitob o'qish aqlni rivojlantiradi va dunyoqarashni kengaytiradi. Har kuni bir sahifa o'qish odatiga ega bo'ling.",
  "Texnologiya hayotimizni osonlashtirdi. Kompyuter va internet orqali dunyo bilan bog'lanish imkoniyati bor.",
  "Sport salomatlik uchun juda muhim. Har kuni yurish yoki yugurish organizmga foydali ta'sir ko'rsatadi.",
  "Do'stlik hayotning eng qimmatli ne'matidir. Chin do'st qiyin kunlarda yoningda bo'ladi.",
];
function getRandomText(): string { return texts[Math.floor(Math.random() * texts.length)] as string; }

tezyozRouter.post("/battle/create", async (req, res) => {
  try {
    const { userId, name } = req.body;
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const db = getDb();
    await db.collection("tezyoz_battles").insertOne({
      roomId, host: { userId, name }, guest: null,
      status: "waiting", text: getRandomText(),
      hostProgress: 0, guestProgress: 0,
      hostWpm: 0, guestWpm: 0, winner: null,
      createdAt: new Date(),
    });
    res.json({ roomId });
  } catch (e) { res.status(500).json({ message: "Xato" }); }
});

tezyozRouter.get("/battle/:roomId", async (req, res) => {
  try {
    const db = getDb();
    const battle = await db.collection("tezyoz_battles").findOne({ roomId: req.params.roomId });
    if (!battle) return res.status(404).json({ message: "Xona topilmadi" });
    res.json(battle);
  } catch (e) { res.status(500).json({ message: "Xato" }); }
});

tezyozRouter.post("/battle/:roomId/join", async (req, res) => {
  try {
    const { userId, name } = req.body;
    const db = getDb();
    const battle = await db.collection("tezyoz_battles").findOne({ roomId: req.params.roomId });
    if (!battle) return res.status(404).json({ message: "Xona topilmadi" });
    if (battle.status !== "waiting") return res.status(400).json({ message: "Xona band" });
    await db.collection("tezyoz_battles").updateOne(
      { roomId: req.params.roomId },
      { $set: { guest: { userId, name }, status: "ready" } }
    );
    res.json({ ok: true, text: battle.text });
  } catch (e) { res.status(500).json({ message: "Xato" }); }
});

// Socket.IO battle handler
export function setupBattleSocket(io: SocketIOServer): void {
  const rooms: Record<string, { host?: string; guest?: string }> = {};

  io.on("connection", (socket) => {
    socket.on("joinRoom", ({ roomId, role }: { roomId: string; role: "host" | "guest" }) => {
      socket.join(roomId);
      if (!rooms[roomId]) rooms[roomId] = {};
      rooms[roomId][role] = socket.id;
      if (rooms[roomId].host && rooms[roomId].guest) {
        io.to(roomId).emit("battleStart", { countdown: 3 });
      }
    });

    socket.on("progress", ({ roomId, progress, wpm }: { roomId: string; progress: number; wpm: number }) => {
      socket.to(roomId).emit("opponentProgress", { progress, wpm });
    });

    socket.on("finished", async ({ roomId, role, wpm, accuracy }: { roomId: string; role: string; wpm: number; accuracy: number }) => {
      try {
        const db = getDb();
        const battle = await db.collection("tezyoz_battles").findOne({ roomId });
        if (battle?.status !== "finished") {
          await db.collection("tezyoz_battles").updateOne(
            { roomId },
            { $set: { status: "finished", winner: role, [`${role}Wpm`]: wpm, [`${role}Accuracy`]: accuracy, finishedAt: new Date() } }
          );
          io.to(roomId).emit("battleEnd", { winner: role, wpm, accuracy });
        }
      } catch (e) { console.error("Battle finish error:", e); }
    });

    socket.on("disconnect", () => {
      for (const roomId in rooms) {
        const r = rooms[roomId];
        if (r?.host === socket.id || r?.guest === socket.id) {
          io.to(roomId).emit("opponentLeft");
          delete rooms[roomId];
        }
      }
    });
  });
}
