import { PrismaClient } from "@prisma/client"
import { execSync } from "child_process"

async function testConnection(url: string) {
  process.env.DATABASE_URL = url
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: url,
      },
    },
  })
  try {
    const result = await prisma.intern.count()
    console.log(`URL: ${url} | SUCCESS | Count: ${result}`)
  } catch (error: any) {
    console.log(`URL: ${url} | FAIL | Error: ${error.message.split("\n")[0]}`)
  } finally {
    await prisma.$disconnect()
  }
}

async function run() {
  console.log(`Current Working Directory: ${process.cwd()}`)
  const absolutePath = "file:" + process.cwd().replace(/\\/g, "/") + "/prisma/dev.db"
  
  await testConnection("file:./prisma/dev.db")
  await testConnection("file:../prisma/dev.db")
  await testConnection(absolutePath)
}

run()
