import prisma from "../utils/prisma.js";

export async function getMe(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, createdAt: true },
    });

    if (!user) return res.status(404).json({ error: "User not found." });

    return res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}

export async function getUserData(req, res, next) {
  try {
    const rows = await prisma.userData.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
    });

    const items = rows.map((r) => ({
      id: r.id,
      key: r.key,
      value: parseJsonSafe(r.value),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    return res.status(200).json({ items });
  } catch (err) {
    next(err);
  }
}

export async function createUserData(req, res, next) {
  try {
    const { key, value } = req.body;

    if (!key || typeof key !== "string" || key.trim() === "") {
      return res.status(400).json({ error: '"key" must be a non-empty string.' });
    }
    if (value === undefined) {
      return res.status(400).json({ error: '"value" is required.' });
    }

    const item = await prisma.userData.upsert({
      where: { userId_key: { userId: req.user.id, key: key.trim() } },
      create: {
        key: key.trim(),
        value: JSON.stringify(value),
        userId: req.user.id,
      },
      update: {
        value: JSON.stringify(value),
      },
    });

    return res.status(201).json({
      item: { id: item.id, key: item.key, value: parseJsonSafe(item.value) },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateUserData(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID." });

    const { key, value } = req.body;
    if (value === undefined && (!key || typeof key !== "string")) {
      return res.status(400).json({ error: "Provide at least one of: key, value." });
    }

    const existing = await prisma.userData.findFirst({
      where: { id, userId: req.user.id },
    });
    if (!existing) {
      return res.status(404).json({ error: "Item not found or access denied." });
    }

    const updated = await prisma.userData.update({
      where: { id },
      data: {
        ...(key && { key: key.trim() }),
        ...(value !== undefined && { value: JSON.stringify(value) }),
      },
    });

    return res.status(200).json({
      item: { id: updated.id, key: updated.key, value: parseJsonSafe(updated.value) },
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteUserData(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID." });

    const existing = await prisma.userData.findFirst({
      where: { id, userId: req.user.id },
    });
    if (!existing) {
      return res.status(404).json({ error: "Item not found or access denied." });
    }

    await prisma.userData.delete({ where: { id } });

    return res.status(200).json({ message: "Item deleted successfully." });
  } catch (err) {
    next(err);
  }
}

function parseJsonSafe(str) {
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}
