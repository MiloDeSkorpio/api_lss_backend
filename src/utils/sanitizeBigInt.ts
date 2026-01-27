export const sanitizeBigInt = (data: any[]) =>
      data.map(row =>
        JSON.parse(
          JSON.stringify(row, (_, value) =>
            typeof value === 'bigint' ? value.toString() : value
          )
        )
      )