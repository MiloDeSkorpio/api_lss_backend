/**
 * Parses a date string in DD/MM/YYYY format into a JavaScript Date object.
 * @param dateString The date string to parse.
 * @returns A Date object, or throws an error if the format is invalid.
 */
export const parseDDMMYYYY = (dateString: string): Date => {
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
        throw new Error(`Invalid date format: "${dateString}". Expected DD/MM/YYYY.`)
    }

    const parts = dateString.split('/')
    const day = Number.parseInt(parts[0], 10)
    const month = Number.parseInt(parts[1], 10) - 1 // Month is 0-indexed in JS Date
    const year = Number.parseInt(parts[2], 10)

    const date = new Date(year, month, day)

    // Final check to ensure date is valid (e.g., handles "31/02/2023")
    if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
        throw new Error(`Invalid date values in: "${dateString}"`)
    }

    return date
}
