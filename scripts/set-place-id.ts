// scripts/set-place-id.ts
import { prisma } from "../lib/db"

async function main() {
  // Example: Update Baker Street property with a real Google Place ID
  // You should replace this with a real place_id from Google Places API
  await prisma.property.update({
    where: { slug: "baker-street-apartment-12b" },
    data: { 
      googlePlaceId: "ChIJdd4hrwug2EcRmSrV3Vo6llI" // Example place ID - replace with real one
    }
  })
  
  console.log("Updated Baker Street property with Google Place ID")
  
  // List all properties to see their current state
  const properties = await prisma.property.findMany({
    select: {
      name: true,
      slug: true,
      googlePlaceId: true
    }
  })
  
  console.log("\nAll properties:")
  properties.forEach(p => {
    console.log(`- ${p.name} (${p.slug}): ${p.googlePlaceId || 'No Place ID'}`)
  })
}

main().then(() => process.exit(0)).catch(console.error)