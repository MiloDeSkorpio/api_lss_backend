export function validateHeaders(headers: string[], reqHeaders: string[]) {
  if (headers.length !== reqHeaders.length) {
    throw new Error(
      `El archivo debe tener ${reqHeaders.length} columnas. Recibidas: ${headers.length}`
    )
  }

  const missingHeaders = reqHeaders.filter(
    reqHeader => !headers.includes(reqHeader)
  )

  if (missingHeaders.length > 0) {
    throw new Error(
      `Headers faltantes o incorrectos: ${missingHeaders.join(', ')}`
    )
  }
}