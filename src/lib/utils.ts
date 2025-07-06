import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { zone201SeatData } from "@/data/zone-201-seats"
import { zone202SeatData } from "@/data/zone-202-seats"
import { zone203SeatData } from "@/data/zone-203-seats"
import { zone204SeatData } from "@/data/zone-204-seats"
import { zone205SeatData } from "@/data/zone-205-seats"
import { zone206SeatData } from "@/data/zone-206-seats"
import { zone207SeatData } from "@/data/zone-207-seats"
import { zone208SeatData } from "@/data/zone-208-seats"
import { zone209SeatData } from "@/data/zone-209-seats"
import { zone210SeatData } from "@/data/zone-210-seats" 
import { zone211SeatData } from "@/data/zone-211-seats"
import { zone212SeatData } from "@/data/zone-212-seats"
import { zone213SeatData } from "@/data/zone-213-seats"


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Global seat lookup for all zones
export const seatLookup = [
  ...zone201SeatData,
  ...zone202SeatData,
  ...zone203SeatData,
  ...zone204SeatData,
  ...zone205SeatData,
  ...zone206SeatData,
  ...zone207SeatData,
  ...zone208SeatData,
  ...zone209SeatData,
  ...zone210SeatData,
  ...zone211SeatData,
  ...zone212SeatData,
  ...zone213SeatData,
].reduce(
  (lookup, seat) => {
    lookup[seat.id] = { row: seat.row, number: seat.number }
    return lookup
  },
  {} as Record<string, { row: string; number: string }>,
) 