import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  const teknisiPassword = await bcrypt.hash("teknisi123", 10);
  const dosenPassword = await bcrypt.hash("dosen123", 10);
  const mahasiswaPassword = await bcrypt.hash("mahasiswa123", 10);

  console.log("🌱 Seeding database...");

  // =========================
  // Users
  // =========================

  const teknisi = await prisma.user.create({
    data: {
      identity_number: "NIP001",
      name: "Teknisi JT",
      email: "teknisi@test",
      password_hash: teknisiPassword,
      role: "TEKNISI",
    },
  });

  const dosen = await prisma.user.create({
    data: {
      identity_number: "NIDN001",
      name: "Dosen JT",
      email: "dosen@test",
      password_hash: dosenPassword,
      role: "DOSEN",
    },
  });

  const mahasiswa = await prisma.user.create({
    data: {
      identity_number: "NIM001",
      name: "Mahasiswa JT",
      email: "mahasiswa@test",
      password_hash: mahasiswaPassword,
      role: "MAHASISWA",
    },
  });

  // =========================
  // Categories
  // =========================

  const elektronik = await prisma.category.create({
    data: {
      name: "Elektronik",
      description: "Peralatan elektronik.",
    },
  });

  const komputer = await prisma.category.create({
    data: {
      name: "Komputer",
      description: "Peralatan komputer dan pendukungnya.",
    },
  });

  const laboratorium = await prisma.category.create({
    data: {
      name: "Peralatan Laboratorium",
      description: "Peralatan yang digunakan untuk kegiatan laboratorium.",
    },
  });

  // =========================
  // Items
  // =========================

  await prisma.item.createMany({
    data: [
      {
        category_id: elektronik.id,
        maintainer_id: teknisi.id,
        code: "ELK-001",
        name: "Proyektor Epson",
        description: "Proyektor untuk kegiatan perkuliahan.",
        quantity: 3,
        available_quantity: 3,
        condition: "GOOD",
        is_active: true,
      },
      {
        category_id: komputer.id,
        maintainer_id: teknisi.id,
        code: "KOM-001",
        name: "Laptop Lenovo",
        description: "Laptop untuk kegiatan praktikum.",
        quantity: 10,
        available_quantity: 10,
        condition: "GOOD",
        is_active: true,
      },
      {
        category_id: komputer.id,
        maintainer_id: teknisi.id,
        code: "KOM-002",
        name: "Monitor Dell",
        description: "Monitor komputer.",
        quantity: 5,
        available_quantity: 5,
        condition: "GOOD",
        is_active: true,
      },
      {
        category_id: laboratorium.id,
        maintainer_id: teknisi.id,
        code: "LAB-001",
        name: "Multimeter",
        description: "Multimeter untuk kegiatan praktikum.",
        quantity: 8,
        available_quantity: 8,
        condition: "GOOD",
        is_active: true,
      },
    ],
  });

  console.log("✅ Seeding completed.");
  console.log(`Technician: ${teknisi.email}`);
  console.log(`Lecturer: ${dosen.email}`);
  console.log(`Student: ${mahasiswa.email}`);
}

main()
  .catch((error) => {
    console.error("❌ Seeding failed:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });